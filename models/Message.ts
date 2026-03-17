// models/Message.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  encryptedContent: string
  nonce: string
  status: 'sent' | 'delivered' | 'read'
  isLocked: boolean
  lockHash?: string
  sentAt: Date
}

const MessageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: { type: String, required: true },
  nonce: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  isLocked: { type: Boolean, default: false },
  lockHash: { type: String },
  sentAt: { type: Date, default: Date.now },
})

// Index for fast chat history queries
MessageSchema.index({ chatId: 1, sentAt: -1 })

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema)