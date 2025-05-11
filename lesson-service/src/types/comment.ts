import { Document } from "mongoose";
import { Request, Response, NextFunction } from "express";

export interface IComment extends Document {
  id: number;
  user: number;
  lesson: number;
  text: string;
}

export interface ICommentResponse {
  id: number;
  user: {
    firstName: string;
    lastName: string;
  };
  lesson: string;
  text: string;
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;
