const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "https://your-domain.com",
      process.env.FRONTEND_URL,
      /\.railway\.app$/,  // Allow Railway domains
      /\.vercel\.app$/    // Allow Vercel domains
    ].filter(Boolean), // Remove undefined values
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;
const DATABASE_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper functions
const readDatabase = () => {
  try {
    const data = fs.readFileSync(DATABASE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: {}, onlineStatus: {} };
  }
};

const writeDatabase = (data) => {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
  }
};

// Initialize database if it doesn't exist
if (!fs.existsSync(DATABASE_FILE)) {
  fs.writeFileSync(DATABASE_FILE, JSON.stringify({
    users: {},
    onlineStatus: {}
  }));
}

// Ensure database structure is correct
const initializeDatabase = () => {
  const db = readDatabase();
  if (!db.onlineStatus) {
    db.onlineStatus = {};
  }
  if (!db.users) {
    db.users = {};
  }
  writeDatabase(db);
};

// Initialize database structure
initializeDatabase();

// Store active connections
const activeConnections = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user login/status update
  socket.on('user-online', (data) => {
    const { userId, userData } = data;
    console.log(`User ${userId} is online`);
    
    // Store connection info
    activeConnections.set(socket.id, {
      userId,
      socket,
      lastSeen: Date.now()
    });

    // Update database
    const db = readDatabase();
    if (!db.onlineStatus) {
      db.onlineStatus = {};
    }
    db.onlineStatus[userId] = {
      isOnline: true,
      lastSeen: Date.now(),
      socketId: socket.id
    };
    writeDatabase(db);

    // Broadcast to all clients that this user is online
    socket.broadcast.emit('user-status-changed', {
      userId,
      isOnline: true,
      lastSeen: Date.now()
    });
  });

  // Handle user logout
  socket.on('user-offline', (data) => {
    const { userId } = data;
    console.log(`User ${userId} is offline`);
    
    // Remove from active connections
    activeConnections.delete(socket.id);

    // Update database
    const db = readDatabase();
    if (!db.onlineStatus) {
      db.onlineStatus = {};
    }
    if (db.onlineStatus[userId]) {
      db.onlineStatus[userId] = {
        isOnline: false,
        lastSeen: Date.now(),
        socketId: null
      };
      writeDatabase(db);
    }

    // Broadcast to all clients that this user is offline
    socket.broadcast.emit('user-status-changed', {
      userId,
      isOnline: false,
      lastSeen: Date.now()
    });
  });

  // Handle heartbeat/ping
  socket.on('ping', (data) => {
    const { userId } = data;
    const connection = activeConnections.get(socket.id);
    if (connection && connection.userId === userId) {
      connection.lastSeen = Date.now();
      
      // Update database
      const db = readDatabase();
      if (!db.onlineStatus) {
        db.onlineStatus = {};
      }
      if (db.onlineStatus[userId]) {
        db.onlineStatus[userId].lastSeen = Date.now();
        writeDatabase(db);
      }
    }
    
    // Send pong back
    socket.emit('pong', { timestamp: Date.now() });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const connection = activeConnections.get(socket.id);
    if (connection) {
      const { userId } = connection;
      
      // Remove from active connections
      activeConnections.delete(socket.id);

      // Update database
      const db = readDatabase();
      if (!db.onlineStatus) {
        db.onlineStatus = {};
      }
      if (db.onlineStatus[userId]) {
        db.onlineStatus[userId] = {
          isOnline: false,
          lastSeen: Date.now(),
          socketId: null
        };
        writeDatabase(db);
      }

      // Broadcast to all clients that this user is offline
      socket.broadcast.emit('user-status-changed', {
        userId,
        isOnline: false,
        lastSeen: Date.now()
      });
    }
  });
});

// API Routes
app.get('/api/status/:userId', (req, res) => {
  const { userId } = req.params;
  const db = readDatabase();
  const userStatus = db.onlineStatus[userId];
  
  if (!userStatus) {
    return res.json({ isOnline: false, lastSeen: null });
  }
  
  res.json({
    isOnline: userStatus.isOnline,
    lastSeen: userStatus.lastSeen
  });
});

app.get('/api/status', (req, res) => {
  const db = readDatabase();
  res.json(db.onlineStatus);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    activeConnections: activeConnections.size 
  });
});

// Cron job to check for inactive users every 30 seconds
cron.schedule('*/30 * * * * *', () => {
  console.log('Running status check...');
  
  const now = Date.now();
  const inactiveThreshold = 60000; // 60 seconds
  const db = readDatabase();
  let hasChanges = false;

  // Check all active connections
  for (const [socketId, connection] of activeConnections) {
    const timeSinceLastSeen = now - connection.lastSeen;
    
    if (timeSinceLastSeen > inactiveThreshold) {
      console.log(`User ${connection.userId} marked as inactive (${timeSinceLastSeen}ms since last seen)`);
      
      // Mark as offline in database
      if (!db.onlineStatus) {
        db.onlineStatus = {};
      }
      if (db.onlineStatus[connection.userId]) {
        db.onlineStatus[connection.userId] = {
          isOnline: false,
          lastSeen: connection.lastSeen,
          socketId: null
        };
        hasChanges = true;
      }

      // Remove from active connections
      activeConnections.delete(socketId);
      
      // Disconnect the socket
      connection.socket.disconnect();
    }
  }

  // Save changes if any
  if (hasChanges) {
    writeDatabase(db);
    
    // Broadcast status changes
    io.emit('status-update', {
      timestamp: now,
      onlineUsers: Object.keys(db.onlineStatus).filter(
        userId => db.onlineStatus[userId]?.isOnline
      )
    });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Status API: http://localhost:${PORT}/api/status`);
});
