import express from "express";
import {
  enrollInCourse,
  getCourseProgress,
  countCourseEnrollments,
  cancelLessonCompletion,
} from "../controllers/enrollmentController";

const router = express.Router();

// Исправляем маршруты
router.post("/enroll/:courseId", enrollInCourse); // Запись на курс
router.get("/progress/:courseId", getCourseProgress); // Получение прогресса по курсу
router.get("/count/:courseId", countCourseEnrollments); // Подсчёт студентов на курсе
router.delete("/cancel/:courseId/:lessonId", cancelLessonCompletion); // Отмена прохождения урока

export default router;
