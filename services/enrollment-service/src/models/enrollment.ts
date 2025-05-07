import mongoose, { Document, Schema } from 'mongoose';

export interface IProgress extends Document {
  userId: string;
  courseId: string;
  completedLessons: string[];
  enrollmentDate: Date;
  lastActivityDate: Date;
}

const ProgressSchema = new Schema<IProgress>({
  userId: {
    type: String,
    required: true
  },
  courseId: {
    type: String,
    required: true
  },
  completedLessons: [{
    type: String
  }],
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  lastActivityDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Создаем индексы для оптимизации запросов
ProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
ProgressSchema.index({ userId: 1 });
ProgressSchema.index({ courseId: 1 });

export default mongoose.model<IProgress>('Progress', ProgressSchema);
