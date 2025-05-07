import { Request, Response } from "express";
import {
  enrollUserInCourse,
  getEnrollmentStatus,
  calculateCourseProgress,
  completeLesson as completeLessonService,
  uncompleteLesson,
} from "../services/enrollmentService";
import Progress from "../models/enrollment";

export const enrollInCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, courseId } = req.body;
    const enrollment = await enrollUserInCourse(userId, courseId);
    res.status(201).json({ message: "Успешная запись на курс", enrollment });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Ошибка при записи на курс" });
    }
  }
};

export const getCourseProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, courseId } = req.params;
    const enrollment = await getEnrollmentStatus(userId, courseId);

    if (!enrollment) {
      res.status(404).json({ message: "Запись на курс не найдена" });
      return;
    }

    const progress = await calculateCourseProgress(userId, courseId);
    res.json({ enrollment, progress });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Ошибка при получении прогресса" });
    }
  }
};

export const completeLesson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const { lessonId } = req.params;
    const enrollment = await completeLessonService(userId, lessonId);
    res.json({ message: "Урок успешно завершен", enrollment });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Ошибка при завершении урока" });
    }
  }
};

export const cancelLessonCompletion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const { lessonId } = req.params;
    const enrollment = await uncompleteLesson(userId, lessonId);
    res.json({ message: "Завершение урока отменено", enrollment });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Ошибка при отмене завершения урока" });
    }
  }
};

export const countCourseEnrollments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const count = await Progress.countDocuments({ courseId });
    res.json({ count });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Ошибка при подсчете записей на курс" });
    }
  }
};

export default {
  enrollInCourse,
  getCourseProgress,
  completeLesson,
  cancelLessonCompletion,
  countCourseEnrollments,
};
