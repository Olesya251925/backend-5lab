import express from "express";
import asyncHandler from "express-async-handler";
import {
  getCommentsByLessonId,
  createComment,
  updateComment,
  deleteComment,
} from "../controllers/commentController";
import { AsyncRequestHandler } from "../types/comment";

const router = express.Router();

router.get("/:lessonId", asyncHandler(getCommentsByLessonId as AsyncRequestHandler));

router.post("/", asyncHandler(createComment as AsyncRequestHandler));

router.put("/:id", asyncHandler(updateComment as AsyncRequestHandler));

router.delete("/:id", asyncHandler(deleteComment as AsyncRequestHandler));

export default router;
