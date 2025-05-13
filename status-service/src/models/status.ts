import mongoose, { Document, Schema } from "mongoose";

export interface RequestData {
  method: string;
  path: string;
  body: unknown;
  timestamp: Date;
}

export interface StatusDocument extends Document {
  statusId: string;
  requests: RequestData[];
  status: "pending" | "success" | "error";
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const requestDataSchema = new Schema<RequestData>(
  {
    method: { type: String, required: true },
    path: { type: String, required: true },
    body: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, required: true },
  },
  { _id: false },
);

const statusSchema = new Schema<StatusDocument>(
  {
    statusId: { type: String, required: true, unique: true },
    requests: { type: [requestDataSchema], default: [] },
    status: { type: String, required: true, default: "pending" },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: true },
);

const Status = mongoose.model<StatusDocument>("Status", statusSchema);

export default Status;
