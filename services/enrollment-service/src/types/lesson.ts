import { Document } from 'mongoose';

export interface ILesson {
  id: number;
  title: string;
  content: string;
  videoUrl?: string;
  courseIds: number[];
  order: number;
}

export interface IProgress {
  userId: number;
  courseId: string;
  lessonsCompleted: number[];
  progressPercentage: number;
}

export interface IProgressDocument extends Document, IProgress {} 