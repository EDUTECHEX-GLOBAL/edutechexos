const mongoose = require('mongoose');

const AdminAvailabilitySchema = new mongoose.Schema({
  date:       { type: String, required: true, index: true },
  adminEmail: { type: String, required: true, default: 'admin@edutechex.in' },
  slots: [{
    time:   { type: String, required: true },
    status: { type: String, enum: ['available', 'busy', 'ooo'], default: 'available' },
    label:  { type: String, default: '' },
  }],
}, { timestamps: true });
AdminAvailabilitySchema.index({ date: 1, adminEmail: 1 }, { unique: true });

const AdminAvailability = mongoose.model('AdminAvailability', AdminAvailabilitySchema);
module.exports = AdminAvailability;
