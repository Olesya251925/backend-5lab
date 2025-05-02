import mongoose, { Schema } from "mongoose";
import { ILesson } from "../types/lesson";

const LessonSchema: Schema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String },
    videoUrl: { type: String },
    courseIds: { type: [Number], required: true },
    order: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.model<ILesson>("Lesson", LessonSchema);
