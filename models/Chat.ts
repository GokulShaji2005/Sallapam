// models/Chat.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IChat extends Document {
  type: 'direct' | 'group'
  memberIds: mongoose.Types.ObjectId[]
  directKey?: string
  groupName?: string
  adminId?: mongoose.Types.ObjectId
  lastMessageId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ChatSchema = new Schema<IChat>({
  type: { type: String, enum: ['direct', 'group'], required: true },
  memberIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  directKey: { type: String, unique: true, sparse: true },
  groupName: { type: String },
  adminId: { type: Schema.Types.ObjectId, ref: 'User' },
  lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true })

export default mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema)