const { getUserEmail } = require('../utils/helpers');
const KanbanTask = require('../models/KanbanTask');

async function getTasks(req, res) {
  try {
    const requestingUser = getUserEmail(req);
    const filter = requestingUser
      ? { $or: [{ assigneeEmail: requestingUser }, { assigneeEmail: { $exists: false } }, { assigneeEmail: null }] }
      : {};
    const tasks = await KanbanTask.find(filter).sort({ createdAt: 1 }).lean();
    const formatted = tasks.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
      createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
    }));
    res.json({ success: true, tasks: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function createTask(req, res) {
  try {
    const userEmail = getUserEmail(req);
    const body = { ...req.body };
    if (userEmail && !body.assigneeEmail) {
      body.assigneeEmail = userEmail;
    }
    const task = new KanbanTask(body);
    const saved = await task.save();
    const { _id, __v, ...rest } = saved.toObject();
    res.json({
      success: true,
      task: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, status, assigneeEmail, dueDate, priority, tags, completedAt } = req.body;
    const updates = {};
    if (title         !== undefined) updates.title         = title;
    if (description   !== undefined) updates.description   = description;
    if (status        !== undefined) updates.status        = status;
    if (assigneeEmail !== undefined) updates.assigneeEmail = assigneeEmail;
    if (dueDate       !== undefined) updates.dueDate       = dueDate;
    if (priority      !== undefined) updates.priority      = priority;
    if (tags          !== undefined) updates.tags          = tags;
    if (completedAt   !== undefined) updates.completedAt   = completedAt;
    const updated = await KanbanTask.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Task not found' });
    const { _id, __v, ...rest } = updated;
    res.json({
      success: true,
      task: {
        ...rest,
        id: _id.toString(),
        createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    await KanbanTask.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { getTasks, createTask, updateTask, deleteTask };
