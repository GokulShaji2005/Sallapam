'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080'
const TOKEN_REFRESH_MS = 8 * 60 * 1000

// ─── Context ──────────────────────────────────────────────────────────────────

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
})

// ─── Provider ─────────────────────────────────────────────────────────────────
// Wrap your chat layout with <SocketProvider token={jwtToken}>

interface SocketProviderProps {
  token?: string | null
  children: ReactNode
}

export function SocketProvider({ token, children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [fetchedToken, setFetchedToken] = useState<string | null>(null)
  const activeToken = token ?? fetchedToken

  async function requestSocketToken(): Promise<string | null> {
    try {
      const res = await fetch('/api/auth/socket-token', { cache: 'no-store' })
      if (!res.ok) return null
      const json = await res.json()
      return json.success ? (json.data?.token ?? null) : null
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (token) return

    let isMounted = true

    const refreshToken = async () => {
      const nextToken = await requestSocketToken()
      if (!isMounted) return
      setFetchedToken(nextToken)
    }

    refreshToken()
    const intervalId = setInterval(refreshToken, TOKEN_REFRESH_MS)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [token])

  useEffect(() => {
    // Don't connect without a token — user isn't logged in
    if (!activeToken) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    // Disconnect previous socket if token changed (e.g. re-login)
    socketRef.current?.disconnect()

    const nextSocket = io(SOCKET_URL, {
      auth: { token: activeToken }, // passed to JWT middleware on the server
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = nextSocket

    nextSocket.on('connect', () => {
      setIsConnected(true)
      setSocket(nextSocket)
    })
    nextSocket.on('disconnect', () => {
      setIsConnected(false)
      setSocket((prev) => (prev === nextSocket ? null : prev))
    })
    nextSocket.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err.message)

      if (token) return
      if (!/unauthorized|jwt|token|auth/i.test(err.message)) return

      requestSocketToken().then((nextToken) => {
        if (nextToken && nextToken !== fetchedToken) {
          setFetchedToken(nextToken)
        }
      })
    })

    return () => {
      nextSocket.disconnect()
      if (socketRef.current === nextSocket) {
        socketRef.current = null
      }
    }
  }, [activeToken, token, fetchedToken]) // reconnect whenever the token changes

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

// ─── useSocket — consume anywhere inside <SocketProvider> ─────────────────────

export function useSocket() {
  return useContext(SocketContext)
}

// ─── useChat — convenience hook for per-chat room management ──────────────────
// Joins/leaves the room automatically and exposes typing/delivery helpers.

export function useChat(chatId: string | null) {
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!socket || !isConnected || !chatId) return
    socket.emit('chat:join', chatId)
    return () => {
      socket.emit('chat:leave', chatId)
    }
  }, [socket, isConnected, chatId])

  function sendTyping() {
    if (socket && chatId) socket.emit('chat:typing', { chatId })
  }

  function markDelivered(messageId: string) {
    if (socket && chatId) socket.emit('message:delivered', { chatId, messageId })
  }

  return { socket, isConnected, sendTyping, markDelivered }
}
