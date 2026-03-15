// ============================================================
//  CampusEats — routes/menu.js
//  GET    /api/menu            — get all menu items
//  PATCH  /api/menu/:id        — update item (staff)
//  PATCH  /api/menu/:id/toggle — toggle availability (staff)
//  GET    /api/menu/settings   — get canteen settings
//  PATCH  /api/menu/settings   — update settings (staff)
// ============================================================

const express = require('express');
const { stmt } = require('../db');
const { requireAuth, requireStaff } = require('../middleware/auth');

const router = express.Router();
const SETTINGS_KEYS = ['canteen_open', 'college_name', 'canteen_name', 'pickup_counter', 'todays_special'];

function readSettings(keys = SETTINGS_KEYS) {
  const settings = {};
  for (const key of keys) {
    const row = stmt.getSetting.get(key);
    settings[key] = row ? row.value : null;
  }
  return settings;
}

/* ── GET /api/menu ── */
router.get('/', requireAuth, (_req, res) => {
  const items = stmt.getAllMenu.all();
  return res.json({ items });
});

/* ── GET /api/menu/settings ── */
router.get('/settings', requireAuth, (_req, res) => {
  return res.json({ settings: readSettings() });
});

/* ── PATCH /api/menu/settings ── update canteen settings (staff) ── */
router.patch('/settings', requireStaff, (req, res) => {
  for (const key of SETTINGS_KEYS) {
    if (req.body[key] !== undefined) {
      stmt.upsertSetting.run(key, String(req.body[key]));
    }
  }

  const settings = readSettings();

  // Broadcast settings change to all connected clients.
  req.io.emit('settings:updated', settings);

  return res.json({ settings });
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

module.exports = router;
