import { Request, Response, RequestHandler } from "express";
import Progress from "../models/enrollment";
import Lesson from "../models/lesson";
import Course from "../models/course";
import User from "../models/user";

// 1. Запись на курс и создание записи прогресса
export const enrollInCourse: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;

    const user = await User.findOne({ id: userId });
    if (!user) {
      res.status(404).json({ message: "Пользователь не найден" });
      return;
    }

    const course = await Course.findOne({ courseId });
    if (!course) {
      res.status(404).json({ message: "Курс не найден" });
      return;
    }

    const existingProgress = await Progress.findOne({ userId, courseId });
    if (existingProgress) {
      res.status(400).json({ message: "Пользователь уже записан на курс" });
      return;
    }

    // Создаём запись прогресса
    const progress = new Progress({
      userId,
      courseId,
      lessonsCompleted: [],
      progressPercentage: 0,
    });

    await progress.save();
    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ message: "Ошибка при записи на курс", error });
  }
};

// 2. Получение прогресса по курсу
export const getCourseProgress: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;

    const progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      res.status(404).json({ message: "Запись о прогрессе не найдена" });
      return;
    }

    const lessons = await Lesson.find({ courseId });

    const totalLessons = lessons.length;
    const completedLessons = progress.lessonsCompleted.length;
    const progressPercentage =
      totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    progress.progressPercentage = progressPercentage;
    await progress.save();

    res.json({ progressPercentage });
  } catch (error) {
    res.status(500).json({ message: "Ошибка получения прогресса", error });
  }
};

// 3. Подсчёт студентов на курсе
export const countCourseEnrollments: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const courseId = req.params.courseId;

    const count = await Progress.countDocuments({ courseId });
    res.json({ courseId, count });
  } catch (error) {
    res.status(500).json({ message: "Ошибка подсчёта студентов", error });
  }
};

// 4. Отмена завершения урока и пересчёт прогресса
export const cancelLessonCompletion: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;
    const lessonId = req.params.lessonId;

    const progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      res.status(404).json({ message: "Запись о прогрессе не найдена" });
      return;
    }

    if (!progress.lessonsCompleted.includes(Number(lessonId))) {
      res.status(400).json({ message: "Этот урок не завершён" });
      return;
    }

    progress.lessonsCompleted = progress.lessonsCompleted.filter(
      (lesson) => lesson !== Number(lessonId),
    );

    const lessons = await Lesson.find({ courseId });
    const totalLessons = lessons.length;
    const completedLessons = progress.lessonsCompleted.length;
    const progressPercentage =
      totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    progress.progressPercentage = progressPercentage;
    await progress.save();

    res.json({ message: "Урок отменён, прогресс обновлён", progressPercentage });
  } catch (error) {
    res.status(500).json({ message: "Ошибка отмены урока", error });
  }
};

// 5. Завершение урока
export const completeLesson: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;
    const lessonId = Number(req.params.lessonId);

    const progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      res.status(404).json({ message: "Запись о прогрессе не найдена" });
      return;
    }

    const lessonsInCourse = await Lesson.find({ courseId });
    const lessonIds = lessonsInCourse.map((l) => l.id);

    if (!lessonIds.includes(lessonId)) {
      res.status(400).json({ message: "Урок не относится к данному курсу" });
      return;
    }

    if (progress.lessonsCompleted.includes(lessonId)) {
      res.status(400).json({ message: "Этот урок уже завершён" });
      return;
    }

    progress.lessonsCompleted.push(lessonId);

    const totalLessons = lessonIds.length;
    const completedLessons = progress.lessonsCompleted.filter((id) =>
      lessonIds.includes(id),
    ).length;

    const progressPercentage =
      totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    progress.progressPercentage = Math.min(progressPercentage, 100);
    await progress.save();

    res.json({ message: "Урок завершён", progressPercentage });
  } catch (error) {
    res.status(500).json({ message: "Ошибка завершения урока", error });
  }
};
