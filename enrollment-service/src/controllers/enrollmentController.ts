import { Request, Response, RequestHandler } from "express";
import * as enrollmentService from "../utils/enrollmentService";

export const enrollInCourse: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;

    const user = await enrollmentService.findUser(userId);
    if (!user) {
      res.status(404).json({ message: "Пользователь не найден" });
      return;
    }

    const course = await enrollmentService.findCourse(courseId);
    if (!course) {
      res.status(404).json({ message: "Курс не найден" });
      return;
    }

    const existingProgress = await enrollmentService.findProgress(userId, courseId);
    if (existingProgress) {
      res.status(400).json({ message: "Пользователь уже записан на курс" });
      return;
    }

    const progress = await enrollmentService.createProgress(userId, courseId);
    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ message: "Ошибка при записи на курс", error });
  }
};

export const getCourseProgress: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;

    const progress = await enrollmentService.findProgress(userId, courseId);
    if (!progress) {
      res.status(404).json({ message: "Запись о прогрессе не найдена" });
      return;
    }

    const lessons = await enrollmentService.getCourseLessons(courseId);
    const totalLessons = lessons.length;
    const completedLessons = progress.lessonsCompleted.length;
    const progressPercentage = enrollmentService.calculateProgressPercentage(
      totalLessons,
      completedLessons
    );

    res.json({ progressPercentage });
  } catch (error) {
    res.status(500).json({ message: "Ошибка получения прогресса", error });
  }
};

export const countCourseEnrollments: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const courseId = req.params.courseId;
    const count = await enrollmentService.countEnrollments(courseId);
    res.json({ courseId, count });
  } catch (error) {
    res.status(500).json({ message: "Ошибка подсчёта студентов", error });
  }
};

export const cancelLessonCompletion: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;
    const lessonId = Number(req.params.lessonId);

    const progress = await enrollmentService.findProgress(userId, courseId);
    if (!progress) {
      res.status(404).json({ message: "Запись о прогрессе не найдена" });
      return;
    }

    if (!progress.lessonsCompleted.includes(lessonId)) {
      res.status(400).json({ message: "Этот урок не завершён" });
      return;
    }

    progress.lessonsCompleted = progress.lessonsCompleted.filter((lesson) => lesson !== lessonId);

    await enrollmentService.updateProgress(progress, lessonId, courseId);
    res.json({
      message: "Урок отменён, прогресс обновлён",
      progressPercentage: progress.progressPercentage,
    });
  } catch (error) {
    res.status(500).json({ message: "Ошибка отмены урока", error });
  }
};

export const completeLesson: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;
    const lessonId = Number(req.params.lessonId);

    const progress = await enrollmentService.findProgress(userId, courseId);
    if (!progress) {
      res.status(404).json({ message: "Запись о прогрессе не найдена" });
      return;
    }

    const lessonsInCourse = await enrollmentService.getCourseLessons(courseId);
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
    await enrollmentService.updateProgress(progress, lessonId, courseId);
    res.json({ message: "Урок завершён", progressPercentage: progress.progressPercentage });
  } catch (error) {
    res.status(500).json({ message: "Ошибка завершения урока", error });
  }
};
