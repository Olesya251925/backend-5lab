import express, { RequestHandler } from "express";
import cors from "cors";
import axios from "axios";
import { connectToRabbitMQ, getChannel } from "./utils/rabbitmq";

const USER_SERVICE_QUEUE = "user-service";
const STATUS_SERVICE_QUEUE = "status-service";
const TAG_SERVICE_QUEUE = "tag-service";
const COURSE_SERVICE_QUEUE = "course-service";
const LESSON_SERVICE_QUEUE = "lesson-service";
const COMMENT_SERVICE_QUEUE = "comment-service";
const ENROLLMENT_SERVICE_QUEUE = "enrollment-service";

const app = express();
let isRabbitMQReady = false;

app.use(cors());
app.use(express.json());

connectToRabbitMQ()
  .then(async () => {
    console.log("Gateway успешно подключен к RabbitMQ");
    isRabbitMQReady = true;
    const channel = getChannel();

    const queues = [
      { name: USER_SERVICE_QUEUE, description: "Пользователи" },
      { name: STATUS_SERVICE_QUEUE, description: "Статусы" },
      { name: TAG_SERVICE_QUEUE, description: "Теги" },
      { name: COURSE_SERVICE_QUEUE, description: "Курсы" },
      { name: LESSON_SERVICE_QUEUE, description: "Уроки" },
      { name: COMMENT_SERVICE_QUEUE, description: "Комментарии" },
      { name: ENROLLMENT_SERVICE_QUEUE, description: "Записи на курсы" },
    ];

    for (const queue of queues) {
      await channel.assertQueue(queue.name, { durable: true });
      console.log(`Очередь "${queue.description}" (${queue.name}) готова`);
    }

    console.log("Все очереди успешно инициализированы");
  })
  .catch((err) => {
    console.error("Ошибка подключения к RabbitMQ:", err);
  });

const checkRabbitMQReady: RequestHandler = (req, res, next) => {
  if (!isRabbitMQReady) {
    res.status(503).json({ error: "Сервис временно недоступен. Попробуйте позже." });
    return;
  }
  next();
};

app.use("/api/*", checkRabbitMQReady);

app.get("/api/status/:statusId", async (req, res) => {
  const { statusId } = req.params;

  try {
    const statusServiceUrl = `http://status-service:3007/api/status/${statusId}`;
    console.log(`[Gateway] Запрос к статус-сервису: ${statusServiceUrl}`);

    const response = await axios.get(statusServiceUrl);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("[Gateway] Ошибка получения статуса:", error);
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: "Ошибка сервиса статусов",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});

app.all("/api/*", async (req, res) => {
  const { method, body, query } = req;
  const path = req.path;
  const service = determineService(path);

  try {
    const channel = getChannel();

    let statusId: string;
    if (service === "status" && method === "GET") {
      const match = path.match(/\/status\/([^/]+)/);
      statusId = match ? match[1] : generateCorrelationId();
      console.log(`[Gateway] GET /status запрос с statusId=${statusId}`);
    } else {
      statusId = generateCorrelationId();
      console.log(`[Gateway] Новый запрос, сгенерирован statusId=${statusId}`);
    }

    const message = {
      statusId,
      method,
      path: path.replace("/api", ""),
      body,
      query,
      timestamp: new Date().toISOString(),
    };

    let targetQueue = "unknown";
    switch (service) {
      case "user":
        targetQueue = USER_SERVICE_QUEUE;
        break;
      case "status":
        targetQueue = STATUS_SERVICE_QUEUE;
        break;
      case "tag":
        targetQueue = TAG_SERVICE_QUEUE;
        break;
      case "course":
        targetQueue = COURSE_SERVICE_QUEUE;
        break;
      case "lesson":
        targetQueue = LESSON_SERVICE_QUEUE;
        break;
      case "comment":
        targetQueue = COMMENT_SERVICE_QUEUE;
        break;
      case "enrollment":
        targetQueue = ENROLLMENT_SERVICE_QUEUE;
        break;
    }

    if (targetQueue === "unknown") {
      throw new Error("Неизвестный сервис");
    }

    console.log(`[Gateway] Отправляем сообщение в ${targetQueue} с statusId=${statusId}`);
    console.log(`[Gateway] Сообщение:`, JSON.stringify(message));

    channel.sendToQueue(targetQueue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    channel.sendToQueue(STATUS_SERVICE_QUEUE, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    console.log(`[Gateway] Сообщение также отправлено в очередь ${STATUS_SERVICE_QUEUE}`);

    res.status(202).json({ statusId });
  } catch (error: unknown) {
    console.error(`[Gateway] Ошибка при обработке запроса:`, error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    });
  }
});

function determineService(path: string): string {
  const normalizedPath = path.toLowerCase();
  if (normalizedPath.includes("/auth") || normalizedPath.includes("/users")) {
    return "user";
  } else if (normalizedPath.includes("/status")) {
    return "status";
  } else if (normalizedPath.includes("/courses/") && normalizedPath.includes("/tags")) {
    return "course";
  } else if (normalizedPath.includes("/courses")) {
    return "course";
  } else if (normalizedPath.includes("/tags")) {
    return "tag";
  } else if (normalizedPath.includes("/lessons")) {
    return "lesson";
  } else if (normalizedPath.includes("/comments")) {
    return "comment";
  } else if (normalizedPath.includes("/enrollments")) {
    return "enrollment";
  }
  return "unknown";
}

function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default app;
