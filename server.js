const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large JSON payloads

// In-memory data store
const db = new Map();

// Serve static files from the project root
app.use(express.static(__dirname));

// API Endpoints
// Get data by key
app.get('/api/data/:key', (req, res) => {
    const key = req.params.key;
    const data = db.get(key);
    // return null if not found, as per original localStorage logic
    res.json(data !== undefined ? data : null);
});

// Set data by key
app.post('/api/data/:key', (req, res) => {
    const key = req.params.key;
    const value = req.body;
    db.set(key, value);
    res.json({ success: true });
});

// Reset entire database
app.post('/api/reset', (req, res) => {
    db.clear();
    res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
