// backend/server.js
// Main entry point for the Express server

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());                          // Allow frontend requests
app.use(express.json());                  // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/fitness', require('./routes/fitness'));
app.use('/api/chat', require('./routes/chat'));
// ── Serve Frontend Pages ───────────────────────────────────────
app.get('/',           (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/index.html')));
app.get('/dashboard',  (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html')));
app.get('/input',      (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/input.html')));

// ── 404 Handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

// ── Start Server ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏋️  AI Fitness Tracker running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
