// src/app.ts
import express from "express";
import cors from "cors";
import statusRoutes from "./routes/statusRoutes";
import { connectQueue } from "./config/rabbitmq";
import connectDB from "./config/database";

const app = express();
const port = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    // Подключаем базу данных
    await connectDB();
    console.log("MongoDB подключен");

    // Подключаем RabbitMQ
    await connectQueue(); // Ждем завершения подключения

    // Подключаем роуты
    app.use("/status", statusRoutes);

    // Обработчик ошибок
    app.use((err: Error, req: express.Request, res: express.Response) => {
      console.error(err.stack);
      res.status(500).json({ error: "Что-то пошло не так!" });
    });

    app.listen(port, () => {
      console.log(`Сервер запущен на порту ${port}`);
    });
  } catch (error) {
    console.error("Ошибка при запуске сервера:", error);
    process.exit(1);
  }
}

startServer();

export default app;
