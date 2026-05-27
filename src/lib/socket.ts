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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[socket] connected', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err.message);
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
