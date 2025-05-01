import mongoose, { Schema, Document } from "mongoose";

export interface ITag extends Document {
  tagId: number;
  name: string;
}

const TagSchema = new Schema<ITag>({
  tagId: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
});

export default mongoose.model<ITag>("Tag", TagSchema);
