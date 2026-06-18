const mongoose = require('mongoose');

const MeetingRequestSchema = new mongoose.Schema({
  userEmail:  { type: String, required: true },
  userName:   { type: String, required: true },
  adminEmail: { type: String, required: true, default: 'admin@edutechex.in' },
  date:       { type: String, required: true },
  time:       { type: String, required: true },
  purpose:    { type: String, default: '' },
  status:     { type: String, enum: ['pending', 'confirmed', 'declined'], default: 'pending' },
}, { timestamps: true });

const MeetingRequest = mongoose.model('MeetingRequest', MeetingRequestSchema);
module.exports = MeetingRequest;
