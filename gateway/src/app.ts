import express, { RequestHandler } from "express";
import cors from "cors";
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

app.all("/api/*", async (req, res) => {
  const { method, path, body } = req;
  const service = determineService(path);

  try {
    const channel = getChannel();
    const correlationId = generateCorrelationId();

    // Создаем временную очередь для ответа (но мы не ожидаем ответа сейчас)
    const responseQueue = `response-${correlationId}`;
    await channel.assertQueue(responseQueue, { exclusive: true });

    const message = {
      method,
      path: path.replace("/api", ""),
      body,
      query: req.query,
      correlationId,
      responseQueue,
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

    // Отправляем сообщение в нужную очередь
    channel.sendToQueue(targetQueue, Buffer.from(JSON.stringify(message)));
    console.log(`Сообщение отправлено в очередь ${targetQueue}`);

    // Возвращаем клиенту сгенерированный статус ID сразу, без ожидания ответа
    res.status(202).json({ statusId: correlationId });
  } catch (error: unknown) {
    console.error(`Ошибка при обработке запроса:`, error);
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
