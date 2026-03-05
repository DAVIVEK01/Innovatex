// ============================================================
//  CampusEats — server.js
//  Main entry point: Express + Socket.io + static serving
// ============================================================

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const jwt        = require('jsonwebtoken');

const authRoutes  = require('./routes/auth');
const menuRoutes  = require('./routes/menu');
const orderRoutes = require('./routes/orders');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] },
});

const PORT   = process.env.PORT   || 3000;
const SECRET = process.env.JWT_SECRET || 'fallback_dev_secret';

// ── Security & Middleware ─────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.socket.io'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
      fontSrc:     ["'self'", 'fonts.gstatic.com'],
      connectSrc:  ["'self'", 'ws:', 'wss:'],
      imgSrc:      ["'self'", 'data:'],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting on API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,  // stricter on login
  message: { error: 'Too many login attempts. Please wait.' },
});

// ── Inject Socket.io into request ─────────────────────────
app.use((req, _res, next) => { req.io = io; next(); });

// ── Static files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',   loginLimiter, authRoutes);
app.use('/api/menu',   apiLimiter,   menuRoutes);
app.use('/api/orders', apiLimiter,   orderRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'CampusEats', time: new Date().toISOString() });
});

// Catch-all: serve index.html for SPA-style navigation (optional)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Socket.io ─────────────────────────────────────────────
io.use((socket, next) => {
  // Authenticate socket connection via JWT in handshake
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No auth token'));
  try {
    socket.user = jwt.verify(token, SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.user?.name} (${socket.user?.type}) — ${socket.id}`);

  // Staff join their own room so we can target them specifically if needed
  if (socket.user?.type === 'canteen') {
    socket.join('staff');
    console.log(`[Socket] Staff "${socket.user.name}" joined staff room`);
  }

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.user?.name}`);
  });
});

// ── Start Server ──────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       CampusEats Server Running      ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  URL:  http://localhost:${PORT}          ║`);
  console.log(`║  Env:  ${(process.env.NODE_ENV || 'development').padEnd(30)}║`);
  console.log('╚══════════════════════════════════════╝\n');
  console.log('  Tip: Run "node server/seed.js" first if starting fresh.\n');
});
