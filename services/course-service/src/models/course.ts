import mongoose, { Schema, Document } from "mongoose";
import { CourseLevel } from "../types/course";

export interface ICourse extends Document {
  courseId: number;
  title: string;
  slug: string;
  description?: string;
  price: number;
  image: string;
  category: string;
  level: CourseLevel;
  author: string;
  tags: number[];
  isFavorited: boolean;
  createdAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    courseId: { type: Number, unique: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    author: { type: String, required: true },
    tags: [{ type: Number }],
    isFavorited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export default mongoose.model<ICourse>("Course", CourseSchema);
