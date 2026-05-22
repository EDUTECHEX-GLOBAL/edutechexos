import React from 'react';

export default function NetworkIllustration() {
  const nodes = [
    { id: 'node-center', cx: 240, cy: 240, r: 28, label: 'AI', primary: true },
    { id: 'node-channels', cx: 100, cy: 120, r: 20, label: '#' },
    { id: 'node-tasks', cx: 380, cy: 100, r: 20, label: '✓' },
    { id: 'node-digest', cx: 420, cy: 280, r: 18, label: '📋' },
    { id: 'node-members', cx: 80, cy: 340, r: 18, label: '👥' },
    { id: 'node-kb', cx: 300, cy: 400, r: 16, label: '📚' },
    { id: 'node-search', cx: 160, cy: 420, r: 14, label: '🔍' },
  ];

  const edges = [
    { id: 'edge-1', x1: 240, y1: 240, x2: 100, y2: 120 },
    { id: 'edge-2', x1: 240, y1: 240, x2: 380, y2: 100 },
    { id: 'edge-3', x1: 240, y1: 240, x2: 420, y2: 280 },
    { id: 'edge-4', x1: 240, y1: 240, x2: 80, y2: 340 },
    { id: 'edge-5', x1: 240, y1: 240, x2: 300, y2: 400 },
    { id: 'edge-6', x1: 240, y1: 240, x2: 160, y2: 420 },
    { id: 'edge-7', x1: 100, y1: 120, x2: 80, y2: 340 },
    { id: 'edge-8', x1: 380, y1: 100, x2: 420, y2: 280 },
  ];

  return (
    <div className="relative w-full max-w-lg aspect-square">
      <svg
        viewBox="0 0 480 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-label="Network diagram showing AI at center connected to team channels, tasks, digest, members, knowledge base, and search"
      >
        <defs>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background glow */}
        <circle cx="240" cy="240" r="180" fill="url(#center-glow)" />

        {/* Edges */}
        {edges?.map((edge) => (
          <line
            key={edge?.id}
            x1={edge?.x1}
            y1={edge?.y1}
            x2={edge?.x2}
            y2={edge?.y2}
            stroke="#2563eb"
            strokeWidth="1.5"
            strokeOpacity="0.35"
            strokeDasharray="4 4"
          />
        ))}

        {/* Secondary edges (lighter) */}
        <line x1="100" y1="120" x2="380" y2="100" stroke="#0a0a0a" strokeWidth="1" strokeOpacity="0.08" />
        <line x1="80" y1="340" x2="160" y2="420" stroke="#0a0a0a" strokeWidth="1" strokeOpacity="0.08" />
        <line x1="300" y1="400" x2="160" y2="420" stroke="#0a0a0a" strokeWidth="1" strokeOpacity="0.08" />

        {/* Satellite nodes */}
        {nodes?.slice(1)?.map((node) => (
          <g key={node?.id}>
            <circle
              cx={node?.cx}
              cy={node?.cy}
              r={node?.r + 6}
              fill="white"
              stroke="#e4e4e7"
              strokeWidth="1"
            />
            <circle
              cx={node?.cx}
              cy={node?.cy}
              r={node?.r}
              fill="white"
              stroke="#0a0a0a"
              strokeWidth="1.5"
            />
            <text
              x={node?.cx}
              y={node?.cy + 5}
              textAnchor="middle"
              fontSize="11"
              fill="#0a0a0a"
              fontWeight="600"
              fontFamily="monospace"
            >
              {node?.label}
            </text>
          </g>
        ))}

        {/* Center node — AI */}
        <circle cx="240" cy="240" r="40" fill="#2563eb" opacity="0.08" />
        <circle cx="240" cy="240" r="28" fill="#0a0a0a" />
        <text
          x="240"
          y="246"
          textAnchor="middle"
          fontSize="13"
          fill="white"
          fontWeight="700"
          fontFamily="monospace"
          letterSpacing="0.05em"
        >
          AI
        </text>

        {/* Dot pulse rings */}
        <circle cx="240" cy="240" r="36" fill="none" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="240" cy="240" r="48" fill="none" stroke="#2563eb" strokeWidth="0.5" strokeOpacity="0.15" />
      </svg>
    </div>
  );
}