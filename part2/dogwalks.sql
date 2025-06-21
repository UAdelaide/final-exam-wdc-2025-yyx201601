DROP DATABASE IF EXISTS DogWalkService;

CREATE DATABASE DogWalkService;
USE DogWalkService;

CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'walker') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE Users AUTO_INCREMENT = 1;

CREATE TABLE Dogs (
    dog_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    size ENUM('small', 'medium', 'large') NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id)
);
ALTER TABLE Dogs AUTO_INCREMENT = 1;

CREATE TABLE WalkRequests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    dog_id INT NOT NULL,
    requested_time DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    location VARCHAR(255) NOT NULL,
    status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
);
ALTER TABLE WalkRequests AUTO_INCREMENT = 1;

CREATE TABLE WalkApplications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    walker_id INT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('open', 'accepted', 'rejected') DEFAULT 'open',
    FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
    FOREIGN KEY (walker_id) REFERENCES Users(user_id),
    CONSTRAINT unique_application UNIQUE (request_id, walker_id)
);
ALTER TABLE WalkApplications AUTO_INCREMENT = 1;

CREATE TABLE WalkRatings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    walker_id INT NOT NULL,
    owner_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
    FOREIGN KEY (walker_id) REFERENCES Users(user_id),
    FOREIGN KEY (owner_id) REFERENCES Users(user_id),
    CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
);
ALTER TABLE WalkRatings AUTO_INCREMENT = 1;

INSERT INTO Users (username, email, password_hash, role, created_at) VALUES
('ownerJane', 'jane@example.com', 'hashedpassword123', 'owner', '2025-06-06 01:32:58'),
('walkerMike', 'mike@example.com', 'hashedpassword456', 'walker', '2025-06-06 01:32:58'),
('ownerBob', 'bob@example.com', 'hashedpassword789', 'owner', '2025-06-06 01:34:32'),

INSERT INTO Dogs (owner_id, name, size) VALUES
((SELECT user_id FROM Users WHERE username = 'ownerJane'), 'Buddy', 'medium'),
((SELECT user_id FROM Users WHERE username = 'ownerJane'), 'Lucy', 'small'),
((SELECT user_id FROM Users WHERE username = 'ownerBob'), 'Rocky', 'large'),
((SELECT user_id FROM Users WHERE username = 'ownerBob'), 'Daisy', 'medium'),
((SELECT user_id FROM Users WHERE username = 'ownerBob'), 'Milo', 'small');

