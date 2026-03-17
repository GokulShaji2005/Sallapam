import mongoose, { Document, Schema } from "mongoose";

export type MessageType = "text" | "image" | "file" | "system";

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;       // Plaintext or encrypted ciphertext (Phase 4)
  nonce?: string;        // Phase 4: E2E encryption nonce
  type: MessageType;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    nonce: { type: String, default: "" }, // Phase 4
    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const Message =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
