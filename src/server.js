require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./auth');
const { authenticateToken, authenticateSocket } = require('./middleware');
const { registerSocketHandlers } = require('./socket');
const { messageQueries } = require('./db');

const path = require('path');
const app = express();

// --- HTTP Server ---
// We wrap Express in a raw http.Server so Socket.io can share the same port.
// Socket.io cannot attach directly to an Express app — it needs the http.Server.
const server = http.createServer(app);

// --- Socket.io Server ---
const io = new Server(server, {
  cors: {
    origin: '*', // tighten this in production
    methods: ['GET', 'POST'],
  },
});

// --- Express Middleware ---
app.use(express.json()); // parse JSON request bodies
app.use(express.static(path.join(__dirname, '../public'))); // serve frontend

// Simple request logger — good example of custom middleware for interviews
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// --- Routes ---

// Public: auth (register + login)
app.use('/auth', authRoutes);

// Protected: message history for a room
// authenticateToken runs first — if it fails, the route handler never runs
app.get('/rooms/:room/history', authenticateToken, (req, res) => {
  try {
    const { room } = req.params;
    const messages = messageQueries.getByRoom.all(room).reverse();
    res.json({ room, messages });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: 'Could not fetch history' });
  }
});

// Health check — useful for uptime monitors and load balancers
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- 404 Handler ---
// Must be placed after all routes — catches anything that didn't match
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// --- Global Error Handler ---
// Express error middleware has 4 args: (err, req, res, next)
// The 4-argument signature is how Express identifies it as an error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// --- Socket.io Middleware + Handlers ---
io.use(authenticateSocket); // authenticate every socket connection
registerSocketHandlers(io); // attach all event listeners

// --- Start Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ================================
   Chat App running on port ${PORT}
  ================================
   HTTP endpoints:
     POST /auth/register
     POST /auth/login
     GET  /rooms/:room/history  (auth required)
     GET  /health

   WebSocket:
     ws://localhost:${PORT}  (JWT required)
  `);
});
