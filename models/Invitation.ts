import mongoose, { Document, Schema } from "mongoose";

export type InvitationStatus = "pending" | "accepted" | "declined";

export interface IInvitation extends Document {
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId; // Optional: invite to specific group chat
  status: InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    chatId: { type: Schema.Types.ObjectId, ref: "Chat" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Invitation =
  mongoose.models.Invitation ||
  mongoose.model<IInvitation>("Invitation", InvitationSchema);
