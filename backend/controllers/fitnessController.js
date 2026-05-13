// backend/controllers/fitnessController.js
// Core AI controller — calls Python ML model and saves results

const { spawn }      = require('child_process');
const path           = require('path');
const FitnessEntry   = require('../models/FitnessEntry');

// Helper: run Python prediction script
const runPythonModel = (inputData) => {
  return new Promise((resolve, reject) => {
    // Path to Python script
    const scriptPath = path.join(__dirname, '../../ml-model/predict.py');

    // Spawn Python process, pass JSON as argument
    const py = spawn('python', [scriptPath, JSON.stringify(inputData)]);

    let output = '';
    let errorOutput = '';

    // Collect stdout (the prediction JSON)
    py.stdout.on('data', (data) => { output += data.toString(); });

    // Collect stderr (Python errors or warnings)
    py.stderr.on('data', (data) => { errorOutput += data.toString(); });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python error: ${errorOutput}`));
      }
      try {
        resolve(JSON.parse(output.trim()));
      } catch (e) {
        reject(new Error('Failed to parse Python output'));
      }
    });
  });
};

// @desc    Run AI prediction and save entry
// @route   POST /api/fitness/predict
// @access  Private
exports.predict = async (req, res) => {
  try {
    const { age, gender, height, weight, activityLevel, goal, targetWeight } = req.body;

    // Validate inputs
    if (!age || !height || !weight || activityLevel === undefined || goal === undefined) {
      return res.status(400).json({ success: false, message: 'Please fill all fitness fields' });
    }

    // Run Python ML models
    const predictions = await runPythonModel({
      age, gender, height, weight,
      activity: activityLevel,
      goal,
      targetWeight: targetWeight || weight
    });

    if (predictions.error) {
      return res.status(500).json({ success: false, message: predictions.error });
    }

    // Save entry to MongoDB
    const entry = await FitnessEntry.create({
      user: req.user._id,
      age, gender, height, weight, activityLevel, goal, targetWeight,
      ...predictions
    });

    res.status(201).json({ success: true, data: entry });

  } catch (err) {
    console.error('Prediction error:', err.message);
    res.status(500).json({ success: false, message: 'Prediction failed. Is the ML model trained?' });
  }
};

// @desc    Get all fitness entries for logged-in user
// @route   GET /api/fitness/history
// @access  Private
exports.getHistory = async (req, res) => {
  try {
    const entries = await FitnessEntry
      .find({ user: req.user._id })
      .sort({ createdAt: -1 })  // Most recent first
      .limit(20);               // Max 20 entries

    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single latest fitness entry
// @route   GET /api/fitness/latest
// @access  Private
exports.getLatest = async (req, res) => {
  try {
    const entry = await FitnessEntry
      .findOne({ user: req.user._id })
      .sort({ createdAt: -1 });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'No fitness data found' });
    }

    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
