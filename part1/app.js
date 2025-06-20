var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'cptbtptp233'
    });


    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    //connect
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'cptbtptp233',
      database: 'DogWalkService'
    });

    // Create tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        size ENUM('small', 'medium', 'large') NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRequests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT NOT NULL,
        requested_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkApplications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        UNIQUE KEY unique_application (request_id, walker_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRatings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        owner_id INT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comments TEXT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id),
        UNIQUE KEY unique_rating (request_id)
      )
    `);

    // Insert data if tables are empty
    const [userRows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (userRows[0].count === 0) {
      // Insert Users
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('mikewalks', 'mike@example.com', 'hashed101', 'walker'),
        ('sarah_owner', 'sarah@example.com', 'hashed202', 'owner')
      `);

      // Insert Dogs
      await db.execute(`
        INSERT INTO Dogs (owner_id, name, size) VALUES
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'sarah_owner'), 'Charlie', 'large'),
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Luna', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Rocky', 'medium')
      `);

      // Insert Walk Requests
      await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name = 'Max' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')), 
         '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Bella' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')), 
         '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Charlie' AND owner_id = (SELECT user_id FROM Users WHERE username = 'sarah_owner')), 
         '2025-06-11 15:00:00', 60, 'Central Park', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Luna' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')), 
         '2025-06-12 07:30:00', 30, 'Riverside Trail', 'completed'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Rocky' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')), 
         '2025-06-13 16:00:00', 45, 'Downtown Square', 'open')
      `);

      // Insert Walk Applications
      await db.execute(`
        INSERT INTO WalkApplications (request_id, walker_id, status) VALUES
        ((SELECT request_id FROM WalkRequests wr 
          JOIN Dogs d ON wr.dog_id = d.dog_id 
          WHERE d.name = 'Bella' AND wr.requested_time = '2025-06-10 09:30:00'), 
         (SELECT user_id FROM Users WHERE username = 'bobwalker'), 'accepted'),
        ((SELECT request_id FROM WalkRequests wr 
          JOIN Dogs d ON wr.dog_id = d.dog_id 
          WHERE d.name = 'Luna' AND wr.requested_time = '2025-06-12 07:30:00'), 
         (SELECT user_id FROM Users WHERE username = 'mikewalks'), 'accepted'),
        ((SELECT request_id FROM WalkRequests wr 
          JOIN Dogs d ON wr.dog_id = d.dog_id 
          WHERE d.name = 'Max' AND wr.requested_time = '2025-06-10 08:00:00'), 
         (SELECT user_id FROM Users WHERE username = 'bobwalker'), 'pending')
      `);

      // Insert Walk Ratings
      await db.execute(`
        INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
        ((SELECT request_id FROM WalkRequests wr 
          JOIN Dogs d ON wr.dog_id = d.dog_id 
          WHERE d.name = 'Luna' AND wr.requested_time = '2025-06-12 07:30:00'), 
         (SELECT user_id FROM Users WHERE username = 'mikewalks'),
         (SELECT user_id FROM Users WHERE username = 'alice123'),
         5, 'Excellent walker! Luna came back happy and well-exercised.')
      `);
    }

    console.log('Database setup completed successfully');
  } catch (err) {
    console.error('Error setting up database. Ensure MySQL is running: service mysql start', err);
  }
})();

//API Routes

app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
      ORDER BY d.name
    `);
    res.json(dogs);
  } catch (err) {
    console.error('Error fetching dogs:', err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// API Route: Get all open walk requests
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [requests] = await db.execute(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time, 
             wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time
    `);
    res.json(requests);
  } catch (err) {
    console.error('Error fetching open walk requests:', err);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkers] = await db.execute(`
      SELECT 
        u.username AS walker_username,
        COALESCE(ratings.total_ratings, 0) AS total_ratings,
        ratings.average_rating,
        COALESCE(completed.completed_walks, 0) AS completed_walks
      FROM Users u
      LEFT JOIN (
        SELECT 
          wr.walker_id,
          COUNT(*) AS total_ratings,
          ROUND(AVG(wr.rating), 1) AS average_rating
        FROM WalkRatings wr
        GROUP BY wr.walker_id
      ) ratings ON u.user_id = ratings.walker_id
      LEFT JOIN (
        SELECT 
          wa.walker_id,
          COUNT(*) AS completed_walks
        FROM WalkApplications wa
        JOIN WalkRequests req ON wa.request_id = req.request_id
        WHERE wa.status = 'accepted' AND req.status = 'completed'
        GROUP BY wa.walker_id
      ) completed ON u.user_id = completed.walker_id
      WHERE u.role = 'walker'
      ORDER BY u.username
    `);

    const formattedWalkers = walkers.map(walker => ({
      walker_username: walker.walker_username,
      total_ratings: parseInt(walker.total_ratings),
      average_rating: walker.average_rating || null,
      completed_walks: parseInt(walker.completed_walks)
    }));

    res.json(formattedWalkers);
  } catch (err) {
    console.error('Error fetching walker summary:', err);
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
