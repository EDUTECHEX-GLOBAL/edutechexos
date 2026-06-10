/* src/app/actions/wikiActions.ts */
'use server';

import connectToDatabase from '@/lib/mongoose';
import WikiPage from '@/models/WikiPage';

async function ensureDb() {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Wiki action DB connection error:', err);
  }
}

export async function getWikiPagesAction() {
  try {
    await ensureDb();
    const pages = await WikiPage.find({}).sort({ updatedAt: -1 }).lean();
    return pages.map((p: any) => {
      return {
        id: p._id,
        channelId: p.channelId,
        title: p.title,
        content: p.content,
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('Failed to get wiki pages from MongoDB:', err);
    return [];
  }
}

export async function saveWikiPageAction(
  channelId: string,
  page: { id: string; title: string; content: string }
) {
  try {
    await ensureDb();
    const updated = await WikiPage.findOneAndUpdate(
      { _id: page.id },
      {
        channelId,
        title: page.title,
        content: page.content,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    const { _id, ...rest } = updated as any;
    return {
      success: true,
      page: {
        ...rest,
        id: _id,
        createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('Failed to save wiki page to MongoDB:', err);
    return { success: false, error: String(err) };
  }
}

export async function deleteWikiPageAction(pageId: string) {
  try {
    await ensureDb();
    await WikiPage.findByIdAndDelete(pageId);
    return { success: true };
  } catch (err) {
    console.error('Failed to delete wiki page from MongoDB:', err);
    return { success: false, error: String(err) };
  }
}
