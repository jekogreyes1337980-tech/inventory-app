const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large JSON payloads

// Serve static files from the project root
app.use(express.static(__dirname));

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
        )
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
        res.json({ success: true });
    } catch (err) {
        console.error('Error resetting data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
