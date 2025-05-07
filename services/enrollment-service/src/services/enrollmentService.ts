import Progress, { IProgress } from "../models/enrollment";
import { rabbitMQService } from "./rabbitmq";
import { config } from "../config";

export const enrollUserInCourse = async (userId: string, courseId: string): Promise<IProgress> => {
  try {
    const existingEnrollment = await Progress.findOne({ userId, courseId });
    if (existingEnrollment) {
      throw new Error("Пользователь уже записан на этот курс");
    }

    const enrollment = await Progress.create({
      userId,
      courseId,
      completedLessons: [],
      enrollmentDate: new Date(),
      lastActivityDate: new Date(),
    });

    // Отправка уведомления о новой записи
    await rabbitMQService.publishMessage(config.queues.enrollmentUpdates, {
      type: "NEW_ENROLLMENT",
      data: {
        userId,
        courseId,
        enrollmentId: enrollment._id,
        enrollmentDate: enrollment.enrollmentDate,
      },
    });

    return enrollment;
  } catch (error) {
    console.error("Error in enrollUserInCourse:", error);
    throw error;
  }
};

export const getEnrollmentStatus = async (
  userId: string,
  courseId: string,
): Promise<IProgress | null> => {
  try {
    return await Progress.findOne({ userId, courseId });
  } catch (error) {
    console.error("Error in getEnrollmentStatus:", error);
    throw error;
  }
};

export const calculateCourseProgress = async (
  userId: string,
  courseId: string,
): Promise<number> => {
  try {
    const enrollment = await Progress.findOne({ userId, courseId });
    if (!enrollment) {
      throw new Error("Запись на курс не найдена");
    }

    // TODO: Получить общее количество уроков в курсе через API курсов
    const totalLessons = 10; // Временное решение
    const completedLessons = enrollment.completedLessons.length;

    return (completedLessons / totalLessons) * 100;
  } catch (error) {
    console.error("Error in calculateCourseProgress:", error);
    throw error;
  }
};

export const completeLesson = async (userId: string, lessonId: string): Promise<IProgress> => {
  try {
    const enrollment = await Progress.findOne({ userId });
    if (!enrollment) {
      throw new Error("Запись на курс не найдена");
    }

    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
      enrollment.lastActivityDate = new Date();
      await enrollment.save();

      // Отправка уведомления о завершении урока
      await rabbitMQService.publishMessage(config.queues.lessonUpdates, {
        type: "LESSON_COMPLETED",
        data: {
          userId,
          lessonId,
          courseId: enrollment.courseId,
          completionDate: enrollment.lastActivityDate,
        },
      });
    }

    return enrollment;
  } catch (error) {
    console.error("Error in completeLesson:", error);
    throw error;
  }
};

export const uncompleteLesson = async (userId: string, lessonId: string): Promise<IProgress> => {
  try {
    const enrollment = await Progress.findOne({ userId });
    if (!enrollment) {
      throw new Error("Запись на курс не найдена");
    }

    const lessonIndex = enrollment.completedLessons.indexOf(lessonId);
    if (lessonIndex !== -1) {
      enrollment.completedLessons.splice(lessonIndex, 1);
      enrollment.lastActivityDate = new Date();
      await enrollment.save();

      // Отправка уведомления об отмене завершения урока
      await rabbitMQService.publishMessage(config.queues.lessonUpdates, {
        type: "LESSON_UNCOMPLETED",
        data: {
          userId,
          lessonId,
          courseId: enrollment.courseId,
          uncompletionDate: enrollment.lastActivityDate,
        },
      });
    }

    return enrollment;
  } catch (error) {
    console.error("Error in uncompleteLesson:", error);
    throw error;
  }
};
