const jwt = require('jsonwebtoken');

/**
 * Express middleware that protects routes requiring authentication.
 *
 * How it works:
 * 1. Reads the Authorization header: "Bearer <token>"
 * 2. Verifies the token using JWT_SECRET
 * 3. Attaches the decoded payload to req.user
 * 4. Calls next() to proceed, or returns 401/403 on failure
 *
 * Interview tip: Middleware is just a function with (req, res, next).
 * Calling next() passes control to the next middleware or route handler.
 * Not calling next() ends the request-response cycle here.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Header format: "Bearer eyJhbGci..."
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // jwt.verify throws if the token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, iat, exp }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Socket.io middleware — same idea, but for WebSocket connections.
 * socket.handshake.auth.token is set by the client on connect.
 */
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // attach user to the socket instance
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
}

module.exports = { authenticateToken, authenticateSocket };
