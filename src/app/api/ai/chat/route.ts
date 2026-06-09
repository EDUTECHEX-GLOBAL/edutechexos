import { ToolLoopAgent, createAgentUIStreamResponse, stepCountIs, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const runtime = 'edge';

const BACKEND = process.env.BACKEND_URL ?? 'https://edutechexos-backend.onrender.com';

function getModel() {
  if (process.env.GEMINI_API_KEY) return google('gemini-2.5-flash');
  if (process.env.OPENAI_API_KEY) return openai('gpt-4o-mini');
  return null;
}

function buildHeaders(userToken: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  if (userToken) h['Authorization'] = `Bearer ${userToken}`;
  return h;
}

function makeTools(channelId: string, userToken: string | null) {
  const authHeader = buildHeaders(userToken);

  return {
    create_task: tool({
      description:
        'Create a new Kanban task in the current channel. Use when the user asks to add, create, or assign a task to someone.',
      inputSchema: z.object({
        text: z.string().describe('Clear task description'),
        assignee: z.string().describe('Full name of the person to assign to'),
        assigneeEmail: z.string().optional().describe('Email of the assignee if known'),
      }),
      execute: async ({ text, assignee, assigneeEmail }) => {
        try {
          const initials = assignee
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          const res = await fetch(`${BACKEND}/api/kanban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({
              text,
              assignee,
              assigneeEmail: assigneeEmail ?? '',
              assigneeInitials: initials,
              sourceChannel: channelId,
              status: 'todo',
            }),
          });
          if (!res.ok) return { success: false, error: `Backend returned ${res.status}` };
          const data = await res.json();
          return {
            success: true,
            taskId: data.task?._id ?? 'created',
            message: `Task "${text}" created and assigned to ${assignee}.`,
          };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
    }),

    search_messages: tool({
      description:
        'Search across all workspace messages, wiki pages, and tasks by keyword. Use when asked to find something.',
      inputSchema: z.object({
        query: z.string().describe('Search keywords or phrase'),
      }),
      execute: async ({ query }) => {
        try {
          const res = await fetch(
            `${BACKEND}/api/search?q=${encodeURIComponent(query)}&limit=8`,
            { headers: authHeader }
          );
          if (!res.ok) return { success: false, results: [] };
          const data = await res.json();
          return {
            success: true,
            results: (data.results ?? []).slice(0, 8).map((r: Record<string, unknown>) => ({
              type: r.type,
              text: (r.text as string)?.slice(0, 200),
              sender: r.sender,
              channel: r.channelId,
              timestamp: r.timestamp,
            })),
            total: data.total ?? 0,
          };
        } catch (err) {
          return { success: false, error: String(err), results: [] };
        }
      },
    }),

    list_tasks: tool({
      description:
        'List current Kanban tasks — optionally filter by status or assignee. Use when asked about tasks, todos, or what is in progress.',
      inputSchema: z.object({
        status: z
          .enum(['todo', 'inprogress', 'done', 'all'])
          .optional()
          .describe('Filter by task status'),
        assignee: z.string().optional().describe('Filter by assignee name'),
      }),
      execute: async ({ status, assignee }) => {
        try {
          const res = await fetch(`${BACKEND}/api/kanban?channelId=${channelId}`, {
            headers: authHeader,
          });
          if (!res.ok) return { success: false, tasks: [] };
          const data = await res.json();
          let tasks: Record<string, unknown>[] = data.tasks ?? [];
          if (status && status !== 'all') tasks = tasks.filter((t) => t.status === status);
          if (assignee) {
            const needle = assignee.toLowerCase();
            tasks = tasks.filter((t) =>
              String(t.assignee ?? '').toLowerCase().includes(needle)
            );
          }
          return {
            success: true,
            tasks: tasks.slice(0, 20).map((t) => ({
              id: t._id,
              text: t.text,
              assignee: t.assignee,
              status: t.status,
            })),
            total: tasks.length,
          };
        } catch (err) {
          return { success: false, error: String(err), tasks: [] };
        }
      },
    }),

    get_members: tool({
      description:
        'Get the list of workspace team members — names, roles, and emails. Use when asked who is on the team.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const res = await fetch(`${BACKEND}/api/members`, { headers: authHeader });
          if (!res.ok) return { success: false, members: [] };
          const data = await res.json();
          return {
            success: true,
            members: (data.members ?? []).map((m: Record<string, unknown>) => ({
              name: m.name,
              email: m.email,
              role: m.role,
              status: m.status,
            })),
          };
        } catch (err) {
          return { success: false, error: String(err), members: [] };
        }
      },
    }),
  };
}

export async function POST(req: Request) {
  const {
    uiMessages,
    channelName,
    channelId,
    channelTranscript,
    accessibleChannels,
    userToken,
  } = await req.json();

  const model = getModel();
  if (!model) {
    return new Response(JSON.stringify({ error: 'No AI API key configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const channelList =
    (accessibleChannels || []).map((c: string) => `#${c}`).join(', ') ||
    `#${channelName}`;

  const transcriptContext = channelTranscript
    ? `\n\nRecent channel messages:\n${channelTranscript}`
    : '';

  const agent = new ToolLoopAgent({
    model,
    instructions: `You are the EduTechExOS Copilot — an AI assistant embedded in a team collaboration platform for EdTech professionals.

You are currently in #${channelName || 'general'}. The user can access: ${channelList}.${transcriptContext}

You have the following capabilities (use them proactively when relevant):
- **create_task**: Create a Kanban task and assign it to a team member
- **search_messages**: Full-text search across messages, wiki pages, and tasks
- **list_tasks**: Show current tasks filtered by status or assignee
- **get_members**: Get the current team roster

When the user asks you to "create a task", "add a to-do", "assign something" — use the create_task tool.
When the user asks "find", "search", "where is" — use search_messages.
When the user asks "what tasks", "what's in progress", "who owns" — use list_tasks.

Always confirm what you did after using a tool. Be concise, direct, and professional. Use markdown for formatting.`,
    tools: makeTools(channelId ?? channelName ?? 'general', userToken ?? null),
    stopWhen: stepCountIs(5),
    maxOutputTokens: 1500,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: uiMessages ?? [],
    abortSignal: req.signal,
  });
}
