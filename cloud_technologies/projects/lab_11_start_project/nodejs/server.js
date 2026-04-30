const express = require('express');
const pool = require("./db");
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <h1>🌩️ Cloud Lab 06 — Docker</h1>
    <p>Hostname: ${require('os').hostname()}</p>
    <p>Version: ${process.env.APP_VERSION || '1.0.0'}</p>
  `);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get("/students", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/students", express.json(), async (req, res) => {
  const { name, email, group_name } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO students (name, email, group_name) VALUES ($1, $2, $3) RETURNING *",
      [name, email, group_name],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
