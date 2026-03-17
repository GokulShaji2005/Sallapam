// types/index.ts

export interface ApiResponse<T = null> {
  success: boolean
  data?: T
  error?: string
}

export interface AuthUser {
  userId: string
  email: string
  name: string
}

export interface PublicUser {
  _id: string
  name: string
  phone: string
  publicKey: string
  isOnline?: boolean
}

export interface ChatPreview {
  _id: string
  type: 'direct' | 'group'
  groupName?: string
  members: PublicUser[]
  lastMessage?: {
    encryptedContent: string
    nonce: string
    senderId: string
    sentAt: string
  }
  updatedAt: string
}

export interface MessagePayload {
  _id: string
  chatId: string
  senderId: string
  encryptedContent: string
  nonce: string
  status: 'sent' | 'delivered' | 'read'
  isLocked: boolean
  sentAt: string
}

// Socket event payloads
export interface SendMessagePayload {
  chatId: string
  encryptedContent: string
  nonce: string
}

export interface TypingPayload {
  chatId: string
  userId: string
}