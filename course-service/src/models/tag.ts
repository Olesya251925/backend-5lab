import mongoose, { Schema } from "mongoose";
import { ITag } from "../types/tag";

const TagSchema = new Schema<ITag>({
  tagId: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
});

export default mongoose.model<ITag>("Tag", TagSchema);
