import { Schema, model, Document } from "mongoose";

export interface IProgress extends Document {
  userId: string;
  courseId: string;
  lessonsCompleted: number[];
  progressPercentage: number;
}

const progressSchema = new Schema<IProgress>({
  userId: { type: String, required: true },
  courseId: { type: String, required: true },
  lessonsCompleted: { type: [Number], default: [] },
  progressPercentage: { type: Number, default: 0 },
});

const Progress = model<IProgress>("Progress", progressSchema);

export default Progress;
