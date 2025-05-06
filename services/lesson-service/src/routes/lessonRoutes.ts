import express from "express";
import asyncHandler from "express-async-handler";
import {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../controllers/lessonController";
import { AsyncRequestHandler } from "../types/comment";

const router = express.Router();

router.get("/", asyncHandler(getLessons as AsyncRequestHandler));
router.get("/:id", asyncHandler(getLessonById as AsyncRequestHandler));
router.post("/", asyncHandler(createLesson as AsyncRequestHandler));
router.put("/:id", asyncHandler(updateLesson as AsyncRequestHandler));
router.delete("/:id", asyncHandler(deleteLesson as AsyncRequestHandler));

export default router;
