import mongoose, { Schema, type Document } from "mongoose";

export interface IEnrollment extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  courseId: mongoose.Schema.Types.ObjectId;
  completedLessons: mongoose.Schema.Types.ObjectId[];
  enrolledAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
  enrolledAt: { type: Date, default: Date.now },
});

export const Enrollment = mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
export default Enrollment;
