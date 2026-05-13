// backend/models/FitnessEntry.js
// Stores each fitness assessment + predictions for a user
// One user can have many entries (progress history)

const mongoose = require('mongoose');

const FitnessEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ── User inputs ──────────────────────────────────
  age:           { type: Number, required: true },
  gender:        { type: Number, required: true },    // 0=male, 1=female
  height:        { type: Number, required: true },    // cm
  weight:        { type: Number, required: true },    // kg
  activityLevel: { type: Number, required: true },    // 1,2,3
  goal:          { type: Number, required: true },    // 0=loss,1=gain,2=maintain
  targetWeight:  { type: Number },

  // ── ML Predictions ───────────────────────────────
  bmi:           { type: Number },
  bmiCategory:   { type: String },
  dailyCalories: { type: Number },
  weeksToGoal:   { type: Number },
  workoutType:   { type: String },
  workoutPlan:   [String],
  macros: {
    protein: Number,
    carbs:   Number,
    fats:    Number
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FitnessEntry', FitnessEntrySchema);
