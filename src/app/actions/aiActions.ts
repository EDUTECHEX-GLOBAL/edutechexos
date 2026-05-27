'use server';

import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

type ChatMessage = { sender: string; text: string; timestamp: string };

export async function summarizeChannelChat(messages: ChatMessage[]) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }
    if (!messages || messages.length === 0) {
      return { success: false, message: 'No messages to summarize yet.' };
    }

    const transcript = messages
      .map((m) => `[${new Date(m.timestamp).toISOString()}] ${m.sender}: ${m.text}`)
      .join('\n');

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an elite project management assistant for EduTechExOS. Be concise and professional.',
        },
        {
          role: 'user',
          content: `Analyze the following team chat transcript and provide a concise 3-bullet-point executive summary. Focus on decisions made, progress updates, and blockers.\n\nTranscript:\n${transcript}`,
        },
      ],
      max_tokens: 400,
    });

    return { success: true, data: response.choices[0]?.message?.content ?? '' };
  } catch (error) {
    console.error('Error summarizing chat:', error);
    return { success: false, error: 'Failed to generate summary' };
  }
}

export async function extractActionItems(messages: ChatMessage[]) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }
    if (!messages || messages.length === 0) {
      return { success: true, data: [] };
    }

    const transcript = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI task extraction agent. Output ONLY a raw JSON array — no markdown fences, no extra text.',
        },
        {
          role: 'user',
          content: `Read the following team conversation and identify actionable tasks. For each task output an object with "text", "assignee", and "assigneeInitials". If none found, return [].\n\nTranscript:\n${transcript}`,
        },
      ],
      max_tokens: 600,
    });

    let jsonString = (response.choices[0]?.message?.content ?? '').trim();
    jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { success: true, data: [] };

    return { success: true, data: JSON.parse(jsonMatch[0]) };
  } catch (error) {
    console.error('Error extracting tasks:', error);
    return { success: false, error: 'Failed to extract tasks' };
  }
}

export async function askCopilot(
  messages: ChatMessage[],
  question: string,
  channelName = 'current channel',
  accessibleChannels: string[] = []
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      const recent = (messages || []).slice(-5).reverse();
      const context = recent.length
        ? recent.map((m) => `${m.sender}: ${m.text}`).join('\n')
        : 'No recent messages yet.';
      return {
        success: true,
        data: `Channel Copilot is scoped to #${channelName}.\n\nRecent activity:\n${context}\n\nAdd an OPENAI_API_KEY to .env to enable full AI responses.`,
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

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are the EduTechExOS Copilot. You are scoped to #${channelName}. The user can access: ${channelList}. Be helpful, direct, and professional.`,
        },
        {
          role: 'user',
          content: `Channel transcript:\n${transcript}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: 800,
    });

    return { success: true, data: response.choices[0]?.message?.content ?? '' };
  } catch (error) {
    console.error('Error asking copilot:', error);
    return { success: false, error: 'Failed to get answer from Copilot' };
  }
}
