import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import KanbanTask from '@/models/KanbanTask';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const updated = await KanbanTask.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const { _id, __v, ...rest } = updated as any;
    return NextResponse.json({ success: true, task: { ...rest, id: _id.toString() } });
  } catch (err) {
    console.error('PATCH /api/kanban/[id] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    await KanbanTask.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/kanban/[id] error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
