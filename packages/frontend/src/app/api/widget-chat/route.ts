import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || ''
);

const SYSTEM = `You are EduTechExOS Copilot — a friendly, sharp AI assistant embedded as a chat widget on websites.
You help with:
- Questions about the EduTechExOS workspace platform (channels, Kanban, Wiki, AI Copilot, Calendar, Figma viewer, analytics)
- Team productivity, project management, and collaboration advice
- General questions from website visitors
Keep answers concise (2–4 sentences) and conversational unless the user asks for detail.
Format lists with plain dashes, not markdown bullets. Never use headers.`;

export async function POST(req: NextRequest) {
  try {
    const { question, history = [] } = (await req.json()) as {
      question: string;
      history: Array<{ role: string; text: string }>;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        answer:
          "Hi! I'm EduTechExOS Copilot. I can answer questions about the platform and your team workflow. (Add a GEMINI_API_KEY to your environment to enable full AI responses.)",
      });
    }

    const contents = [
      ...history.map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text: question }] },
    ];

    let lastErr: unknown;
    for (let i = 0; i < MODEL_PRIORITY.length; i++) {
      try {
        const model = genAI.getGenerativeModel({
          model: MODEL_PRIORITY[i],
          systemInstruction: SYSTEM,
        });
        const result = await model.generateContent({
          contents,
          generationConfig: { maxOutputTokens: 500 },
        });
        const answer = result.response.text();
        return NextResponse.json({ answer });
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        if (status !== 503) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 400));
      }
    }
    throw lastErr;
  } catch (err) {
    console.error('[widget-chat]', err);
    return NextResponse.json(
      { error: 'AI service temporarily unavailable. Please try again in a moment.' },
      { status: 500 }
    );
  }
}
