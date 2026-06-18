// src/app/models/User.ts
import mongoose from 'mongoose';

// Ensure any previously compiled model is removed (useful during dev when schema changes)
if (mongoose.models && mongoose.models.User) {
  delete mongoose.models.User;
}

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  hashedPassword: { type: String, required: true },
  role: { type: String, enum: ['Developer', 'Designer', 'Manager', 'Other'], default: 'Developer' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
});

export default mongoose.model('User', UserSchema);
