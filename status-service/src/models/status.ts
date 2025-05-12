import mongoose, { Schema, Document } from "mongoose";

export interface StatusDocument extends Document {
  requestId: string;
  status: string;
  data?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const statusSchema = new Schema<StatusDocument>(
  {
    requestId: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: true },
);

const Status = mongoose.model<StatusDocument>("Status", statusSchema);

export default Status;
