'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI SDK
// The API Key should be securely stored in .env as GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type ChatMessage = { sender: string; text: string; timestamp: string };

export async function summarizeChannelChat(messages: ChatMessage[]) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    if (!messages || messages.length === 0) {
      return { success: false, message: "No messages to summarize yet." };
    }

    // 1. Format messages into a readable transcript for the AI
    const transcript = messages.map((msg) => `[${new Date(msg.timestamp).toISOString()}] ${msg.sender}: ${msg.text}`).join('\n');

    // 2. Prompt Engineering
    const prompt = `
      You are an elite project management assistant for EduTechExOS.
      Analyze the following team chat transcript.
      
      Transcript:
      ${transcript}

      Task: Provide a concise, 3-bullet-point executive summary of the discussion. Focus on decisions made, progress updates, and blockers.
      Keep it extremely professional and brief. Do not use filler words.
    `;

    // 3. Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const summaryText = result.response.text();

    return { success: true, data: summaryText };

  } catch (error) {
    console.error('Error summarizing chat:', error);
    return { success: false, error: 'Failed to generate summary' };
  }
}

export async function extractActionItems(messages: ChatMessage[]) {
  try {
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY is not configured.");
    }

    if (!messages || messages.length === 0) {
      return { success: true, data: [] };
    }

    const transcript = messages.map((msg) => `${msg.sender}: ${msg.text}`).join('\n');

    const prompt = `
      You are an AI task extraction agent. 
      Read the following team conversation and identify actionable tasks.
      Look for requests, @mentions followed by instructions, or statements of intent (e.g., "I will fix the bug").

      Transcript:
      ${transcript}

      Output MUST be exactly a JSON array of objects with the following schema:
      [
        {
          "text": "The description of the task",
          "assignee": "The name of the person responsible",
          "assigneeInitials": "First and last initial (e.g., JD)"
        }
      ]
      If no tasks are found, return an empty array [].
      Do not include any other markdown formatting like \`\`\`json. Return ONLY the raw JSON array.
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    
    // Strip any markdown code fences the model may have added
    let jsonString = result.response.text().trim();
    jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // Find the JSON array if there's surrounding text
    const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: true, data: [] };
    }
    
    const tasks = JSON.parse(jsonMatch[0]);

    return { success: true, data: tasks };

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
    if (!process.env.GEMINI_API_KEY) {
      const recent = (messages || []).slice(-5).reverse();
      const context = recent.length
        ? recent.map((msg) => `${msg.sender}: ${msg.text}`).join('\n')
        : 'No recent messages yet.';

      return {
        success: true,
        data: `Channel Copilot is scoped to #${channelName}.\n\nI can see your allowed channel context (${accessibleChannels.map((channel) => `#${channel}`).join(', ') || `#${channelName}`}). Based on the recent #${channelName} activity:\n\n${context}\n\nFor your question, "${question}", use the latest messages above as the working context. Connect a GEMINI_API_KEY to enable full generative answers.`,
      };
    }

    const transcript = messages && messages.length > 0 
      ? messages.map((msg) => `[${new Date(msg.timestamp).toISOString()}] ${msg.sender}: ${msg.text}`).join('\n')
      : "No previous messages in this channel.";

    const prompt = `
      You are the EduTechExOS Copilot, an AI assistant for the team. 
      You are currently scoped to #${channelName}. Answer from this channel first.
      The signed-in user can access these channels: ${accessibleChannels.length ? accessibleChannels.map((channel) => `#${channel}`).join(', ') : `#${channelName}`}.
      Do not imply access to channels outside this list.
      You have access to the following recent team chat transcript for context.
      
      Transcript:
      ${transcript}

      User Question: ${question}

      Provide a helpful, direct, and professional response. If the transcript is relevant to the question, use it to inform your answer. If the user asks a general question, answer it to the best of your ability.
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    
    return { success: true, data: result.response.text() };

  } catch (error) {
    console.error('Error asking copilot:', error);
    return { success: false, error: 'Failed to get answer from Copilot' };
  }
}
