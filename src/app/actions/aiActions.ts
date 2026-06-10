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
  try {
    const model = getPrimaryModel();
    if (!model) throw new Error('No AI API key configured.');
    if (!messages || messages.length === 0) return { success: true, data: [] };

    const transcript = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');

    const { object } = await generateObject({
      model,
      schema: z.object({
        tasks: z.array(
          z.object({
            text: z.string(),
            assignee: z.string(),
            assigneeInitials: z.string().max(2),
          })
        ),
      }),
      system: 'You are an AI task extraction agent. Extract only concrete actionable tasks.',
      prompt: `Read the following team conversation and identify actionable tasks. If none found, return empty array.\n\nTranscript:\n${transcript}`,
    });

    return { success: true, data: object.tasks };
  } catch (error) {
    console.error('Error extracting tasks:', error);
    return {
      success: false,
      error:
        'Failed to extract tasks. The AI service may be temporarily unavailable — please try again in a moment.',
    };
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
