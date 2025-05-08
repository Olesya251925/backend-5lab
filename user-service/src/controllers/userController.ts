import type { Response } from "express";
import User from "../models/user";
import type { AuthRequest } from "../types/auth";

export const getProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Пользователь не авторизован" });
      return;
    }

    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      res.status(404).json({ message: "Пользователь не найден" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка получения данных" });
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Пользователь не авторизован" });
      return;
    }

    const deletedUser = await User.findByIdAndDelete(req.user.id);
    if (!deletedUser) {
      res.status(404).json({ message: "Пользователь не найден" });
      return;
    }

    res.json({ message: "Пользователь удален" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка удаления" });
  }
};
