import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user";
import { isRegistrationDataValid } from "../utils/validation";
import config from "../utils/config";

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
    console.log("\n=== Login attempt ===");
    console.log("Request body:", req.body);
    console.log("Environment variables:");
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    console.log("Config values:");
    console.log("JWT_SECRET from config:", config.JWT_SECRET);
    
    const { login, password } = req.body;

    if (!login || !password) {
      console.log("Missing credentials - login or password is empty");
      return res.status(400).json({ message: "Логин и пароль обязательны" });
    }

    console.log("Looking for user with login:", login);
    const user = await User.findOne({ login });
    console.log("User found:", user ? "Yes" : "No");
    if (user) {
      console.log("User details:", {
        id: user.id,
        login: user.login,
        role: user.role,
        passwordHash: user.password.substring(0, 10) + "..."
      });
    }

    if (!user) {
      return res.status(401).json({ message: "Пользователь не найден" });
    }

    console.log("Comparing passwords...");
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password is valid:", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Неверный пароль" });
    }

    console.log("Creating token payload...");
    const tokenPayload = {
      userId: user.id,
      login: user.login,
      role: user.role
    };
    console.log("Token payload:", tokenPayload);

    if (!config.JWT_SECRET) {
      console.error("JWT_SECRET is not defined!");
      throw new Error("JWT_SECRET не определен в файле .env");
    }

    console.log("Signing token with secret...");
    console.log("JWT_SECRET length:", config.JWT_SECRET.length);
    const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: "24h" });
    console.log("Token created successfully");

    console.log("=== Login successful ===");
    return res.status(200).json({
      success: true,
      message: "Успешный вход",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        login: user.login,
        role: user.role
      }
    });
  } catch (error: unknown) {
    console.error("\n=== Login error ===");
    console.error("Error details:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("Error message:", errorMessage);
    return res.status(500).json({ 
      message: errorMessage,
      error: error instanceof Error ? error.stack : undefined
    });
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
