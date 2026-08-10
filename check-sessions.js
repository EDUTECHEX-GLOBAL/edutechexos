const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://edutechexos121_db_user:Edutechexos_12@cluster0.fh6t6wn.mongodb.net/edutechexos?appName=Cluster0').then(async () => {
  const ActivitySession = require('./packages/backend/src/models/ActivitySession');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const sessions = await ActivitySession.find({ dateStr: { $in: [today, yesterday] } }).lean();
  sessions.forEach(s => console.log(s.dateStr, '|', s.email, '|', s.name, '|', s.totalMinutes + 'm'));
  mongoose.disconnect();
});
