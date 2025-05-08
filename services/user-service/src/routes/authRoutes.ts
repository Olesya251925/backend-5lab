import { Router, type Request, type Response } from "express";
import {
  register,
  login,
  getUserByLogin,
  deleteUser,
} from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import type { AuthRequest } from "../types/auth";

const router = Router();

console.log('Настраиваем маршруты аутентификации...');

router.post("/register", async (req: Request, res: Response) => {
  console.log('Получен запрос на регистрацию:', req.body);
  try {
    await register(req, res);
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  console.log('Получен запрос на вход:', req.body);
  try {
    await login(req, res);
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('Получен запрос на получение данных пользователя');
  try {
    await getUserByLogin(req, res);
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

router.delete("/delete", authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('Получен запрос на удаление пользователя');
  try {
    await deleteUser(req, res);
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Добавляем обработчик для корневого пути
router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Auth service is running" });
});

console.log('Маршруты аутентификации настроены');

export default router;
