const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'DogWalkService'
};

// Login endpoint
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Simple password check - in production, use proper password hashing
        const [rows] = await connection.execute(
            'SELECT user_id, username, role FROM Users WHERE username = ? AND password_hash = ?',
            [username, password]
        );

        await connection.end();

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = rows[0];
        req.session.user = {
            id: user.user_id,
            username: user.username,
            role: user.role
        };

        res.json({
            message: 'Login successful',
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Check session endpoint
router.get('/session', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

module.exports = router;