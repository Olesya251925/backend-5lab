import mongoose, { Document } from "mongoose";
import { StatusData } from "../types/status";

interface IStatus extends Document {
  requestId: string;
  status: "pending" | "processing" | "completed" | "failed";
  data?: StatusData;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const statusSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    data: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<IStatus>("Status", statusSchema);
