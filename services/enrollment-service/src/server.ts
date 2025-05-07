import express from "express";
import mongoose from "mongoose";
import { config } from "./config";
import enrollmentRouter from "./routes/enrollmentRoutes";
import { rabbitMQService } from "./services/rabbitmq";

const app = express();
const port = config.port;

app.use(express.json());
app.use(`/${config.apiVer}`, enrollmentRouter);

// Инициализация RabbitMQ и MongoDB
const initializeServices = async () => {
  try {
    // Подключение к MongoDB
    await mongoose.connect(config.mongoURL);
    console.log("Connected to MongoDB");

    // Подключение к RabbitMQ
    await rabbitMQService.connect();
    
    // Создание очередей
    await Promise.all([
      rabbitMQService.createQueue(config.queues.enrollmentUpdates),
      rabbitMQService.createQueue(config.queues.courseUpdates),
      rabbitMQService.createQueue(config.queues.lessonUpdates)
    ]);

    // Настройка обработчиков сообщений
    await rabbitMQService.consumeMessages(config.queues.courseUpdates, async (message) => {
      console.log('Received course update:', message);
      // Обработка обновлений курса
    });

    await rabbitMQService.consumeMessages(config.queues.lessonUpdates, async (message) => {
      console.log('Received lesson update:', message);
      // Обработка обновлений урока
    });

    // Запуск сервера
    app.listen(port, () => {
      console.log(`Enrollment service is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error initializing services:", error);
    process.exit(1);
  }
};

// Обработка завершения работы
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing connections...');
  await rabbitMQService.close();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing connections...');
  await rabbitMQService.close();
  await mongoose.connection.close();
  process.exit(0);
});

initializeServices();
