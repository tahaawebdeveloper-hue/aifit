// backend/routes/fitness.js
const express = require('express');
const router  = express.Router();
const { predict, getHistory, getLatest } = require('../controllers/fitnessController');
const { protect } = require('../middleware/auth');

// All fitness routes require authentication
router.post('/predict',  protect, predict);
router.get('/history',   protect, getHistory);
router.get('/latest',    protect, getLatest);

module.exports = router;
