const mongoose = require('mongoose');

const AWActivitySchema = new mongoose.Schema({
  email:              { type: String, required: true, index: true },
  name:               { type: String, default: '' },
  dateStr:            { type: String, required: true, index: true },
  currentApp:         { type: String, default: '' },
  currentTitle:       { type: String, default: '' },
  isAfk:              { type: Boolean, default: false },
  totalActiveMinutes: { type: Number, default: 0 },
  totalAfkMinutes:    { type: Number, default: 0 },
  appBreakdown:       [{ app: String, minutes: Number }],
  lastSync:           { type: Date, default: Date.now },
}, { timestamps: true });
AWActivitySchema.index({ email: 1, dateStr: 1 }, { unique: true });

const AWActivity = mongoose.model('AWActivity', AWActivitySchema);
module.exports = AWActivity;
