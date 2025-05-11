import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import tagRoutes from "./routes/tagRoutes";
import { connectQueue } from "./config/rabbitmq";
import connectDB from "./config/database";
import { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

connectDB();

connectQueue();

mongoose
  .connect("mongodb://mongo:27017/backend-5lab")
  .then(() => {
    console.log("MongoDB успешно подключен");
    console.log("База данных: backend-5lab");
    console.log("Коллекция: tags");
  })
  .catch((error: Error) => console.error("Ошибка подключения к MongoDB:", error));

app.use("/tags", tagRoutes);

app.use((err: Error, req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ error: "Что-то пошло не так!" });
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});

export default app;
