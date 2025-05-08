import type { Request, Response } from "express";
import { User } from "../models/user";
import type { AuthRequest } from "../types/auth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isRegistrationDataValid } from "../utils/validation";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, login, password, role } = req.body;
    console.log('📝 Попытка регистрации пользователя:', { login, role });

    if (!isRegistrationDataValid(firstName, lastName, login, password, role)) {
      console.log('❌ Не все поля заполнены');
      res.status(400).json({ message: "Все поля обязательны для заполнения" });
      return;
    }

    if (!["student", "teacher"].includes(role)) {
      console.log('❌ Недопустимая роль:', role);
      res.status(400).json({ message: "Недопустимая роль" });
      return;
    }

    const existingUser = await User.findOne({ login });
    if (existingUser) {
      console.log('❌ Логин уже занят:', login);
      res.status(400).json({ message: `Логин ${login} уже существует` });
      return;
    }

    if (!login.trim()) {
      console.log('❌ Пустой логин');
      res.status(400).json({ message: "Логин не может быть пустым" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      login,
      password: hashedPassword,
      role,
    });

    try {
      await user.save();
      console.log('✅ Пользователь успешно сохранен в БД:', { login, role });
      res.status(200).json({ message: "Пользователь успешно зарегистрирован" });
    } catch (saveError) {
      console.error('❌ Ошибка при сохранении пользователя:', saveError);
      res.status(400).json({ message: "Ошибка при сохранении пользователя" });
    }
  } catch (error) {
    console.error("❌ Ошибка при регистрации:", error);
    res.status(500).json({ error: "Ошибка при регистрации пользователя" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { login, password } = req.body;
    console.log('👤 Попытка входа для пользователя:', login);

    const user = await User.findOne({ login });
    if (!user) {
      console.log('❌ Пользователь не найден:', login);
      res.status(401).json({ error: "Неверный логин или пароль" });
      return;
    }

    console.log('✅ Пользователь найден, проверка пароля...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Неверный пароль для пользователя:', login);
      res.status(401).json({ error: "Неверный логин или пароль" });
      return;
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET не определен в файле .env');
      throw new Error("JWT_SECRET не определен в файле .env");
    }

    console.log('✅ Пароль верный, генерация токена...');
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    console.log('✅ Успешный вход пользователя:', login);
    res.json({
      message: "Успешный вход",
      token
    });
  } catch (error) {
    console.error("❌ Ошибка при входе:", error);
    res.status(500).json({ error: "Ошибка при входе" });
  }
};

export const getUserByLogin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { login } = req.query;
    console.log('Получен запрос на получение данных пользователя. Query параметры:', req.query);

    if (!login) {
      console.log('Ошибка: логин не предоставлен');
      return res.status(400).json({ message: "Логин не предоставлен" });
    }

    const user = await User.findOne({ login }).select("-password");
    if (!user) {
      console.log('Ошибка: пользователь не найден для логина:', login);
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    console.log('Успешно найден пользователь:', user);
    return res.status(200).json({
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      role: user.role,
    });
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
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
