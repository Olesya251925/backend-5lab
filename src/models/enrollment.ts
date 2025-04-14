import mongoose, { Schema, Document } from "mongoose";

export interface IEnrollment extends Document {
  userId: number; // userId как число
  courseId: number; // courseId как число
  completedLessons: number[]; // Список завершённых уроков (если это нужно)
}

const EnrollmentSchema = new Schema<IEnrollment>({
  userId: { type: Number, required: true }, // Числовой userId
  courseId: { type: Number, required: true }, // Числовой courseId
  completedLessons: { type: [Number], default: [] }, // Массив завершённых уроков
});

export default mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
