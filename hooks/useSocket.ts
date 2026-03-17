"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// Phase 3: WebSocket hook for real-time messaging
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export function useSocket(chatId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    if (chatId) {
      socket.emit("join-room", chatId);
    }

    return () => {
      if (chatId) socket.emit("leave-room", chatId);
      socket.disconnect();
      setIsConnected(false);
    };
  }, [chatId]);

  return { socket: socketRef.current, isConnected };
}
