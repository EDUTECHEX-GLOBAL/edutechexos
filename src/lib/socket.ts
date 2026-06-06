/**
 * socket.ts — client-side Socket.IO singleton
 *
 * Lazily created once and reused across the entire app so we never open
 * multiple connections when React re-renders or hot-reloads.
 *
 * Usage:
 *   import { getSocket } from '@/lib/socket';
 *   const socket = getSocket();
 *   socket.emit('join_channel', channelId);
 *   socket.on('new_message', handler);
 */

import { io, Socket } from 'socket.io-client';

// WebSocket must connect directly to the backend (Vercel can't proxy persistent
// WebSocket connections). Use NEXT_PUBLIC_SOCKET_URL in production Vercel env,
// falling back to NEXT_PUBLIC_API_URL for local dev.
const API_BASE =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:10000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      // Cap retries so a sleeping Render backend doesn't spam hundreds of
      // connect_error logs per session. 8 attempts × 30 s max delay ≈ 4 min.
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[socket] connected', socket!.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
    });

    let connectErrorCount = 0;
    socket.on('connect_error', (err) => {
      connectErrorCount += 1;
      if (connectErrorCount <= 3) {
        console.warn('[socket] connect_error:', err.message);
      } else if (connectErrorCount === 4) {
        console.warn('[socket] Backend unreachable — suppressing further connect_error logs. Real-time features are offline.');
      }
    });
  }
  return socket;
}

/** Call this if you ever need to tear down the connection (e.g. logout). */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
