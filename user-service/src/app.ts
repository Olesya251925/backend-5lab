import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import { connectQueue } from "./config/rabbitmq";
import connectDB from './config/database';
import { Request, Response, NextFunction } from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Подключение к базе данных
connectDB();

// Подключение к RabbitMQ
connectQueue();

// Подключение к MongoDB
mongoose
  .connect("mongodb://mongo:27017/backend-5lab")
  .then(() => {
    console.log("🔄 Попытка подключения к MongoDB...");
    console.log("✅ MongoDB успешно подключен");
    console.log("📚 База данных: backend-5lab");
    console.log("📑 Коллекция: users");
  })
  .catch((error: Error) => console.error("❌ Ошибка подключения к MongoDB:", error));

// Маршруты для прямых HTTP запросов
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

// Обработка ошибок
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});

export default app;
