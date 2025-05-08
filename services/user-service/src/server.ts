import express, { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import amqp from "amqplib";
import config from "./utils/config";
import axios from "axios";
import { setStatusRequest } from "./services/setStatusRequest";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";

const port = config.port;
const userQueue = config.queue;
const dbUrl = config.mongoURL;

const app = express();

// Добавляем базовый маршрут для проверки
app.get("/", (req, res) => {
  console.log("Получен запрос к корневому маршруту");
  res.json({ message: "User service is running" });
});

app.use(express.json());

// Добавляем логирование всех запросов
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Query:", req.query);
  next();
});

// Добавляем обработку ошибок JSON
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error("Error handler:", err);
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "Неверный формат JSON" });
    return;
  }
  next(err);
};

app.use(errorHandler);

console.log("Настраиваем маршруты...");
console.log("Auth routes:", Object.keys(authRoutes));
console.log("User routes:", Object.keys(userRoutes));

// Добавляем маршруты для прямых HTTP запросов
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Тестовый маршрут
app.get("/test", (req, res) => {
  console.log("Получен запрос к тестовому маршруту");
  res.json({ message: "Test route is working" });
});

// Добавляем обработку 404
app.use((req: express.Request, res: express.Response) => {
  console.log(`[404] ${req.method} ${req.path} не найден`);
  res.status(404).json({ message: `Маршрут ${req.method} ${req.path} не найден` });
});

async function connectRabbitMQ() {
  let connection;
  let retries = 5;
  const deley = 5000;
  while (retries) {
    try {
      connection = await amqp.connect(config.rabbitMQUrl);
      const channel = await connection.createChannel();

      await channel.assertQueue(userQueue, { durable: false });

      console.log("[*] Ожидает сообщения. Для выхода нажать CTRL+C", userQueue);

      channel.consume(
        userQueue,
        async (msg) => {
          if (msg) {
            try {
              const message = JSON.parse(msg.content.toString());
              const { requestId, path, method, body, query, headers } = message;

              // Создаем внутренний HTTP запрос
              const url = `http://localhost:${port}/api/${path}`;
              console.log(`Получен запрос через RabbitMQ: ${method} ${url}`);

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
                  await setStatusRequest(
                    requestId,
                    response.data,
                    "Выполнено",
                    "Запрос выполнен успешно",
                  );
                } else {
                  await setStatusRequest(
                    requestId,
                    response.data,
                    `Ошибка: ${response.status}`,
                    "При выполнении запроса произошла ошибка",
                  );
                }
              } catch (error) {
                console.error("Ошибка при выполнении запроса:", error);
                await setStatusRequest(
                  requestId,
                  null,
                  "Ошибка",
                  error instanceof Error ? error.message : "Неизвестная ошибка",
                );
              }
            } catch (error) {
              console.error("Ошибка при обработке сообщения:", error);
            } finally {
              channel.ack(msg);
            }
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
}

const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  try {
    await mongoose.connect(dbUrl!);
    console.log("Connected to MongoDB");

    // Сначала запускаем HTTP-сервер
    app.listen(port, () => {
      console.log(`User Service запущен на порту: ${port}`);
    });

    // Затем подключаемся к RabbitMQ
    await connectRabbitMQ().catch((err) => {
      console.error("Ошибка подключения к RabbitMQ:", err);
      console.log("Сервис продолжит работу только с HTTP запросами");
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
