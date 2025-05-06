import express from "express";
import mongoose from "mongoose";
import amqp from "amqplib";
import config from "./utils/config";
import axios from "axios";
import enrollmentRouter from "./routes/enrollmentRoutes";
import { setStatusRequest } from "./services/setStatusRequest";

const port = config.port;
const apiVer = config.apiVer;
const enrollmentUrl = config.enrollemntServiceUrl;
const enrollmentQueue = config.queue;
const dbUrl = config.mongoURL;

const app = express();

app.use(express.json());

app.use(`/${apiVer}`, enrollmentRouter);

async function connectRabbitMQ() {
  let connection;
  let retries = 5;
  const deley = 5000;
  while (retries) {
    try {
      connection = await amqp.connect(config.rabbitMQUrl);
      const channel = await connection.createChannel();

      await channel.assertQueue(enrollmentQueue, { durable: false });

      console.log("[*] Ожидает сообщения. Для выхода нажать CTRL+C", enrollmentQueue);

      channel.consume(
        enrollmentQueue,
        async (msg) => {
          if (msg) {
            const message = JSON.parse(msg.content.toString());
            const { requestId, path, method, body, query, headers } = message;

            const url = `${enrollmentUrl}:${port}/${apiVer}/${path}`;

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
              console.log(error);
            }
            channel.ack(msg);
          }
        },
        {
          noAck: false,
        },
      );
      console.log("Подключено к RabbitMQ");
      return;
    } catch (err) {
      console.log(`Ошибка подключение, повторная попытка через ${deley / 1000} секунд...`, err);
      retries--;
      await new Promise((resolve) => setTimeout(resolve, deley));
    }
  }
  console.error(`Ошибка подключения к RabbitMQ после нескольких попыток.`);
  process.exit(1);
}

const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  try {
    await mongoose.connect(dbUrl!);
    connectRabbitMQ().then(() => {
      app.listen(port, () => {
        console.log(`Enrollment Service запущен на порту: ${port}`);
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
