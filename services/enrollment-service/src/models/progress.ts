import mongoose from 'mongoose';
import { IProgressDocument } from '../types/lesson';

const progressSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true
  },
  courseId: {
    type: String,
    required: true
  },
  lessonsCompleted: {
    type: [Number],
    default: []
  },
  progressPercentage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model<IProgressDocument>('Progress', progressSchema); 