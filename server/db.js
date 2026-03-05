// ============================================================
//  CampusEats — db.js
//  SQLite database setup using better-sqlite3
//  All tables, indexes, and helper functions live here.
// ============================================================

require('dotenv').config();
const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = path.resolve(__dirname, process.env.DB_PATH || './campuseats.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create Tables ──────────────────────────────────────────
db.exec(`

  /* Users table — students and canteen staff */
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    roll        TEXT    UNIQUE NOT NULL,
    name        TEXT    NOT NULL,
    email       TEXT,
    password    TEXT    NOT NULL,
    type        TEXT    NOT NULL DEFAULT 'student', -- 'student' | 'canteen'
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  /* Menu items */
  CREATE TABLE IF NOT EXISTS menu_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    emoji       TEXT    NOT NULL DEFAULT '🍽️',
    price       REAL    NOT NULL,
    prep_time   INTEGER NOT NULL DEFAULT 10,
    category    TEXT    NOT NULL,
    description TEXT,
    veg         INTEGER NOT NULL DEFAULT 1,  -- 1 = veg, 0 = non-veg
    available   INTEGER NOT NULL DEFAULT 1,  -- 1 = available, 0 = unavailable
    rating      REAL    NOT NULL DEFAULT 4.0,
    popular     INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  /* Orders */
  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token       INTEGER UNIQUE NOT NULL,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    student_name TEXT   NOT NULL,
    student_roll TEXT   NOT NULL,
    subtotal    REAL    NOT NULL,
    tax         REAL    NOT NULL,
    total       REAL    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'queued', -- queued | preparing | ready | pickedup
    pay_method  TEXT    NOT NULL DEFAULT 'cash',
    instructions TEXT   DEFAULT '',
    progress_pct REAL   NOT NULL DEFAULT 0,
    placed_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at  INTEGER,
    ready_at    INTEGER,
    picked_at   INTEGER,
    pickup_by   INTEGER  -- estimated pickup unix timestamp
  );

  /* Order Items (line items inside each order) */
  CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    emoji       TEXT    NOT NULL,
    price       REAL    NOT NULL,
    qty         INTEGER NOT NULL
  );

  /* Canteen settings (key-value store) */
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  /* Indexes */
  CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_user      ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_ord  ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_menu_category    ON menu_items(category);
`);

// ── Prepared Statements ────────────────────────────────────

const stmt = {
  // Users
  getUserByRoll:   db.prepare('SELECT * FROM users WHERE roll = ?'),
  getUserById:     db.prepare('SELECT * FROM users WHERE id = ?'),
  insertUser:      db.prepare('INSERT INTO users (roll, name, email, password, type) VALUES (?, ?, ?, ?, ?)'),

  // Menu
  getAllMenu:       db.prepare('SELECT * FROM menu_items ORDER BY category, sort_order, name'),
  getMenuByCategory: db.prepare('SELECT * FROM menu_items WHERE category = ? ORDER BY sort_order, name'),
  getMenuItemById: db.prepare('SELECT * FROM menu_items WHERE id = ?'),
  updateMenuAvailability: db.prepare('UPDATE menu_items SET available = ? WHERE id = ?'),
  updateMenuPrice: db.prepare('UPDATE menu_items SET price = ? WHERE id = ?'),
  insertMenuItem:  db.prepare(`
    INSERT INTO menu_items (name, emoji, price, prep_time, category, description, veg, available, rating, popular, sort_order)
    VALUES (@name, @emoji, @price, @prep_time, @category, @description, @veg, @available, @rating, @popular, @sort_order)
  `),
  updateMenuItem: db.prepare(`
    UPDATE menu_items SET name=@name, emoji=@emoji, price=@price, prep_time=@prep_time,
    category=@category, description=@description, veg=@veg, available=@available, rating=@rating, popular=@popular
    WHERE id=@id
  `),

  // Orders
  insertOrder: db.prepare(`
    INSERT INTO orders (token, user_id, student_name, student_roll, subtotal, tax, total, status, pay_method, instructions, placed_at, pickup_by)
    VALUES (@token, @user_id, @student_name, @student_roll, @subtotal, @tax, @total, 'queued', @pay_method, @instructions, unixepoch(), @pickup_by)
  `),
  insertOrderItem: db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, emoji, price, qty)
    VALUES (@order_id, @menu_item_id, @name, @emoji, @price, @qty)
  `),
  getOrderByToken: db.prepare(`
    SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.token = ?
  `),
  getOrderItems:   db.prepare('SELECT * FROM order_items WHERE order_id = ?'),
  getOrdersByUser: db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY placed_at DESC LIMIT 20'),
  getAllActiveOrders: db.prepare(`
    SELECT o.* FROM orders o WHERE o.status != 'pickedup' ORDER BY o.placed_at ASC
  `),
  getAllOrdersToday: db.prepare(`
    SELECT o.* FROM orders o
    WHERE date(o.placed_at, 'unixepoch', 'localtime') = date('now', 'localtime')
    ORDER BY o.placed_at DESC
  `),
  getLastOrder: db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY placed_at DESC LIMIT 1'),
  updateOrderStatus: db.prepare('UPDATE orders SET status = ?, started_at = ?, ready_at = ?, picked_at = ?, progress_pct = ? WHERE token = ?'),
  updateOrderProgress: db.prepare('UPDATE orders SET progress_pct = ? WHERE token = ?'),
  getQueueAhead:   db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status IN ('queued','preparing')"),
  getNextToken:    db.prepare("SELECT COALESCE(MAX(token),100) + 1 AS next FROM orders"),

  // Settings
  getSetting:    db.prepare('SELECT value FROM settings WHERE key = ?'),
  upsertSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
};

// ── Helper: fetch order with items ────────────────────────
function getFullOrder(token) {
  const order = stmt.getOrderByToken.get(token);
  if (!order) return null;
  order.items = stmt.getOrderItems.all(order.id);
  order.placed_at_iso  = new Date(order.placed_at  * 1000).toISOString();
  order.pickup_by_iso  = order.pickup_by ? new Date(order.pickup_by * 1000).toISOString() : null;
  return order;
}

function getFullOrders(orders) {
  return orders.map(o => {
    o.items = stmt.getOrderItems.all(o.id);
    o.placed_at_iso = new Date(o.placed_at * 1000).toISOString();
    o.pickup_by_iso = o.pickup_by ? new Date(o.pickup_by * 1000).toISOString() : null;
    return o;
  });
}

module.exports = { db, stmt, getFullOrder, getFullOrders };
