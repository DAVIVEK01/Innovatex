// ============================================================
//  CampusEats — routes/menu.js
//  GET    /api/menu           — get all menu items
//  PATCH  /api/menu/:id       — update item (staff)
//  PATCH  /api/menu/:id/toggle — toggle availability (staff)
//  GET    /api/settings       — get canteen settings
//  PATCH  /api/settings       — update settings (staff)
// ============================================================

const express = require('express');
const { stmt } = require('../db');
const { requireAuth, requireStaff } = require('../middleware/auth');

const router = express.Router();

/* ── GET /api/menu ── */
router.get('/', requireAuth, (req, res) => {
  const items = stmt.getAllMenu.all();
  return res.json({ items });
});

/* ── PATCH /api/menu/:id ── update item details (staff) ── */
router.patch('/:id', requireStaff, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = stmt.getMenuItemById.get(id);
  if (!existing) return res.status(404).json({ error: 'Menu item not found.' });

  const updated = { ...existing, ...req.body, id };
  stmt.updateMenuItem.run(updated);

  const fresh = stmt.getMenuItemById.get(id);
  req.io.emit('menu:updated', { item: fresh });
  return res.json({ item: fresh });
});

/* ── PATCH /api/menu/:id/toggle ── toggle availability (staff) ── */
router.patch('/:id/toggle', requireStaff, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = stmt.getMenuItemById.get(id);
  if (!item) return res.status(404).json({ error: 'Menu item not found.' });

  const newAvail = item.available ? 0 : 1;
  stmt.updateMenuAvailability.run(newAvail, id);

  const fresh = stmt.getMenuItemById.get(id);
  req.io.emit('menu:updated', { item: fresh });
  return res.json({ item: fresh, message: `"${fresh.name}" is now ${newAvail ? 'available' : 'unavailable'}.` });
});

/* ── GET /api/settings ── */
router.get('/settings', requireAuth, (req, res) => {
  const keys = ['canteen_open', 'college_name', 'canteen_name', 'pickup_counter', 'todays_special'];
  const settings = {};
  for (const key of keys) {
    const row = stmt.getSetting.get(key);
    settings[key] = row ? row.value : null;
  }
  return res.json({ settings });
});

/* ── PATCH /api/settings ── update canteen settings (staff) ── */
router.patch('/settings', requireStaff, (req, res) => {
  const allowed = ['canteen_open', 'college_name', 'canteen_name', 'pickup_counter', 'todays_special'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      stmt.upsertSetting.run(key, String(req.body[key]));
    }
  }

  // Broadcast settings change
  req.io.emit('settings:updated', req.body);

  const settings = {};
  for (const key of allowed) {
    const row = stmt.getSetting.get(key);
    settings[key] = row ? row.value : null;
  }
  return res.json({ settings });
});

module.exports = router;
