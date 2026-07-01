'use server';

import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

type ChatMessage = { sender: string; text: string; timestamp: string };

function getPrimaryModel() {
  if (process.env.GEMINI_API_KEY) return google('gemini-2.5-flash');
  if (process.env.OPENAI_API_KEY) return openai('gpt-4o-mini');
  return null;
}

function getFallbackModel() {
  if (process.env.GEMINI_API_KEY) return google('gemini-1.5-flash');
  if (process.env.OPENAI_API_KEY) return openai('gpt-3.5-turbo');
  return null;
}

export async function summarizeChannelChat(messages: ChatMessage[]) {
  try {
    const model = getPrimaryModel();
    if (!model) throw new Error('No AI API key configured.');
    if (!messages || messages.length === 0)
      return { success: false, message: 'No messages to summarize yet.' };

    const transcript = messages
      .map((m) => `[${new Date(m.timestamp).toISOString()}] ${m.sender}: ${m.text}`)
      .join('\n');

    const { text } = await generateText({
      model,
      system:
        'You are an elite project management assistant for EduTechExOS. Be concise and professional.',
      prompt: `Analyze the following team chat transcript and provide a concise 3-bullet-point executive summary. Focus on decisions made, progress updates, and blockers.\n\nTranscript:\n${transcript}`,
      maxOutputTokens: 400,
    });

    return { success: true, data: text };
  } catch (error) {
    console.error('Error summarizing chat:', error);
    const fallback = getFallbackModel();
    if (fallback) {
      try {
        const transcript = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');
        const { text } = await generateText({
          model: fallback,
          system:
            'You are an elite project management assistant for EduTechExOS. Be concise and professional.',
          prompt: `Summarize this chat in 3 bullet points:\n\n${transcript}`,
          maxOutputTokens: 400,
        });
        return { success: true, data: text };
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError);
      }
    }
    return {
      success: false,
      error:
        'Failed to generate summary. The AI service may be temporarily unavailable — please try again in a moment.',
    };
  }
}

export async function extractActionItems(messages: ChatMessage[]) {
  if (!messages || messages.length === 0) return { success: true, data: [] };
  const transcript = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');
  const systemPrompt = 'You are an AI task extraction agent. Extract only concrete actionable tasks.';
  const userPrompt = `Read the following team conversation and identify actionable tasks with who they are assigned to.\nReturn ONLY a JSON array (no markdown, no explanation) in this exact format:\n[{"text":"task description","assignee":"Person Name","assigneeInitials":"PN"}]\nIf none found return: []\n\nTranscript:\n${transcript}`;

  // Try generateObject first (works well with OpenAI; Gemini may not support it)
  const primary = getPrimaryModel();
  if (primary) {
    try {
      const { object } = await generateObject({
        model: primary,
        schema: z.object({
          tasks: z.array(
            z.object({
              text: z.string(),
              assignee: z.string(),
              assigneeInitials: z.string().max(2),
            })
          ),
        }),
        system: systemPrompt,
        prompt: `Read the following team conversation and identify actionable tasks. If none found, return empty array.\n\nTranscript:\n${transcript}`,
      });
      return { success: true, data: object.tasks };
    } catch {
      // Gemini or other model doesn't support generateObject — fall through
    }
  }

  // Fallback: generateText + manual JSON parse (works with all models including Gemini)
  const fallback = primary ?? getFallbackModel();
  if (!fallback) return { success: false, error: 'No AI API key configured.' };
  try {
    const { text } = await generateText({
      model: fallback,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 800,
    });
    const clean = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    // Extract JSON — handle plain array OR object wrapper like {"tasks":[...]}
    let jsonStr = clean;
    const arrStart = clean.indexOf('[');
    const objStart = clean.indexOf('{');
    if (arrStart >= 0 && (objStart < 0 || arrStart <= objStart)) {
      const arrEnd = clean.lastIndexOf(']');
      jsonStr = arrEnd > arrStart ? clean.slice(arrStart, arrEnd + 1) : clean.slice(arrStart);
    } else if (objStart >= 0) {
      const objEnd = clean.lastIndexOf('}');
      jsonStr = objEnd > objStart ? clean.slice(objStart, objEnd + 1) : clean.slice(objStart);
    }
    const raw = JSON.parse(jsonStr);
    const parsed = Array.isArray(raw) ? raw : (Array.isArray(raw?.tasks) ? raw.tasks : []);
    if (!Array.isArray(parsed)) return { success: true, data: [] };
    const tasks = parsed
      .map((t: { text?: string; assignee?: string; assigneeInitials?: string }) => ({
        text: t.text ?? '',
        assignee: t.assignee ?? 'Unassigned',
        assigneeInitials:
          t.assigneeInitials ??
          (t.assignee ?? 'UN').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      }))
      .filter((t: { text: string }) => t.text);
    return { success: true, data: tasks };
  } catch (error) {
    console.error('Error extracting tasks:', error);
    return { success: false, error: 'Failed to extract tasks. Please try again in a moment.' };
  }
}

export async function askCopilot(
  messages: ChatMessage[],
  question: string,
  channelName = 'current channel',
  accessibleChannels: string[] = []
) {
  try {
    const model = getPrimaryModel();
    if (!model) {
      const recent = (messages || []).slice(-5).reverse();
      const context = recent.length
        ? recent.map((m) => `${m.sender}: ${m.text}`).join('\n')
        : 'No recent messages yet.';
      return {
        success: true,
        data: `Channel Copilot is scoped to #${channelName}.\n\nRecent activity:\n${context}\n\nAdd a GEMINI_API_KEY or OPENAI_API_KEY to .env to enable full AI responses.`,
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

    const { text } = await generateText({
      model,
      system: `You are the EduTechExOS Copilot. You are scoped to #${channelName}. The user can access: ${channelList}. Be helpful, direct, and professional.`,
      prompt: `Channel transcript:\n${transcript}\n\nQuestion: ${question}`,
      maxOutputTokens: 800,
    });

    return { success: true, data: text };
  } catch (error) {
    console.error('Error asking copilot:', error);
    return {
      success: false,
      error: 'The AI service is temporarily unavailable. Please try again in a moment.',
    };
  }
}
