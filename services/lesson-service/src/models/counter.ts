import mongoose from 'mongoose';

interface ICounter {
  _id: string;
  sequenceValue: number;
}

const counterSchema = new mongoose.Schema<ICounter>({
  _id: {
    type: String,
    required: true
  },
  sequenceValue: {
    type: Number,
    default: 0
  }
});

export default mongoose.model<ICounter>('Counter', counterSchema); 