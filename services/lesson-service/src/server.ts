import express from "express";
import mongoose from "mongoose";
import config from "./utils/config";
import axios from "axios";
import lessonRouter from "./routes/lessonRoutes";
import { setStatusRequest } from "./services/setStatusRequest";
import { rabbitMQService } from './services/rabbitmq';
import { ConsumeMessage } from "amqplib";

const port = config.port;
const apiVer = config.apiVer;
const lessonUrl = config.lessonServiceUrl;
const lessonQueue = config.queue;
const dbUrl = config.mongoURL;

const app = express();

app.use(express.json());

app.use(`/${apiVer}`, lessonRouter);

async function connectRabbitMQ() {
  try {
    console.log("Попытка подключения к RabbitMQ...");
    const channel = await rabbitMQService.connect();
    console.log("Канал RabbitMQ создан успешно");

    await rabbitMQService.createQueue(lessonQueue);
    console.log(`Очередь ${lessonQueue} создана успешно`);

    console.log("[*] Ожидает сообщения. Для выхода нажать CTRL+C", lessonQueue);

    channel.consume(
      lessonQueue,
      async (msg: ConsumeMessage | null) => {
        if (msg) {
          console.log("Получено новое сообщение:", msg.content.toString());
          const message = JSON.parse(msg.content.toString());
          const { requestId, path, method, body, query, headers } = message;

          const url = `${lessonUrl}:${port}/${apiVer}/${path}`;
          console.log("Обработка запроса:", { method, url, path });

          const axiosConfig = {
            method: method,
            url: url,
            params: query,
            data: body,
            headers: headers,
            validateStatus: (status: number) => {
              return status >= 200 && status < 600;
            },
          };

          try {
            const response = await axios(axiosConfig);
            console.log("Получен ответ:", response.status);
            if (response.status <= 300 && response.status >= 200) {
              setStatusRequest(requestId, response.data, "Выполнено", "Запрос выполнен успешно");
            } else {
              setStatusRequest(
                requestId,
                response.data,
                `Ошибка: ${response.status}`,
                "При выполнении запроса произошла ошибка",
              );
            }
          } catch (error) {
            console.error("Ошибка при обработке запроса:", error);
          }
          channel.ack(msg);
        }
      },
      {
        noAck: false,
      },
    );
    console.log("Подключено к RabbitMQ и готово к работе");
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}

const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  try {
    await mongoose.connect(dbUrl!);
    connectRabbitMQ().then(() => {
      app.listen(port, () => {
        console.log(`Lessons Service запущен на порту: ${port}`);
      });
    });
  } catch (error) {
    console.error("Ошибка подключения к базе данных:", error);
    if (retryCount < maxRetries) {
      setTimeout(() => connectDB(retryCount + 1), 5000);
    } else {
      console.error("Превышено максимальное количество подключений.");
      process.exit(1);
    }
  }
};

connectDB();
