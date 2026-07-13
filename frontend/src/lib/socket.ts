import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const socketUrl =
  process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:4000';

export function getSocket() {
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
}

export function connectSocket() {
  const instance = getSocket();
  if (!instance.connected) {
    instance.connect();
  }
  return instance;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
