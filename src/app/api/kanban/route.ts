import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import KanbanTask from '@/models/KanbanTask';

export async function GET() {
  try {
    await connectToDatabase();
    const tasks = await KanbanTask.find({}).sort({ createdAt: -1 }).lean();
    const formatted = tasks.map(({ _id, __v, ...rest }: any) => ({ ...rest, id: _id.toString() }));
    return NextResponse.json({ success: true, tasks: formatted });
  } catch (err) {
    console.error('GET /api/kanban error:', err);
    return NextResponse.json({ success: false, tasks: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const task = await KanbanTask.create(body);
    const { _id, __v, ...rest } = task.toObject();
    return NextResponse.json({ success: true, task: { ...rest, id: _id.toString() } }, { status: 201 });
  } catch (err) {
    console.error('POST /api/kanban error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
