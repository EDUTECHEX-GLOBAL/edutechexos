const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  email:         { type: String, required: true, index: true },
  name:          { type: String, required: true },
  type:          { type: String, enum: ['instant', 'planned'], required: true },
  leaveCategory: { type: String, enum: ['sick', 'vacation', 'personal', 'emergency', 'other'], default: 'other' },
  startDate:     { type: String, required: true },
  endDate:       { type: String, default: '' },
  duration:      { type: String, enum: ['half', 'full'], default: 'full' },
  reason:        { type: String, required: true },
  status:        { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:     { type: String, default: '' },
  requestedAt:   { type: Date, default: Date.now },
});

const Leave = mongoose.model('Leave', LeaveSchema);
module.exports = Leave;
