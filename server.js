const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const isProduction = fs.existsSync(path.join(__dirname, 'client', 'dist'));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large JSON payloads

// In production, serve the built React app
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
}

let db;

// Initialize database
async function initDb() {
    db = await open({
        filename: './data.db',
        driver: sqlite3.Database
    });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS store (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        );
    `);
}

// API Endpoints
// Get data by key
app.get('/api/data/:key', async (req, res) => {
    try {
        const key = req.params.key;
        const row = await db.get('SELECT value FROM store WHERE key = ?', key);
        if (row) {
            res.json(JSON.parse(row.value));
        } else {
            res.json(null);
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Set data by key
app.post('/api/data/:key', async (req, res) => {
    try {
        const key = req.params.key;
        const value = JSON.stringify(req.body);
        
        // Upsert logic
        await db.run(`
            INSERT INTO store (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `, key, value);
        
        io.emit('data_updated', key); // Broadcast real-time update
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Reset entire database
app.post('/api/reset', async (req, res) => {
    try {
        await db.run('DELETE FROM store');
        io.emit('data_reset'); // Broadcast reset
        res.json({ success: true });
    } catch (err) {
        console.error('Error resetting data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Authentication Endpoints ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
        res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        // Exclude password from the returned object
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Verify a stored session — checks that the user still exists in the database
app.post('/api/verify', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ valid: false, error: 'Username required' });
        }
        const user = await db.get('SELECT id, username, role FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.json({ valid: false });
        }
        res.json({ valid: true, user });
    } catch (err) {
        console.error('Error verifying session:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Session Lock Endpoints (one writer at a time) ---
// In-memory lock: { username, acquiredAt, socketId }
let activeLock = null;
const LOCK_TTL_MS = 30000; // 30 seconds

function isLockExpired() {
  return activeLock && (Date.now() - activeLock.acquiredAt > LOCK_TTL_MS);
}

// Socket.io Connection Logic
io.on('connection', (socket) => {
  // If the user with the lock disconnects, release it instantly
  socket.on('disconnect', () => {
    if (activeLock && activeLock.socketId === socket.id) {
      activeLock = null;
      io.emit('lock_updated', { locked: false });
    }
  });
});

// Acquire lock
app.post('/api/lock', (req, res) => {
  const { username, socketId } = req.body;
  if (!username) return res.status(400).json({ success: false, error: 'Username required' });

  if (activeLock && !isLockExpired() && activeLock.username !== username) {
    return res.json({
      success: false,
      lockedBy: activeLock.username,
      since: activeLock.acquiredAt,
    });
  }

  activeLock = { username, acquiredAt: Date.now(), socketId };
  io.emit('lock_updated', { locked: true, lockedBy: username, since: activeLock.acquiredAt });
  res.json({ success: true });
});

// Renew / heartbeat (keep lock alive)
app.post('/api/lock/renew', (req, res) => {
  const { username, socketId } = req.body;
  if (activeLock && activeLock.username === username) {
    activeLock.acquiredAt = Date.now();
    // Update socketId in case they reconnected on a new tab
    if (socketId) activeLock.socketId = socketId;
    return res.json({ success: true });
  }
  res.json({ success: false });
});

// Release lock
app.post('/api/lock/release', (req, res) => {
  const { username } = req.body;
  if (activeLock && activeLock.username === username) {
    activeLock = null;
    io.emit('lock_updated', { locked: false });
  }
  res.json({ success: true });
});

// Lock status
app.get('/api/lock/status', (req, res) => {
  if (!activeLock || isLockExpired()) {
    activeLock = null;
    return res.json({ locked: false });
  }
  res.json({ locked: true, lockedBy: activeLock.username, since: activeLock.acquiredAt });
});

// --- Admin User Management Endpoints ---
async function requireAdmin(req, res, next) {
  try {
    const username = req.headers['x-user-username'];
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    const user = await db.get('SELECT role FROM users WHERE username = ?', [username]);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// List all users (no passwords exposed)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.all('SELECT id, username, role FROM users ORDER BY username');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new user (admin-only)
app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
    const user = await db.get('SELECT id, username, role FROM users WHERE username = ?', [username]);
    res.json({ success: true, user });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update user (username, password, role)
app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    const existing = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (username) {
      const dup = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
      if (dup) return res.status(400).json({ error: 'Username already taken' });
    }

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await db.run('UPDATE users SET username = COALESCE(?, username), password = ?, role = COALESCE(?, role) WHERE id = ?',
        [username || null, hashed, role || null, id]);
    } else {
      await db.run('UPDATE users SET username = COALESCE(?, username), role = COALESCE(?, role) WHERE id = ?',
        [username || null, role || null, id]);
    }

    const updated = await db.get('SELECT id, username, role FROM users WHERE id = ?', [id]);
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete user
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: `User "${existing.username}" deleted` });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// SPA catch-all: serve client index.html for non-API routes in production
if (isProduction) {
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/assets/')) {
            return res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
        }
        next();
    });
}

// Start the server
initDb().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        if (isProduction) console.log('Serving React production build from client/dist');
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
