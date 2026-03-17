import mongoose, { Document, Schema } from "mongoose";

export interface IChat extends Document {
  name?: string;
  isGroup: boolean;
  participants: mongoose.Types.ObjectId[];
  adminIds: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    name: { type: String, default: "" },
    isGroup: { type: Boolean, default: false },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    adminIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

export const Chat = mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);
