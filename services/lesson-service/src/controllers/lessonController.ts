import { Request, Response } from "express";
import Lesson from "../models/lesson";
import Counter from "../models/counter";
import Course from "../models/course";
import {
  ILessonResponse,
  ILessonCreateRequest,
  ILessonUpdateRequest,
  ICourseInfo,
} from "../types/lesson";
import axios from "axios";
import config from "../utils/config";

// Получить все уроки
export const getLessons = async (req: Request, res: Response) => {
  try {
    const lessons = await Lesson.find();
    res.json(lessons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при получении уроков" });
  }
};

// Получить урок по ID
export const getLessonById = async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id);
    const lesson = await Lesson.findOne({ id: lessonId });

    if (!lesson) return res.status(404).json({ error: "Урок не найден" });

    const courses = await Course.find({ courseId: { $in: lesson.courseIds.map(String) } });

    const response: ILessonResponse = {
      ...lesson.toObject(),
      courses: courses.map(
        (course): ICourseInfo => ({
          courseId: course.courseId,
          title: course.title,
          description: course.description,
        }),
      ),
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при получении урока" });
  }
};

const validateCourseIdsArray = (courseIds: number[]): boolean => {
  return Array.isArray(courseIds) && courseIds.every((id) => typeof id === "number");
};

const findMissingCourses = async (courseIds: number[]): Promise<number[]> => {
  const foundCourses = await Course.find({ courseId: { $in: courseIds.map(String) } });
  const foundCourseIds = foundCourses.map((course) => parseInt(course.courseId));
  return courseIds.filter((id) => !foundCourseIds.includes(id));
};

const generateNewId = async (): Promise<number> => {
  const existingLessons = await Lesson.find();
  const existingIds = existingLessons.map((lesson) => lesson.id);
  const maxId = Math.max(...existingIds, 0);
  const freeId = existingIds.find((id) => !existingIds.includes(id)) || maxId + 1;

  if (freeId) {
    return freeId;
  } else {
    const counter = await Counter.findOneAndUpdate(
      { _id: "lessonId" },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true },
    );
    return counter?.sequenceValue || maxId + 1;
  }
};

// Создание нового урока
export const createLesson = async (req: Request, res: Response) => {
  try {
    const { title, content, videoUrl, courseIds, order }: ILessonCreateRequest = req.body;

    if (!validateCourseIdsArray(courseIds)) {
      return res.status(400).json({ error: "courseIds должен быть массивом чисел" });
    }

    const missingCourseIds = await findMissingCourses(courseIds);
    if (missingCourseIds.length > 0) {
      return res.status(400).json({
        error: `Курсы с courseId [${missingCourseIds.join(", ")}] не найдены в коллекции courses.`,
      });
    }

    const newId = await generateNewId();

    // Получаем информацию о курсах
    const courses = await Promise.all(
      courseIds.map(async (courseId: number) => {
        const response = await axios.get(
          `${config.coursesServiceUrl}/courses/${courseId}`
        );
        return response.data;
      })
    );

    const lesson = new Lesson({
      id: newId,
      title,
      content,
      videoUrl,
      courseIds,
      order,
    });

    await lesson.save();

    // Преобразуем документ в формат ILessonResponse
    const lessonResponse: ILessonResponse = {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      courseIds: lesson.courseIds,
      order: lesson.order,
      courses: courses,
    };

    res.status(201).json(lessonResponse);
  } catch (error) {
    console.error("Error creating lesson:", error);
    res.status(500).json({ message: "Error creating lesson" });
  }
};

// Обновить урок
export const updateLesson = async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id);
    const { courseIds, ...restBody }: ILessonUpdateRequest = req.body;

    if (courseIds !== undefined) {
      if (!Array.isArray(courseIds)) {
        return res.status(400).json({ error: "courseIds должен быть массивом чисел" });
      }

      const missingCourseIds = await findMissingCourses(courseIds);
      if (missingCourseIds.length > 0) {
        return res.status(400).json({
          error: `Курсы с courseId [${missingCourseIds.join(", ")}] не найдены в коллекции courses.`,
        });
      }
    }

    const updatedLesson = await Lesson.findOneAndUpdate(
      { id: lessonId },
      { ...restBody, ...(courseIds !== undefined && { courseIds }) },
      { new: true },
    );

    if (!updatedLesson) {
      return res.status(404).json({ error: "Урок не найден" });
    }

    res.json(updatedLesson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при обновлении урока" });
  }
};

// Удалить урок
export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const deletedLesson = await Lesson.findOneAndDelete({
      id: parseInt(req.params.id),
    });
    if (!deletedLesson) return res.status(404).json({ error: "Урок не найден" });

    res.json({ message: "Урок удалён" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при удалении урока" });
  }
};
