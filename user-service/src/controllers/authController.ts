import type { Request, Response } from "express";
import UserModel from "../models/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isRegistrationDataValid } from "../utils/validation";

async function getNextUserId(): Promise<number> {
  const lastUser = await UserModel.findOne().sort({ id: -1 }).limit(1);
  return lastUser ? lastUser.id + 1 : 1;
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, login, password, role } = req.body;

    if (!isRegistrationDataValid(firstName, lastName, login, password, role)) {
      res.status(400).json({ message: "Все поля обязательны для заполнения" });
      return;
    }

    if (!["student", "teacher"].includes(role)) {
      res.status(400).json({ message: "Недопустимая роль" });
      return;
    }

    const existingUser = await UserModel.findOne({ login });
    if (existingUser) {
      res.status(400).json({ message: `Пользователь с таким логином уже существует` });
      return;
    }

    if (!login.trim()) {
      res.status(400).json({ message: "Логин не может быть пустым" });
      return;
    }

    const nextUserId = await getNextUserId();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new UserModel({
      id: nextUserId,
      firstName,
      lastName,
      login,
      password: hashedPassword,
      role,
    });

    try {
      await user.save();
      res.status(200).json({ message: "Пользователь успешно зарегистрирован" });
    } catch (saveError) {
      console.error("Ошибка при сохранении пользователя:", saveError);
      res.status(400).json({ message: "Ошибка при сохранении пользователя" });
    }
  } catch (error) {
    console.error("Ошибка при регистрации:", error);
    res.status(500).json({ error: "Ошибка при регистрации пользователя" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { login, password } = req.body;

    const user = await UserModel.findOne({ login });
    if (!user) {
      res.status(401).json({ error: "Неверный логин или пароль" });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: "Неверный логин или пароль" });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET не определен в файле .env");
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Успешный вход",
      token,
    });
  } catch (error) {
    console.error("Ошибка при входе:", error);
    res.status(500).json({ error: "Ошибка при входе" });
  }
};

export const getUserByLogin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { login } = req.query;

    if (!login) {
      return res.status(400).json({ message: "Логин не предоставлен" });
    }

    const user = await UserModel.findOne({ login }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.status(200).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      role: user.role,
    });
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    return res.status(500).json({ message: "Ошибка получения данных" });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { login } = req.body;

    if (!login) {
      return res.status(400).json({ message: "Логин не предоставлен" });
    }

    const user = await UserModel.findOneAndDelete({ login });
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.json({ message: "Пользователь успешно удален" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Ошибка удаления пользователя" });
  }
};
