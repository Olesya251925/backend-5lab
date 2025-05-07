import mongoose from 'mongoose';
import { ICourseInfo } from '../types/lesson';

const courseSchema = new mongoose.Schema<ICourseInfo>({
  courseId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});

export default mongoose.model<ICourseInfo>('Course', courseSchema); 