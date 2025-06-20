const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 8080;

app.use(express.json());

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'cptbtptp233',
  database: 'DogWalkService'
};

let db;


async function initializeDatabase() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL database');
    
    await insertTestData();
    console.log('Test data inserted successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

// Insert test data function
async function insertTestData() {
  try {
    // Clear existing data
    await db.execute('DELETE FROM WalkRatings');
    await db.execute('DELETE FROM WalkApplications');
    await db.execute('DELETE FROM WalkRequests');
    await db.execute('DELETE FROM Dogs');
    await db.execute('DELETE FROM Users');
    

    await db.execute('ALTER TABLE Users AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE Dogs AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE WalkRequests AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE WalkApplications AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE WalkRatings AUTO_INCREMENT = 1');

    // Insert User
    await db.execute(`
      INSERT INTO Users (username, email, password_hash, role, created_at) VALUES
      ('alice123', 'alice@example.com', 'hashed123', 'owner', NOW()),
      ('bobwalker', 'bob@example.com', 'hashed456', 'walker', NOW()),
      ('carol123', 'carol@example.com', 'hashed789', 'owner', NOW()),
      ('mikewalks', 'mike@example.com', 'hashed101', 'walker', NOW()),
      ('sarah_owner', 'sarah@example.com', 'hashed202', 'owner', NOW())
    `);

    // Insert Dog
    await db.execute(`
      INSERT INTO Dogs (owner_id, name, size) VALUES
      ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
      ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
      ((SELECT user_id FROM Users WHERE username = 'sarah_owner'), 'Charlie', 'large'),
      ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Luna', 'small'),
      ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Rocky', 'medium')
    `);

    // Insert Walk Request
    await db.execute(`
      INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status, created_at) VALUES
      ((SELECT dog_id FROM Dogs WHERE name = 'Max' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')), 
       '2025-06-10 08:00:00', 30, 'Parklands', 'open', NOW()),
      ((SELECT dog_id FROM Dogs WHERE name = 'Bella' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')), 
       '2025-06-10 09:30:00', 45, 'Beachside Ave', 'completed', NOW()),
      ((SELECT dog_id FROM Dogs WHERE name = 'Charlie' AND owner_id = (SELECT user_id FROM Users WHERE username = 'sarah_owner')), 
       '2025-06-11 15:00:00', 60, 'Central Park', 'open', NOW()),
      ((SELECT dog_id FROM Dogs WHERE name = 'Luna' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')), 
       '2025-06-12 07:30:00', 30, 'Riverside Trail', 'completed', NOW()),
      ((SELECT dog_id FROM Dogs WHERE name = 'Rocky' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')), 
       '2025-06-13 16:00:00', 45, 'Downtown Square', 'open', NOW())
    `);

    // Insert Walk Application
    await db.execute(`
      INSERT INTO WalkApplications (request_id, walker_id, applied_at, status) VALUES
      ((SELECT request_id FROM WalkRequests wr 
        JOIN Dogs d ON wr.dog_id = d.dog_id 
        WHERE d.name = 'Bella' AND wr.requested_time = '2025-06-10 09:30:00'), 
       (SELECT user_id FROM Users WHERE username = 'bobwalker'), 
       NOW(), 'accepted'),
      ((SELECT request_id FROM WalkRequests wr 
        JOIN Dogs d ON wr.dog_id = d.dog_id 
        WHERE d.name = 'Luna' AND wr.requested_time = '2025-06-12 07:30:00'), 
       (SELECT user_id FROM Users WHERE username = 'mikewalks'), 
       NOW(), 'accepted'),
      ((SELECT request_id FROM WalkRequests wr 
        JOIN Dogs d ON wr.dog_id = d.dog_id 
        WHERE d.name = 'Max' AND wr.requested_time = '2025-06-10 08:00:00'), 
       (SELECT user_id FROM Users WHERE username = 'bobwalker'), 
       NOW(), 'pending')
    `);

    // Insert Walk Rating
    await db.execute(`
      INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments, rated_at) VALUES
      ((SELECT request_id FROM WalkRequests wr 
        JOIN Dogs d ON wr.dog_id = d.dog_id 
        WHERE d.name = 'Bella' AND wr.requested_time = '2025-06-10 09:30:00'), 
       (SELECT user_id FROM Users WHERE username = 'bobwalker'),
       (SELECT user_id FROM Users WHERE username = 'carol123'),
       4, 'Good walk, Bella enjoyed it.', NOW()),
      ((SELECT request_id FROM WalkRequests wr 
        JOIN Dogs d ON wr.dog_id = d.dog_id 
        WHERE d.name = 'Luna' AND wr.requested_time = '2025-06-12 07:30:00'), 
       (SELECT user_id FROM Users WHERE username = 'mikewalks'),
       (SELECT user_id FROM Users WHERE username = 'alice123'),
       5, 'Excellent walker! Luna came back happy and well-exercised.', NOW())
    `);

  } catch (error) {
    console.error('Error inserting test data:', error);
    throw error;
  }
}

// API Routes

app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        d.name as dog_name,
        d.size,
        u.username as owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
      ORDER BY d.name
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});


app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        wr.request_id,
        d.name as dog_name,
        wr.requested_time,
        wr.duration_minutes,
        wr.location,
        u.username as owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching open walk requests:', error);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});


app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        u.username as walker_username,
        COALESCE(COUNT(wr.rating_id), 0) as total_ratings,
        CASE 
          WHEN COUNT(wr.rating_id) > 0 THEN ROUND(AVG(wr.rating), 1)
          ELSE NULL 
        END as average_rating,
        COALESCE(completed_walks.walk_count, 0) as completed_walks
      FROM Users u
      LEFT JOIN WalkRatings wr ON u.user_id = wr.walker_id
      LEFT JOIN (
        SELECT 
          wa.walker_id,
          COUNT(*) as walk_count
        FROM WalkApplications wa
        JOIN WalkRequests wreq ON wa.request_id = wreq.request_id
        WHERE wa.status = 'accepted' AND wreq.status = 'completed'
        GROUP BY wa.walker_id
      ) completed_walks ON u.user_id = completed_walks.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id, u.username, completed_walks.walk_count
      ORDER BY u.username
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching walker summary:', error);
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log(`  GET http://localhost:${PORT}/api/dogs`);
    console.log(`  GET http://localhost:${PORT}/api/walkrequests/open`);
    console.log(`  GET http://localhost:${PORT}/api/walkers/summary`);
  });
}

startServer().catch(console.error);