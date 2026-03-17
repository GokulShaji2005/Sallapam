// models/Invitation.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IInvitation extends Document {
  phone: string
  invitedBy: mongoose.Types.ObjectId
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const InvitationSchema = new Schema<IInvitation>({
  phone: { type: String, required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true })

export default mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema)