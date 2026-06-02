import crypto from "node:crypto";
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const idDefault = () => crypto.randomUUID();
const tsDefault = () => new Date().toISOString();

const userSchema = new Schema({
  _id: { type: String, default: idDefault },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, default: null, sparse: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "member"], required: true },
  avatarUrl: { type: String, default: null },
  skills: { type: String, default: "" },
  plan: { type: String, default: "" },
  createdAt: { type: String, default: tsDefault },
  updatedAt: { type: String, default: tsDefault },
});

const projectSchema = new Schema({
  _id: { type: String, default: idDefault },
  owner: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  completionRate: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed", "on_hold"],
    default: "in_progress",
  },
  createdAt: { type: String, default: tsDefault },
  updatedAt: { type: String, default: tsDefault },
});

const messageSchema = new Schema({
  _id: { type: String, default: idDefault },
  sender: { type: String, required: true, index: true },
  channelType: { type: String, enum: ["general", "dm"], required: true },
  recipient: { type: String, default: null },
  dmKey: { type: String, default: null, index: true },
  content: { type: String, required: true },
  createdAt: { type: String, default: tsDefault },
  updatedAt: { type: String, default: tsDefault },
});

const alertSchema = new Schema({
  _id: { type: String, default: idDefault },
  createdBy: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  scheduledAt: { type: String, required: true },
  status: { type: String, enum: ["pending", "delivered"], default: "pending" },
  deliveredAt: { type: String, default: null },
  seenBy: { type: [String], default: [] },
  createdAt: { type: String, default: tsDefault },
  updatedAt: { type: String, default: tsDefault },
});

export type UserDoc = InferSchemaType<typeof userSchema>;
export type ProjectDoc = InferSchemaType<typeof projectSchema>;
export type MessageDoc = InferSchemaType<typeof messageSchema>;
export type AlertDoc = InferSchemaType<typeof alertSchema>;

export const User =
  mongoose.models.User ?? mongoose.model("User", userSchema);
export const Project =
  mongoose.models.Project ?? mongoose.model("Project", projectSchema);
export const Message =
  mongoose.models.Message ?? mongoose.model("Message", messageSchema);
export const Alert =
  mongoose.models.Alert ?? mongoose.model("Alert", alertSchema);
