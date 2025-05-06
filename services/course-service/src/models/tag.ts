import { Document, model, Schema } from "mongoose";

export interface ITag extends Document {
  tagId: number;
  name: string;
}

export interface ITagCreateRequest {
  tag: string;
}

export interface ITagResponse {
  tagId: number;
  name: string;
}

const tagSchema = new Schema<ITag>({
  tagId: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
});

export const Tag = model<ITag>("Tag", tagSchema);
