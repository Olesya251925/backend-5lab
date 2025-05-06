import { Document } from "mongoose";

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
