// models/VerificationToken.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IVerificationToken extends Document {
  userId: mongoose.Types.ObjectId
  token: string
  expiresAt: Date
}

const VerificationTokenSchema = new Schema<IVerificationToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
})

// TTL index — MongoDB auto-deletes expired documents
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>('VerificationToken', VerificationTokenSchema)
