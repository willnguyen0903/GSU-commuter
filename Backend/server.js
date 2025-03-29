require("dotenv").config({ path: "./key.env" });
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MARTA_API_KEY = process.env.MARTA_API_KEY;

// PostgreSQL connection setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend/UI/train-schedule.html")));

// Serve HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/UI/train-schedule.html"));
});

// --- Function to Fetch from MARTA and Store in DB ---
const fetchAndStoreSchedule = async () => {
    try {
      const response = await axios.get('https://developerservices.itsmarta.com:18096/itsmarta/railrealtimearrivals/developerservices/traindata?apiKey=d2e9a11f-b4bb-438a-a5e8-3daecc709ad6');
      const trains = response.data;

      if (!Array.isArray(trains)) {
        throw new Error('Unexpected MARTA API response format');
      }

      // Clear old data
      await pool.query('DELETE FROM train_schedule');

      for (const train of trains) {
        await pool.query(
          `INSERT INTO train_schedule (
            destination,
            station,
            direction,
            waiting_time,
            line,
            event_time,
            next_arr
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            train.DESTINATION || null,
            train.STATION || null,
            train.DIRECTION || null,
            train.WAITING_TIME || null,
            train.LINE || null,
            train.EVENT_TIME || null,
            train.NEXT_ARR || null
          ]
        );
      }

      console.log(`✅ Inserted ${trains.length} train rows into the database.`);
    } catch (error) {
      console.error('❌ Error fetching/storing MARTA data:', error.message);
    }
  };

// Run immediately and on a timer
fetchAndStoreSchedule();
setInterval(fetchAndStoreSchedule, 2 * 60 * 1000); // every 2 min


// --- Serve Train Data from DB ---
app.get('/api/schedule', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM train_schedule ORDER BY event_time DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error('Error serving schedule from DB:', err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Delete rows older than 2 hours
const cleanOldData = async () => {
    try {
      const result = await pool.query(`
        DELETE FROM train_schedule
        WHERE event_time::timestamp < NOW() - INTERVAL '20 minutes'
      `);
      console.log(`🧹 Cleaned old rows from train_schedule`);
    } catch (err) {
      console.error('❌ Error during DB cleanup:', err);
    }
  };

// Schedule cleanup every 60 minutes
setInterval(cleanOldData, 60 * 60 * 1000);

// User Registration (Uses `username`, `password`)
app.post("/register", async (req, res) => {
  const {username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing fields" });

  try {
      const password_hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
          "INSERT INTO commuter (username, password_hash) VALUES ($1, $2) RETURNING uid",
          [username, password_hash]
      );
      res.status(201).json({ message: "User registered", uid: result.rows[0].uid });
  } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Error registering user" });
  }
});

// User Login (Finds user by `username` and checks `password_hash`)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
  }

  try {
      const result = await pool.query("SELECT * FROM commuter WHERE username = $1", [username]);

      if (result.rows.length === 0) {
          return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
          return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT Token
      const token = jwt.sign({ userId: user.uid }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN
      });

      res.json({ message: "Login successful!", token });
  } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Database error" });
  }
});

// JWT Middleware for Protected Routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ message: "Access denied. No token provided." });
  }
  const token = authHeader.split(' ')[1];

  try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // `req.user.uid` now exists
      next();
  } catch (error) {
      res.status(401).json({ message: "Invalid token." });
  }
};

// Protected Profile Route (Fetches user by `uid`)
app.get('/profile', authenticateToken, async (req, res) => {
  try {
      const result = await pool.query("SELECT uid, username FROM commuter WHERE uid = $1", [req.user.uid]);
      if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });

      res.json(result.rows[0]);
  } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ message: "Error fetching profile" });
  }
});