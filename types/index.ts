// Shared TypeScript types for the ChatApp

// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  publicKey?: string; // Phase 4: E2E encryption
  createdAt: string;
  updatedAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface Chat {
  _id: string;
  name?: string;
  isGroup: boolean;
  participants: User[];
  adminIds: string[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}

// ─── Message ──────────────────────────────────────────────────────────────────
export type MessageType = "text" | "image" | "file" | "system";

export interface Message {
  _id: string;
  chatId: string;
  senderId: User | string;
  content: string;
  nonce?: string; // Phase 4
  type: MessageType;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Invitation ───────────────────────────────────────────────────────────────
export type InvitationStatus = "pending" | "accepted" | "declined";

export interface Invitation {
  _id: string;
  fromUserId: User | string;
  toUserId: User | string;
  chatId?: string;
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Key ──────────────────────────────────────────────────────────────────────
export interface Key {
  _id: string;
  userId: string;
  publicKey: string;
  encryptedPrivateKey?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
}
