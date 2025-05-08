import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import { connectToRabbitMQ } from "./utils/rabbitmq";

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://mongo:27017/user-service")
  .then(() => console.log("Успешное подключение к MongoDB"))
  .catch((err) => console.error("Ошибка подключения к MongoDB:", err));

connectToRabbitMQ()
  .then(() => {
    console.log("Успешное подключение к RabbitMQ");
  })
  .catch((err) => {
    console.error("Ошибка подключения к RabbitMQ:", err);
  });

// Маршруты
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

export default app;
