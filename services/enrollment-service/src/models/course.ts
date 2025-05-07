import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  id: {
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
  },
  teacherId: {
    type: Number,
    required: true
  }
});

export default mongoose.model('Course', courseSchema); 