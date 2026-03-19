// models/User.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  phone: string
  passwordHash: string
  publicKey?: string       // optional — add when E2E encryption is enabled
  firebaseUid?: string     // optional — add when Firebase OTP is enabled
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  publicKey: { type: String, required: false },          // re-enable when E2E encryption is added
  firebaseUid: { type: String, required: false, unique: true, sparse: true }, // re-enable when Firebase OTP is added
  isVerified: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)