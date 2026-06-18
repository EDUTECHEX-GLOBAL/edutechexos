const mongoose = require('mongoose');

const KanbanTaskSchema = new mongoose.Schema(
  {
    text:             { type: String, required: true },
    assignee:         { type: String, required: true },
    assigneeEmail:    { type: String, index: true },
    assigneeInitials: { type: String, required: true },
    sourceChannel:    { type: String, required: true },
    status:           { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
    createdAt:        { type: Date, default: Date.now },
  },
  { strict: false }
);
KanbanTaskSchema.index({ text: 'text', assignee: 'text' });

const KanbanTask = mongoose.model('KanbanTask', KanbanTaskSchema);
module.exports = KanbanTask;
