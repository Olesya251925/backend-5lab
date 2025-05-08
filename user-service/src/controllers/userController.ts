import type { Response } from "express";
import { User } from "../models/user";
import type { AuthRequest } from "../types/auth";
import bcrypt from "bcrypt";

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

export const handleUserRequest = async (method: string, path: string, body: any) => {
  console.log(`🔄 Обработка запроса: ${method} ${path}`);

  switch (path) {
    case "/auth/register":
      if (method === "POST") {
        return await registerUser(body);
      }
      break;
    case "/auth/login":
      if (method === "POST") {
        return await loginUser(body);
      }
      break;
    default:
      return {
        status: 404,
        data: { error: "Маршрут не найден" }
      };
  }
};

const registerUser = async (userData: any) => {
  try {
    console.log("📝 Регистрация нового пользователя");
    
    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ login: userData.login });
    if (existingUser) {
      return {
        status: 400,
        data: { error: "Пользователь с таким логином уже существует" }
      };
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Создаем нового пользователя
    const user = new User({
      firstName: userData.firstName,
      lastName: userData.lastName,
      login: userData.login,
      password: hashedPassword,
      role: userData.role
    });

    await user.save();
    console.log("✅ Пользователь успешно зарегистрирован");

    return {
      status: 201,
      data: {
        message: "Пользователь успешно зарегистрирован",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          role: user.role
        }
      }
    };
  } catch (error) {
    console.error("❌ Ошибка при регистрации пользователя:", error);
    return {
      status: 500,
      data: { error: "Ошибка при регистрации пользователя" }
    };
  }
};

const loginUser = async (credentials: any) => {
  try {
    console.log("🔑 Попытка входа пользователя");
    
    const user = await User.findOne({ login: credentials.login });
    if (!user) {
      return {
        status: 401,
        data: { error: "Неверный логин или пароль" }
      };
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    if (!isValidPassword) {
      return {
        status: 401,
        data: { error: "Неверный логин или пароль" }
      };
    }

    console.log("✅ Пользователь успешно вошел в систему");

    return {
      status: 200,
      data: {
        message: "Успешный вход",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          role: user.role
        }
      }
    };
  } catch (error) {
    console.error("❌ Ошибка при входе пользователя:", error);
    return {
      status: 500,
      data: { error: "Ошибка при входе пользователя" }
    };
  }
};
