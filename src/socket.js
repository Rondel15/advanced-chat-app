const { messageQueries } = require('./db');

/**
 * Registers all Socket.io event handlers on the server instance.
 *
 * Key concepts:
 * - socket     = one connected client
 * - io         = the whole server (can broadcast to everyone)
 * - room       = a named channel; clients join/leave freely
 * - io.to(room).emit()   = broadcast to everyone in the room
 * - socket.to(room).emit() = broadcast to room EXCEPT the sender
 */
function registerSocketHandlers(io) {

  io.on('connection', (socket) => {
    const username = socket.user.username; // set by authenticateSocket middleware
    console.log(`[Socket] ${username} connected (${socket.id})`);

    // --- Join Room ---
    // Client emits: { room: 'general' }
    socket.on('join_room', ({ room }) => {
      if (!room) return;

      socket.join(room);
      console.log(`[Socket] ${username} joined room: ${room}`);

      // Notify everyone else in the room
      socket.to(room).emit('user_joined', {
        username,
        message: `${username} joined the room`,
        timestamp: new Date().toISOString(),
      });

      // Send last 50 messages from DB to the joining user only
      try {
        const history = messageQueries.getByRoom.all(room).reverse();
        socket.emit('message_history', history);
      } catch (err) {
        console.error('[Socket] Failed to load history:', err);
      }
    });

    // --- Send Message ---
    // Client emits: { room: 'general', content: 'Hello!' }
    socket.on('send_message', ({ room, content }) => {
      if (!room || !content?.trim()) return;

      const messageData = {
        username,
        content: content.trim(),
        room,
        created_at: new Date().toISOString(),
      };

      // Persist to DB first — if this fails, we don't broadcast
      try {
        messageQueries.save.run(room, username, content.trim());
      } catch (err) {
        console.error('[Socket] Failed to save message:', err);
        socket.emit('error_message', { error: 'Failed to send message' });
        return;
      }

      // Broadcast to everyone in the room INCLUDING the sender
      io.to(room).emit('new_message', messageData);
    });

    // --- Leave Room ---
    socket.on('leave_room', ({ room }) => {
      if (!room) return;

      socket.leave(room);
      socket.to(room).emit('user_left', {
        username,
        message: `${username} left the room`,
        timestamp: new Date().toISOString(),
      });

      console.log(`[Socket] ${username} left room: ${room}`);
    });

    // --- Typing Indicator ---
    // Client emits: { room: 'general', isTyping: true/false }
    socket.on('typing', ({ room, isTyping }) => {
      // Broadcast to room EXCEPT sender so they don't see their own indicator
      socket.to(room).emit('user_typing', { username, isTyping });
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      console.log(`[Socket] ${username} disconnected`);
    });
  });
}

module.exports = { registerSocketHandlers };
