import express from "express";
import {
  enrollInCourse,
  getCourseProgress,
  countCourseEnrollments,
  cancelLessonCompletion,
} from "../controllers/enrollmentController";

const router = express.Router();

// Исправляем маршруты
router.post("/enroll/:courseId", enrollInCourse);
router.get("/progress/:courseId", getCourseProgress);
router.get("/count/:courseId", countCourseEnrollments);
router.delete("/cancel/:courseId/:lessonId", cancelLessonCompletion);

export default router;
