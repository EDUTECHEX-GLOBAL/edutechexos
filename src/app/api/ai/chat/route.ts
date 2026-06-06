import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

function getModel() {
  if (process.env.GEMINI_API_KEY) return google('gemini-2.5-flash');
  if (process.env.OPENAI_API_KEY) return openai('gpt-4o-mini');
  return null;
}

export async function POST(req: Request) {
  const { messages, channelName, channelTranscript, accessibleChannels } = await req.json();

  const model = getModel();
  if (!model) {
    return new Response(JSON.stringify({ error: 'No AI API key configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const channelList = (accessibleChannels || []).map((c: string) => `#${c}`).join(', ') || `#${channelName}`;

  const result = streamText({
    model,
    system: `You are the EduTechExOS Copilot — an AI assistant embedded in a team collaboration platform for EdTech professionals. You are scoped to #${channelName || 'general'}. The user can access: ${channelList}. Be helpful, direct, and professional. Use markdown for formatting when helpful.`,
    messages: [
      ...(channelTranscript
        ? [{ role: 'system' as const, content: `Current channel transcript:\n${channelTranscript}` }]
        : []),
      ...messages,
    ],
    maxOutputTokens: 1000,
  });

  return result.toTextStreamResponse();
}
