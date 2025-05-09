import express from "express";
import cors from "cors";
import { connectToRabbitMQ } from "./utils/rabbitmq";
import statusRoutes from "./routes/statusRoutes";
import { setupStatusHandlers } from "./controllers/statusController";

const app = express();

app.use(cors());
app.use(express.json());

connectToRabbitMQ()
  .then(() => {
    console.log("RabbitMQ подключен");
    setupStatusHandlers();
    console.log("Обработчики статусов настроены");
  })
  .catch((err) => {
    console.error("Ошибка подключения к RabbitMQ:", err);
  });

app.use("/status", statusRoutes);

export default app;
