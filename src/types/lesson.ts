// types/lesson.ts
import { Document } from "mongoose";

export interface ICourseInfo {
  courseId: number;
  title: string;
  description?: string;
}

export interface ILesson extends Document {
  id: number;
  title: string;
  content?: string;
  videoUrl?: string;
  courseIds: number[];
  order?: number;
  createdAt: Date;
}

export interface ILessonResponse {
  id: number;
  title: string;
  content?: string;
  videoUrl?: string;
  courses: ICourseInfo[];
  order?: number;
  createdAt: Date;
}

export interface ILessonCreateRequest {
  title: string;
  content?: string;
  videoUrl?: string;
  courseIds: number[];
  order?: number;
}

export interface ILessonUpdateRequest {
  title?: string;
  content?: string;
  videoUrl?: string;
  courseIds?: number[];
  order?: number;
}
