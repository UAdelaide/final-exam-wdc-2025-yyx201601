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

router.get('/', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.execute(
            'SELECT dog_id, owner_id, name, size FROM Dogs ORDER BY dog_id'
        );

        await connection.end();

        res.json(rows);

    } catch (error) {
        console.error('Error fetching dogs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;