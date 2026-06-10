'use client';
import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  Check,
  GitBranch,
  Zap,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://edutechexos-backend.onrender.com';

type Webhook = {
  id: string;
  name: string;
  channelId: string;
  type: 'github' | 'generic';
  token: string;
  secret?: string;
  active: boolean;
  lastUsed?: string;
  createdAt: string;
};

type Channel = { id: string; name: string };

function getToken() {
  try {
    return JSON.parse(localStorage.getItem('edutechex_token') || '{}')?.token ?? '';
  } catch {
    return '';
  }
}

function webhookUrl(wh: Webhook) {
  if (wh.type === 'github') return `${API_BASE}/webhook/github/${wh.token}`;
  return `${API_BASE}/webhook/incoming/${wh.token}`;
}

export default function IntegrationsPanel({
  onClose,
  channels,
}: {
  onClose: () => void;
  channels: Channel[];
}) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    channelId: channels[0]?.id ?? '',
    type: 'github' as 'github' | 'generic',
    secret: '',
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const workspaceChannels = channels.filter((c) => !c.id.startsWith('member-'));

  async function fetchWebhooks() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/webhooks`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setWebhooks(data.webhooks);
    } catch {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function createWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.channelId) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks((prev) => [data.webhook, ...prev]);
        setForm({
          name: '',
          channelId: workspaceChannels[0]?.id ?? '',
          type: 'github',
          secret: '',
        });
        setShowForm(false);
        toast.success('Integration created!');
      }
    } catch {
      toast.error('Failed to create integration');
    } finally {
      setCreating(false);
    }
  }

  async function deleteWebhook(id: string) {
    await fetch(`${API_BASE}/api/webhooks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    toast.success('Integration deleted');
  }

  async function toggleWebhook(wh: Webhook) {
    const res = await fetch(`${API_BASE}/api/webhooks/${wh.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ active: !wh.active }),
    });
    const data = await res.json();
    if (data.success) setWebhooks((prev) => prev.map((w) => (w.id === wh.id ? data.webhook : w)));
  }

  function copyUrl(wh: Webhook) {
    navigator.clipboard.writeText(webhookUrl(wh));
    setCopied(wh.id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Webhook URL copied!');
  }

  const githubWebhooks = webhooks.filter((w) => w.type === 'github');
  const genericWebhooks = webhooks.filter((w) => w.type === 'generic');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[rgba(62,74,137,0.12)] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(62,74,137,0.08)]">
          <div>
            <h2 className="text-lg font-bold text-[#1E2636]">Integrations</h2>
            <p className="text-xs text-[#7C859E] mt-0.5">
              Connect GitHub, Zapier, Make, and any webhook-compatible tool
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchWebhooks}
              className="p-2 rounded-lg hover:bg-[rgba(62,74,137,0.08)] text-[#7C859E] hover:text-[#4A5578] transition-colors"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[rgba(62,74,137,0.08)] text-[#7C859E] hover:text-[#4A5578] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Add new button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[rgba(62,74,137,0.12)] text-[#7C859E] hover:border-[#2A3568] hover:text-[#C4CAE0] hover:bg-blue-50 transition-all text-sm font-medium"
            >
              <Plus size={16} /> New Integration
            </button>
          )}

          {/* Create form */}
          {showForm && (
            <form
              onSubmit={createWebhook}
              className="bg-[#FAF8F5] rounded-xl border border-[rgba(62,74,137,0.12)] p-4 space-y-3"
            >
              <h3 className="text-sm font-bold text-[#4A5578]">New Integration</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#7C859E] block mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. GitHub â€” skillnaav"
                    className="w-full text-sm border border-[rgba(62,74,137,0.12)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2A3568]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#7C859E] block mb-1">Channel</label>
                  <select
                    value={form.channelId}
                    onChange={(e) => setForm((p) => ({ ...p, channelId: e.target.value }))}
                    className="w-full text-sm border border-[rgba(62,74,137,0.12)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2A3568] bg-white"
                  >
                    {workspaceChannels.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#7C859E] block mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, type: e.target.value as 'github' | 'generic' }))
                    }
                    className="w-full text-sm border border-[rgba(62,74,137,0.12)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2A3568] bg-white"
                  >
                    <option value="github">GitHub</option>
                    <option value="generic">Generic (Zapier / Make / Any)</option>
                  </select>
                </div>
                {form.type === 'github' && (
                  <div>
                    <label className="text-xs font-semibold text-[#7C859E] block mb-1">
                      Webhook Secret <span className="text-[#7C859E] font-normal">(optional)</span>
                    </label>
                    <input
                      value={form.secret}
                      onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
                      placeholder="GitHub webhook secret"
                      className="w-full text-sm border border-[rgba(62,74,137,0.12)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2A3568]"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 rounded-lg bg-[#3E4A89] text-white text-sm font-semibold hover:bg-[#2A3568] transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creatingâ€¦' : 'Create Integration'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg border border-[rgba(62,74,137,0.12)] text-sm text-[#4A5578] hover:bg-[rgba(62,74,137,0.08)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading && (
            <div className="text-center py-8 text-[#7C859E] text-sm">Loading integrationsâ€¦</div>
          )}

          {/* GitHub section */}
          {!loading && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitBranch size={16} className="text-[#4A5578]" />
                <span className="text-sm font-bold text-[#4A5578]">GitHub</span>
                <span className="text-xs bg-[rgba(62,74,137,0.08)] text-[#7C859E] px-2 py-0.5 rounded-full">
                  {githubWebhooks.length}
                </span>
              </div>

              {githubWebhooks.length === 0 && (
                <div className="rounded-xl border border-dashed border-[rgba(62,74,137,0.12)] p-4 text-center">
                  <p className="text-sm text-[#7C859E] mb-2">No GitHub integrations yet</p>
                  <p className="text-xs text-[#7C859E]">
                    Create one above, then add the URL to your GitHub repo â†’ Settings â†’ Webhooks
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {githubWebhooks.map((wh) => (
                  <WebhookCard
                    key={wh.id}
                    wh={wh}
                    channels={channels}
                    onCopy={copyUrl}
                    onDelete={deleteWebhook}
                    onToggle={toggleWebhook}
                    copied={copied}
                  />
                ))}
              </div>

              {githubWebhooks.length > 0 && (
                <div className="mt-3 bg-[#FAF8F5] rounded-lg p-3 border border-[rgba(62,74,137,0.08)]">
                  <p className="text-xs font-semibold text-[#4A5578] mb-1">
                    How to set up in GitHub:
                  </p>
                  <ol className="text-xs text-[#7C859E] space-y-0.5 list-decimal list-inside">
                    <li>
                      Go to your repo â†’ <strong>Settings â†’ Webhooks â†’ Add webhook</strong>
                    </li>
                    <li>
                      Paste the webhook URL above into <strong>Payload URL</strong>
                    </li>
                    <li>
                      Set Content type to <strong>application/json</strong>
                    </li>
                    <li>
                      Select events: <strong>Pushes, Pull requests, Issues, Releases</strong>
                    </li>
                    <li>
                      Click <strong>Add webhook</strong> â€” done!
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Generic / Zapier section */}
          {!loading && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-amber-500" />
                <span className="text-sm font-bold text-[#4A5578]">Generic Webhooks</span>
                <span className="text-xs bg-[rgba(62,74,137,0.08)] text-[#7C859E] px-2 py-0.5 rounded-full">
                  {genericWebhooks.length}
                </span>
                <span className="text-xs text-[#7C859E]">â€” Zapier, Make, IFTTT, any tool</span>
              </div>

              {genericWebhooks.length === 0 && (
                <div className="rounded-xl border border-dashed border-[rgba(62,74,137,0.12)] p-4 text-center">
                  <p className="text-sm text-[#7C859E] mb-1">No generic webhooks yet</p>
                  <p className="text-xs text-[#7C859E]">
                    POST{' '}
                    <code className="bg-[rgba(62,74,137,0.08)] px-1 rounded">
                      {'{"text":"your message"}'}
                    </code>{' '}
                    to the webhook URL
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {genericWebhooks.map((wh) => (
                  <WebhookCard
                    key={wh.id}
                    wh={wh}
                    channels={channels}
                    onCopy={copyUrl}
                    onDelete={deleteWebhook}
                    onToggle={toggleWebhook}
                    copied={copied}
                  />
                ))}
              </div>

              {genericWebhooks.length > 0 && (
                <div className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Payload format:</p>
                  <pre className="text-xs text-amber-800 font-mono bg-amber-100 rounded p-2">{`POST <webhook-url>
Content-Type: application/json

{
  "text": "Your message here",
  "title": "Optional bold title",
  "color": "#3E4A89"
}`}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WebhookCard({
  wh,
  channels,
  onCopy,
  onDelete,
  onToggle,
  copied,
}: {
  wh: Webhook;
  channels: Channel[];
  onCopy: (w: Webhook) => void;
  onDelete: (id: string) => void;
  onToggle: (w: Webhook) => void;
  copied: string | null;
}) {
  const channel = channels.find((c) => c.id === wh.channelId);
  const url = webhookUrl(wh);

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${wh.active ? 'border-[rgba(62,74,137,0.12)] bg-white' : 'border-[rgba(62,74,137,0.08)] bg-[#FAF8F5] opacity-60'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[#1E2636]">{wh.name}</span>
            <span className="text-xs bg-[rgba(62,74,137,0.08)] text-[#C4CAE0] px-2 py-0.5 rounded-full font-medium">
              #{channel?.name ?? wh.channelId}
            </span>
            {!wh.active && (
              <span className="text-xs bg-slate-200 text-[#7C859E] px-2 py-0.5 rounded-full">
                Paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <code className="text-xs text-[#7C859E] bg-[#FAF8F5] border border-[rgba(62,74,137,0.08)] rounded px-2 py-1 flex-1 truncate font-mono">
              {url}
            </code>
            <button
              onClick={() => onCopy(wh)}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[rgba(62,74,137,0.08)] text-[#7C859E] hover:text-[#C4CAE0] transition-colors"
            >
              {copied === wh.id ? (
                <Check size={13} className="text-[#9BA6D3]" />
              ) : (
                <Copy size={13} />
              )}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[rgba(62,74,137,0.08)] text-[#7C859E] hover:text-[#4A5578] transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          </div>
          {wh.lastUsed && (
            <p className="text-xs text-[#7C859E] mt-1">
              Last used: {new Date(wh.lastUsed).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggle(wh)}
            className="p-1.5 rounded-lg hover:bg-[rgba(62,74,137,0.08)] transition-colors text-[#7C859E] hover:text-[#C4CAE0]"
          >
            {wh.active ? (
              <ToggleRight size={18} className="text-indigo-500" />
            ) : (
              <ToggleLeft size={18} />
            )}
          </button>
          <button
            onClick={() => onDelete(wh.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-[#7C859E] hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
