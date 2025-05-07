import { Request, Response, NextFunction } from 'express';

export interface Comment {
  id: string;
  lessonId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentDto {
  lessonId: string;
  userId: string;
  content: string;
}

export interface UpdateCommentDto {
  content: string;
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<Response | void>; 