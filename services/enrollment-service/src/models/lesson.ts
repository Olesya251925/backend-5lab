import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  courseId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  }
});

export default mongoose.model('Lesson', lessonSchema); 