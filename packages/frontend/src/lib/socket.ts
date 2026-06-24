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
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://edutechexos-backend.onrender.com'
    : 'http://localhost:10002');

let socket: Socket | null = null;

function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return JSON.parse(localStorage.getItem('edutechex_token') ?? '').token ?? '';
  } catch {
    return '';
  }
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 60000,
      timeout: 20000,
      auth: { token: getStoredToken() },
    });

    // Refresh the JWT on every reconnect so an updated token is always sent.
    socket.on('reconnect_attempt', () => {
      if (socket) socket.auth = { token: getStoredToken() };
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
        console.warn(
          '[socket] Backend unreachable — suppressing further connect_error logs. Real-time features are offline.'
        );
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
