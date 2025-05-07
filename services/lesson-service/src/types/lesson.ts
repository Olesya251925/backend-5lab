import { Document } from "mongoose";

export interface ICourseInfo {
  courseId: string;
  title: string;
  description: string;
}

export interface ILesson {
  id: number;
  title: string;
  content: string;
  videoUrl?: string;
  courseIds: number[];
  order: number;
}

export interface ILessonDocument extends Omit<Document, 'id'>, ILesson {}

export interface ILessonResponse extends ILesson {
  courses: ICourseInfo[];
}

export interface ILessonCreateRequest {
  title: string;
  content: string;
  videoUrl?: string;
  courseIds: number[];
  order: number;
}

export interface ILessonUpdateRequest {
  title?: string;
  content?: string;
  videoUrl?: string;
  courseIds?: number[];
  order?: number;
}
