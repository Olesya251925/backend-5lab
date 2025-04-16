import mongoose, { Schema, Document } from "mongoose";

export interface ILesson extends Document {
  id: number;
  title: string;
  content?: string;
  videoUrl?: string;
  courseId: number[];
  order?: number;
  createdAt: Date;
}

const LessonSchema: Schema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String },
    videoUrl: { type: String },
    courseId: { type: [Number], required: true },
    order: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.model<ILesson>("Lesson", LessonSchema);
