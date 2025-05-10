import type { Response } from "express";
import UserModel from "../models/user";
import type { AuthRequest } from "../types/auth";
import bcrypt from "bcrypt";

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  login: string;
  password: string;
  role: "student" | "teacher";
}

interface LoginCredentials {
  login: string;
  password: string;
}

interface ApiResponse {
  status: number;
  data: {
    message?: string;
    error?: string;
    user?: {
      id: number;
      firstName: string;
      lastName: string;
      login: string;
      role: "student" | "teacher";
    };
  };
}

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Пользователь не авторизован" });
      return;
    }

    const user = await UserModel.findOne({ id: req.user.id }).select("-password");
    if (!user) {
      res.status(404).json({ message: "Пользователь не найден" });
      return;
    }

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка получения данных" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Пользователь не авторизован" });
      return;
    }

    const deletedUser = await UserModel.findOneAndDelete({ id: req.user.id });
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

export const handleUserRequest = async (
  method: string,
  path: string,
  body: UserData | LoginCredentials,
): Promise<ApiResponse> => {
  switch (path) {
    case "/auth/register":
      if (method === "POST") {
        return await registerUser(body as UserData);
      }
      break;
    case "/auth/login":
      if (method === "POST") {
        return await loginUser(body as LoginCredentials);
      }
      break;
  }

  return {
    status: 404,
    data: { error: "Маршрут не найден" },
  };
};

const registerUser = async (userData: UserData): Promise<ApiResponse> => {
  try {
    const existingUser = await UserModel.findOne({
      $or: [{ login: userData.login }, { id: userData.id }],
    });
    if (existingUser) {
      return {
        status: 400,
        data: { error: "Пользователь с таким логином или ID уже существует" },
      };
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = new UserModel({
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      login: userData.login,
      password: hashedPassword,
      role: userData.role,
    });

    await user.save();

    return {
      status: 201,
      data: {
        message: "Пользователь успешно зарегистрирован",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          role: user.role,
        },
      },
    };
  } catch (error) {
    console.error("Ошибка при регистрации пользователя:", error);
    return {
      status: 500,
      data: { error: "Ошибка при регистрации пользователя" },
    };
  }
};

const loginUser = async (credentials: LoginCredentials): Promise<ApiResponse> => {
  try {
    const user = await UserModel.findOne({ login: credentials.login });
    if (!user) {
      return {
        status: 401,
        data: { error: "Неверный логин или пароль" },
      };
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    if (!isValidPassword) {
      return {
        status: 401,
        data: { error: "Неверный логин или пароль" },
      };
    }

    return {
      status: 200,
      data: {
        message: "Успешный вход",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          role: user.role,
        },
      },
    };
  } catch (error) {
    console.error("Ошибка при входе пользователя:", error);
    return {
      status: 500,
      data: { error: "Ошибка при входе пользователя" },
    };
  }
};
