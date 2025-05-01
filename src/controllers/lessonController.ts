import { Request, Response } from "express";
import Lesson from "../models/lesson";
import Counter from "../models/counter";
import Course from "../models/course";

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

    const courses = await Course.find({ courseId: { $in: lesson.courseIds } });

    res.json({
      ...lesson.toObject(),
      courses: courses.map((course) => ({
        courseId: course.courseId,
        title: course.title,
        description: course.description,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при получении урока" });
  }
};

const validateCourseIdsArray = (courseIds: number[]): boolean => {
  return Array.isArray(courseIds) && courseIds.every((id) => typeof id === "number");
};

const findMissingCourses = async (courseId: number[]): Promise<number[]> => {
  const foundCourses = await Course.find({ courseId: { $in: courseId } });
  const foundCourseIds = foundCourses.map((course) => course.courseId);
  return courseId.filter((id) => !foundCourseIds.includes(id));
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
    return counter?.sequenceValue;
  }
};

// Создание нового урока
export const createLesson = async (req: Request, res: Response) => {
  try {
    const { title, content, videoUrl, courseIds, order } = req.body;

    // Валидация courseIds
    if (!validateCourseIdsArray(courseIds)) {
      return res.status(400).json({ error: "courseIds должен быть массивом чисел" });
    }

    // Поиск отсутствующих курсов
    const missingCourseIds = await findMissingCourses(courseIds);

    if (missingCourseIds.length > 0) {
      return res.status(400).json({
        error: `Курсы с courseId [${missingCourseIds.join(", ")}] не найдены в коллекции courses.`,
      });
    }

    // Генерация нового ID для урока
    const newId = await generateNewId();

    // Создание нового урока
    const newLesson = new Lesson({
      id: newId,
      title,
      content,
      videoUrl,
      courseIds, // Используем courseIds, а не courseId
      order,
    });

    // Сохранение нового урока
    await newLesson.save();
    res.status(201).json(newLesson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при создании урока" });
  }
};

// Обновить урок
export const updateLesson = async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id);
    const { courseIds, ...restBody } = req.body;

    if (courseIds !== undefined) {
      if (!Array.isArray(courseIds)) {
        return res.status(400).json({ error: "courseIds должен быть массивом чисел" }); // Используем множественное число
      }

      const foundCourses = await Course.find({ courseId: { $in: courseIds } });
      const foundCourseIds = foundCourses.map((c) => c.courseId);
      const missingCourseIds = courseIds.filter((id: number) => !foundCourseIds.includes(id));

      if (missingCourseIds.length > 0) {
        return res.status(400).json({
          error: `Курсы с courseId [${missingCourseIds.join(", ")}] не найдены в коллекции courses.`,
        });
      }
    }

    const updatedLesson = await Lesson.findOneAndUpdate(
      { id: lessonId },
      { ...restBody, ...(courseIds !== undefined && { courseIds: courseIds }) }, // Заменили courseId на courseIds
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
