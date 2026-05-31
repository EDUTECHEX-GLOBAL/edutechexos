import mongoose, { Schema, Document } from 'mongoose';

export interface IKanbanTask extends Document {
  text: string;
  assignee: string;
  assigneeInitials: string;
  assigneeEmail?: string;
  sourceChannel: string;
  status: 'todo' | 'in-progress' | 'done';
  createdAt: Date;
}

const KanbanTaskSchema: Schema = new Schema(
  {
    text:              { type: String, required: true },
    assignee:          { type: String, required: true },
    assigneeInitials:  { type: String, required: true },
    assigneeEmail:     { type: String },
    sourceChannel:     { type: String, required: true },
    status:            { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const KanbanTask =
  mongoose.models.KanbanTask ||
  mongoose.model<IKanbanTask>('KanbanTask', KanbanTaskSchema);

export default KanbanTask;
