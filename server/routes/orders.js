// ============================================================
//  CampusEats — routes/orders.js
//  POST   /api/orders              — place new order (student)
//  GET    /api/orders              — all active orders (staff)
//  GET    /api/orders/today        — all today's orders (staff)
//  GET    /api/orders/my           — current user's recent orders (student)
//  GET    /api/orders/:token       — single order by token
//  PATCH  /api/orders/:token/status — update status (staff)
//  GET    /api/queue               — live queue info (any auth)
// ============================================================

const express = require('express');
const { db, stmt, getFullOrder, getFullOrders } = require('../db');
const { requireAuth, requireStaff, requireStudent } = require('../middleware/auth');

const router = express.Router();

/* ── GET /api/queue ── public queue summary ── */
router.get('/queue', requireAuth, (req, res) => {
  const active = getFullOrders(stmt.getAllActiveOrders.all());
  const { cnt } = stmt.getQueueAhead.get();
  return res.json({ queue: active, aheadCount: cnt });
});

/* ── GET /api/orders/my ── student's own orders ── */
router.get('/my', requireStudent, (req, res) => {
  const orders = getFullOrders(stmt.getOrdersByUser.all(req.user.id));
  return res.json({ orders });
});

/* ── GET /api/orders/today ── staff: all today's orders ── */
router.get('/today', requireStaff, (req, res) => {
  const orders = getFullOrders(stmt.getAllOrdersToday.all());
  return res.json({ orders });
});

/* ── GET /api/orders ── staff: all active orders ── */
router.get('/', requireStaff, (req, res) => {
  const active = getFullOrders(stmt.getAllActiveOrders.all());
  return res.json({ orders: active });
});

/* ── GET /api/orders/:token ── single order ── */
router.get('/:token', requireAuth, (req, res) => {
  const token = parseInt(req.params.token, 10);
  if (isNaN(token)) return res.status(400).json({ error: 'Invalid token.' });

  const order = getFullOrder(token);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Students can only see their own orders
  if (req.user.type === 'student' && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  return res.json({ order });
});

/* ── POST /api/orders ── place a new order ── */
router.post('/', requireStudent, (req, res) => {
  const row = stmt.getSetting.get('canteen_open');
  if (!row || row.value === '0') {
    return res.status(403).json({ error: 'Canteen is currently closed.' });
  }

  const { items, payMethod, instructions } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must have at least one item.' });
  }

  // Validate and price each item from the DB (never trust client-sent prices)
  let subtotal = 0;
  const validatedItems = [];

  for (const ci of items) {
    const menuItem = stmt.getMenuItemById.get(ci.id);
    if (!menuItem) return res.status(400).json({ error: `Item ID ${ci.id} not found.` });
    if (!menuItem.available) return res.status(400).json({ error: `"${menuItem.name}" is currently unavailable.` });
    const qty = parseInt(ci.qty, 10) || 1;
    subtotal += menuItem.price * qty;
    validatedItems.push({ ...menuItem, qty });
  }

  const tax      = Math.round(subtotal * (parseFloat(process.env.TAX_RATE) || 0.05) * 100) / 100;
  const total    = subtotal + tax;
  const { cnt }  = stmt.getQueueAhead.get();
  const maxPrep  = Math.max(...validatedItems.map(it => it.prep_time));
  const waitMin  = maxPrep + (cnt * 3);
  const pickupBy = Math.floor(Date.now() / 1000) + (waitMin * 60);
  const { next: token } = stmt.getNextToken.get();

  // Use a transaction so order + items are atomic
  const placeOrderTx = db.transaction(() => {
    const info = stmt.insertOrder.run({
      token, user_id: req.user.id,
      student_name: req.user.name,
      student_roll: req.user.roll,
      subtotal, tax, total,
      pay_method: payMethod || 'cash',
      instructions: instructions || '',
      pickup_by: pickupBy,
    });

    for (const item of validatedItems) {
      stmt.insertOrderItem.run({
        order_id:     info.lastInsertRowid,
        menu_item_id: item.id,
        name:  item.name,
        emoji: item.emoji,
        price: item.price,
        qty:   item.qty,
      });
    }

    return info.lastInsertRowid;
  });

  try {
    placeOrderTx();
    const order = getFullOrder(token);

    // Emit to all staff dashboards via Socket.io
    req.io.emit('order:new', { order });

    return res.status(201).json({ order, message: 'Order placed successfully!' });
  } catch (err) {
    console.error('Order placement error:', err);
    return res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
});

/* ── PATCH /api/orders/:token/status ── update order status (staff only) ── */
router.patch('/:token/status', requireStaff, (req, res) => {
  const token  = parseInt(req.params.token, 10);
  const { status } = req.body;
  const VALID = ['queued', 'preparing', 'ready', 'pickedup'];

  if (!VALID.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  const order = getFullOrder(token);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const now = Math.floor(Date.now() / 1000);
  stmt.updateOrderStatus.run(
    status,
    status === 'preparing' ? now : order.started_at,
    status === 'ready'     ? now : order.ready_at,
    status === 'pickedup'  ? now : order.picked_at,
    status === 'ready' || status === 'pickedup' ? 100 : order.progress_pct,
    token
  );

  const updated = getFullOrder(token);

  // Emit real-time update to all connected clients
  req.io.emit('order:updated', { order: updated });

  return res.json({ order: updated, message: `Order #${token} status updated to "${status}".` });
});

module.exports = router;
