import express from "express";
import {
  enrollInCourse,
  getCourseProgress,
  countCourseEnrollments,
  cancelLessonCompletion,
  completeLesson,
} from "../controllers/enrollmentController";

const router = express.Router();

router.post("/enroll/:courseId", enrollInCourse);
router.get("/progress/:courseId", getCourseProgress);
router.get("/count/:courseId", countCourseEnrollments);
router.delete("/cancel/:courseId/:lessonId", cancelLessonCompletion);
router.post("/complete/:courseId/:lessonId", completeLesson);

export default router;
