const express = require('express');
const axios = require('axios');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// --- PostgreSQL Connection ---
const pool = new Pool({
    user: 'gsu_student',
    host: 'a.oregon-postgres.render.com',
    database: 'gsu_db',
    password: 'ZBf2N9n5pySMrNw13Yy8vnFQjVAucVqx',
    port: 5432,
    ssl: {
      rejectUnauthorized: false,
    },
  });

// --- Serve Static Frontend ---
app.use(express.static(path.join(__dirname, '../Frontend/UI')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/UI/index.html'));
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
