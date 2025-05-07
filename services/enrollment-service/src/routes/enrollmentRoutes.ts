import express, { Router } from "express";
import enrollmentController from "../controllers/enrollmentController";

const router: Router = express.Router();

router.post("/enroll", enrollmentController.enrollInCourse);
router.get("/progress/:userId/:courseId", enrollmentController.getCourseProgress);
router.delete("/cancel/:userId/:lessonId", enrollmentController.cancelLessonCompletion);
router.post("/complete/:userId/:lessonId", enrollmentController.completeLesson);
router.get("/count/:courseId", enrollmentController.countCourseEnrollments);

export default router;
