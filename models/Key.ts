import mongoose, { Document, Schema } from "mongoose";

// Phase 4: Stores per-user key pairs (the private key should only ever be stored client-side)
export interface IKey extends Document {
  userId: mongoose.Types.ObjectId;
  publicKey: string;      // Base64-encoded X25519 public key
  encryptedPrivateKey?: string; // Optionally store encrypted private key
  createdAt: Date;
  updatedAt: Date;
}

const KeySchema = new Schema<IKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Key = mongoose.models.Key || mongoose.model<IKey>("Key", KeySchema);
