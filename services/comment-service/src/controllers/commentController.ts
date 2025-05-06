import { Request, Response } from "express";
import Comment from "../models/comment";
import User from "../models/user";
import Lesson from "../models/lesson";
import { ICommentResponse } from "../types/comment";

// Получить все комментарии к уроку
export const getCommentsByLessonId = async (req: Request, res: Response): Promise<void> => {
  try {
    const lessonId = parseInt(req.params.lessonId);

    const comments = await Comment.find({ lesson: lessonId });

    const lesson = await Lesson.findOne({ id: lessonId });

    if (!lesson) {
      res.status(404).json({ message: "Урок не найден" });
      return;
    }

    const responseComments: ICommentResponse[] = await Promise.all(
      comments.map(async (comment) => {
        const user = await User.findOne({ id: comment.user });

        return {
          id: comment.id,
          user: {
            firstName: user?.firstName || "Неизвестно",
            lastName: user?.lastName || "Неизвестно",
          },
          lesson: lesson.title,
          text: comment.text,
        };
      }),
    );

    res.json(responseComments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при получении комментариев" });
  }
};

// Создать новый комментарий
export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, lesson, text } = req.body;

    if (!user || !lesson || !text) {
      res.status(400).json({
        error: "Все поля обязательны для заполнения",
        received: { user, lesson, text },
      });
      return;
    }

    const userExists = await User.findOne({ id: user });
    if (!userExists) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    const lessonExists = await Lesson.findOne({ id: lesson });
    if (!lessonExists) {
      res.status(404).json({ error: "Урок не найден" });
      return;
    }

    const comments = await Comment.find().sort({ id: -1 });
    const nextId = comments.length > 0 ? comments[0].id + 1 : 1;

    const newComment = new Comment({
      id: nextId,
      user,
      lesson,
      text,
    });

    await newComment.save();
    console.log("Комментарий успешно создан:", newComment);
    res.status(201).json(newComment);
  } catch (error: unknown) {
    console.error("Полная ошибка:", error);
    if (error instanceof Error) {
      res.status(500).json({
        error: "Ошибка при создании комментария",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Ошибка при создании комментария",
        details: "Неизвестная ошибка",
      });
    }
  }
};

// Обновить комментарий
export const updateComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: "Текст комментария обязателен" });
      return;
    }

    const comment = await Comment.findOne({ id: parseInt(id) });
    if (!comment) {
      res.status(404).json({ error: "Комментарий не найден" });
      return;
    }

    comment.text = text;
    await comment.save();

    res.json(comment);
  } catch (error) {
    console.error("Ошибка при обновлении комментария:", error);
    if (error instanceof Error) {
      res.status(500).json({
        error: "Ошибка при обновлении комментария",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Ошибка при обновлении комментария",
        details: "Неизвестная ошибка",
      });
    }
  }
};

// Удалить комментарий
export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const comment = await Comment.findOne({ id: parseInt(id) });
    if (!comment) {
      res.status(404).json({ error: "Комментарий не найден" });
      return;
    }

    await comment.deleteOne();
    res.json({ message: "Комментарий успешно удален" });
  } catch (error) {
    console.error("Ошибка при удалении комментария:", error);
    if (error instanceof Error) {
      res.status(500).json({
        error: "Ошибка при удалении комментария",
        details: error.message,
      });
    } else {
      res.status(500).json({
        error: "Ошибка при удалении комментария",
        details: "Неизвестная ошибка",
      });
    }
  }
};
