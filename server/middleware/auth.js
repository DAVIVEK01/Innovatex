// ============================================================
//  CampusEats — middleware/auth.js
//  JWT verification middleware
// ============================================================

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'fallback_dev_secret_change_in_prod';

/**
 * requireAuth — any logged-in user (student or staff)
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
  }
}

/**
 * requireStaff — only canteen staff allowed
 */
function requireStaff(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.type !== 'canteen') {
      return res.status(403).json({ error: 'Access denied. Staff only.' });
    }
    next();
  });
}

/**
 * requireStudent — only students allowed
 */
function requireStudent(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.type !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireStaff, requireStudent };
