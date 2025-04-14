import { Request, Response, RequestHandler } from "express";
import Enrollment from "../models/enrollment";
import Lesson from "../models/lesson";

// 1. Запись на курс
export const enrollInCourse: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = Number(req.params.courseId);

    const existingEnrollment = await Enrollment.findOne({ userId, courseId });
    if (existingEnrollment) {
      res.status(400).json({ message: "Пользователь уже записан на этот курс" });
      return;
    }

    const enrollment = await Enrollment.create({ userId, courseId });
    res.status(201).json(enrollment);
  } catch (error) {
    res.status(400).json({ message: "Ошибка при записи на курс", error });
  }
};

// 2. Получить прогресс по курсу
export const getCourseProgress: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = Number(req.params.courseId);

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      res.status(404).json({ message: "Нет записи на курс" });
      return;
    }

    const lessons = await Lesson.find({ courseId });

    const totalLessons = lessons.length;
    const completed = enrollment.completedLessons.length;

    const progress = Math.round((completed / totalLessons) * 100);
    res.json({ progress });
  } catch (error) {
    res.status(500).json({ message: "Ошибка получения прогресса", error });
  }
};

// 3. Подсчитать студентов на курсе
export const countCourseEnrollments: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const courseId = Number(req.params.courseId);
    const count = await Enrollment.countDocuments({ courseId });
    res.json({ courseId, count });
  } catch (error) {
    res.status(500).json({ message: "Ошибка подсчёта студентов", error });
  }
};

// 4. Отмена прохождения урока
export const cancelLessonCompletion: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = Number(req.params.courseId);
    const lessonId = Number(req.params.lessonId);

    const enrollment = await Enrollment.findOneAndUpdate(
      { userId, courseId },
      { $pull: { completedLessons: lessonId } },
      { new: true },
    );

    if (!enrollment) {
      res.status(404).json({ message: "Запись на курс не найдена" });
      return;
    }

    const lessons = await Lesson.find({ courseId });

    const totalLessons = lessons.length;
    const completed = enrollment.completedLessons.length;

    const progress = Math.round((completed / totalLessons) * 100);

    res.json({ message: "Прохождение урока отменено", progress, enrollment });
  } catch (error) {
    res.status(500).json({ message: "Ошибка при отмене прохождения урока", error });
  }
};

// 5. Завершение урока
export const completeLesson: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = Number(req.params.courseId);
    const lessonId = Number(req.params.lessonId);

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      res.status(404).json({ message: "Нет записи на курс" });
      return;
    }

    if (enrollment.completedLessons.includes(lessonId)) {
      res.status(400).json({ message: "Урок уже завершён" });
      return;
    }

    enrollment.completedLessons.push(lessonId);
    await enrollment.save();

    const lessons = await Lesson.find({ courseId });

    const totalLessons = lessons.length;
    const completed = enrollment.completedLessons.length;

    const progress = Math.round((completed / totalLessons) * 100);

    res.json({ message: "Урок завершён", progress, enrollment });
  } catch (error) {
    res.status(500).json({ message: "Ошибка при завершении урока", error });
  }
};
