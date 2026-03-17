// models/Key.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IKey extends Document {
  userId: mongoose.Types.ObjectId
  publicKey: string
  encPrivateKey?: string  // optional encrypted backup for multi-device
  createdAt: Date
}

const KeySchema = new Schema<IKey>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  publicKey: { type: String, required: true },
  encPrivateKey: { type: String },
}, { timestamps: true })

export default mongoose.models.Key || mongoose.model<IKey>('Key', KeySchema)