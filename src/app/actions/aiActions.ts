'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Model priority list: try primary first, fall back if overloaded
const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

type ChatMessage = { sender: string; text: string; timestamp: string };

/**
 * Retries an async function with exponential backoff on 503 errors.
 * Falls back through MODEL_PRIORITY list if the primary model is overloaded.
 */
async function generateWithRetry(
  getModelName: (attempt: number) => string,
  buildRequest: (model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>) => Parameters<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['generateContent']>[0],
  systemInstruction: string,
  maxRetries = MODEL_PRIORITY.length
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const modelName = getModelName(attempt);
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

    try {
      const response = await model.generateContent(buildRequest(model));
      return response.response.text() ?? '';
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const isOverloaded = status === 503 || (err instanceof Error && err.message.includes('503'));

      if (!isOverloaded) throw err; // Non-503 errors are not retried

      const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s…
      console.warn(`[Copilot] Model ${modelName} returned 503. Retrying with next model in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw lastError;
}

export async function summarizeChannelChat(messages: ChatMessage[]) {
  try {
    const activeKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!activeKey) throw new Error('Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured.');
    if (!messages || messages.length === 0) return { success: false, message: 'No messages to summarize yet.' };

    const transcript = messages
      .map((m) => `[${new Date(m.timestamp).toISOString()}] ${m.sender}: ${m.text}`)
      .join('\n');

    const text = await generateWithRetry(
      (attempt) => MODEL_PRIORITY[attempt] ?? MODEL_PRIORITY[MODEL_PRIORITY.length - 1],
      () => ({
        contents: [{ role: 'user', parts: [{ text: `Analyze the following team chat transcript and provide a concise 3-bullet-point executive summary. Focus on decisions made, progress updates, and blockers.\n\nTranscript:\n${transcript}` }] }],
        generationConfig: { maxOutputTokens: 400 },
      }),
      'You are an elite project management assistant for EduTechExOS. Be concise and professional.'
    );

    return { success: true, data: text };
  } catch (error) {
    console.error('Error summarizing chat:', error);
    return { success: false, error: 'Failed to generate summary. The AI service may be temporarily unavailable — please try again in a moment.' };
  }
}

export async function extractActionItems(messages: ChatMessage[]) {
  try {
    const activeKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!activeKey) throw new Error('Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured.');
    if (!messages || messages.length === 0) return { success: true, data: [] };

    const transcript = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');

    const text = await generateWithRetry(
      (attempt) => MODEL_PRIORITY[attempt] ?? MODEL_PRIORITY[MODEL_PRIORITY.length - 1],
      () => ({
        contents: [{ role: 'user', parts: [{ text: `Read the following team conversation and identify actionable tasks. For each task output an object with "text", "assignee", and "assigneeInitials". If none found, return [].\n\nTranscript:\n${transcript}` }] }],
        generationConfig: { maxOutputTokens: 600, responseMimeType: 'application/json' },
      }),
      'You are an AI task extraction agent. Output ONLY a raw JSON array — no markdown fences, no extra text.'
    );

    const jsonMatch = text.trim().match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { success: true, data: [] };

    return { success: true, data: JSON.parse(jsonMatch[0]) };
  } catch (error) {
    console.error('Error extracting tasks:', error);
    return { success: false, error: 'Failed to extract tasks. The AI service may be temporarily unavailable — please try again in a moment.' };
  }
}

export async function askCopilot(
  messages: ChatMessage[],
  question: string,
  channelName = 'current channel',
  accessibleChannels: string[] = []
) {
  try {
    const activeKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!activeKey) {
      const recent = (messages || []).slice(-5).reverse();
      const context = recent.length
        ? recent.map((m) => `${m.sender}: ${m.text}`).join('\n')
        : 'No recent messages yet.';
      return {
        success: true,
        data: `Channel Copilot is scoped to #${channelName}.\n\nRecent activity:\n${context}\n\nAdd a GEMINI_API_KEY to .env to enable full AI responses.`,
      };
    }

    const transcript =
      messages && messages.length > 0
        ? messages
            .map((m) => `[${new Date(m.timestamp).toISOString()}] ${m.sender}: ${m.text}`)
            .join('\n')
        : 'No previous messages in this channel.';

    const channelList = accessibleChannels.length
      ? accessibleChannels.map((c) => `#${c}`).join(', ')
      : `#${channelName}`;

    const text = await generateWithRetry(
      (attempt) => MODEL_PRIORITY[attempt] ?? MODEL_PRIORITY[MODEL_PRIORITY.length - 1],
      () => ({
        contents: [{ role: 'user', parts: [{ text: `Channel transcript:\n${transcript}\n\nQuestion: ${question}` }] }],
        generationConfig: { maxOutputTokens: 800 },
      }),
      `You are the EduTechExOS Copilot. You are scoped to #${channelName}. The user can access: ${channelList}. Be helpful, direct, and professional.`
    );

    return { success: true, data: text };
  } catch (error) {
    console.error('Error asking copilot:', error);
    return {
      success: false,
      error: 'The AI service is temporarily unavailable due to high demand. Please try again in a moment.',
    };
  }
}
