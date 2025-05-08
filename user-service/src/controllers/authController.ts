import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user";
import { isRegistrationDataValid } from "../utils/validation";

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { firstName, lastName, login, password, role } = req.body;

    if (!isRegistrationDataValid(firstName, lastName, login, password, role)) {
      return res.status(400).json({ message: "Все поля обязательны для заполнения" });
    }

    if (!["student", "teacher"].includes(role)) {
      return res.status(400).json({ message: "Недопустимая роль" });
    }

    const existingUser = await User.findOne({ login });
    if (existingUser) {
      return res.status(400).json({ message: "Логин уже занят" });
    }

    if (!login.trim()) {
      return res.status(400).json({ message: "Логин не может быть пустым" });
    }

    const users = await User.find({});
    const usedIds = users.map((user) => user.id);

    let newId = 1;
    while (usedIds.includes(newId)) {
      newId++;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      id: newId,
      firstName,
      lastName,
      login,
      password: hashedPassword,
      role,
    });

    await newUser.save();
    return res.status(201).json({ message: "Пользователь зарегистрирован", user: newUser });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Ошибка при регистрации:", error.message);
      return res.status(500).json({ message: "Ошибка регистрации", error: error.message });
    } else {
      console.error("Неизвестная ошибка:", error);
      return res.status(500).json({ message: "Ошибка регистрации" });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { login, password } = req.body;
    const user = await User.findOne({ login });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Неверные учетные данные" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET не определен в файле .env");
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.json({ token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Ошибка входа" });
  }
};

export const getUserByLogin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { login } = req.query;

    if (!login) {
      return res.status(400).json({ message: "Логин не предоставлен" });
    }

    const user = await User.findOne({ login }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Ошибка получения данных" });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { login } = req.body;

    if (!login) {
      return res.status(400).json({ message: "Логин не предоставлен" });
    }

    const user = await User.findOneAndDelete({ login });
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.json({ message: "Пользователь успешно удален" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Ошибка удаления пользователя" });
  }
};
