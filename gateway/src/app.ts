import express, { RequestHandler } from "express";
import cors from "cors";
import { connectToRabbitMQ, getChannel } from "./utils/rabbitmq";

// Константы для имен очередей
const USER_SERVICE_QUEUE = "user-service";
const STATUS_SERVICE_QUEUE = "status-service";
const TAG_SERVICE_QUEUE = "tag-service";

interface ServiceResponse {
  statusCode: number;
  correlationId: string;
  data?: {
    message?: string;
    error?: string;
    user?: {
      firstName: string;
      lastName: string;
      login: string;
      role: string;
    };
  };
  error?: string;
}

const app = express();
let isRabbitMQReady = false;

app.use(cors());
app.use(express.json());

// Подключение к RabbitMQ
connectToRabbitMQ()
  .then(async () => {
    console.log("✅ Gateway успешно подключен к RabbitMQ");
    isRabbitMQReady = true;

    // Создаем очереди для сервисов
    const channel = getChannel();
    await channel.assertQueue(USER_SERVICE_QUEUE, { durable: true });
    console.log(`✅ Очередь ${USER_SERVICE_QUEUE} создана`);
    
    await channel.assertQueue(TAG_SERVICE_QUEUE, { durable: true });
    console.log(`✅ Очередь ${TAG_SERVICE_QUEUE} создана`);

    const queueInfo = await channel.checkQueue(USER_SERVICE_QUEUE);
    console.log(`📊 Информация об очереди ${USER_SERVICE_QUEUE}:`);
    console.log(`   - Количество сообщений: ${queueInfo.messageCount}`);
    console.log(`   - Количество потребителей: ${queueInfo.consumerCount}`);
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения к RabbitMQ:", err);
  });

// Middleware для проверки готовности RabbitMQ
const checkRabbitMQReady: RequestHandler = (req, res, next) => {
  if (!isRabbitMQReady) {
    console.log("⏳ Ожидание подключения к RabbitMQ...");
    res.status(503).json({ error: "Сервис временно недоступен. Попробуйте позже." });
    return;
  }
  next();
};

app.use("/api/*", checkRabbitMQReady);

// Маршрутизация запросов
app.all("/api/*", async (req, res) => {
  const { method, path, body } = req;
  const service = determineService(path);
  const startTime = Date.now();

  console.log(`\n🔄 [${new Date().toISOString()}] Начало обработки запроса:`);
  console.log(`📨 Метод: ${method}, Путь: ${path}`);
  console.log(`📝 Тело запроса:`, body);
  console.log(`🎯 Сервис: ${service}`);

  try {
    const channel = getChannel();
    const correlationId = generateCorrelationId();

    // Создаем очередь для ответа
    const responseQueue = `response-${correlationId}`;
    await channel.assertQueue(responseQueue, { exclusive: true });

    // Отправляем сообщение
    const message = {
      method,
      path: path.replace("/api", ""),
      body,
      query: req.query,
      correlationId,
      responseQueue,
      timestamp: new Date().toISOString(),
    };

    // Используем константу для имени очереди
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
    }

    if (targetQueue === "unknown") {
      throw new Error("Неизвестный сервис");
    }

    channel.sendToQueue(targetQueue, Buffer.from(JSON.stringify(message)));
    console.log(`✅ Сообщение отправлено в очередь ${targetQueue}`);

    // Ожидание ответа
    const response = await waitForResponse(correlationId, responseQueue);
    const processingTime = Date.now() - startTime;

    console.log(`\n✅ Получен ответ (${processingTime}ms):`, response);
    
    // Проверяем наличие ошибки в ответе
    if (response.error) {
      res.status(response.statusCode).json({ error: response.error });
    } else {
      res.status(response.statusCode).json(response.data);
    }
  } catch (error: unknown) {
    console.error(`\n❌ Ошибка при обработке запроса:`, error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    });
  }
});

// Упрощенная функция определения сервиса
function determineService(path: string): string {
  const normalizedPath = path.toLowerCase();
  if (normalizedPath.includes("/auth") || normalizedPath.includes("/users")) {
    return "user";
  } else if (normalizedPath.includes("/status")) {
    return "status";
  } else if (normalizedPath.includes("/tags")) {
    return "tag";
  }
  return "unknown";
}

function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function waitForResponse(
  correlationId: string,
  responseQueue: string,
): Promise<ServiceResponse> {
  const channel = getChannel();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.deleteQueue(responseQueue).catch(console.error);
      reject(new Error("Таймаут ожидания ответа"));
    }, 30000);

    channel.consume(responseQueue, (msg) => {
      if (msg) {
        const response = JSON.parse(msg.content.toString()) as ServiceResponse;
        if (response.correlationId === correlationId) {
          clearTimeout(timeout);
          channel.ack(msg);
          setTimeout(() => {
            channel.deleteQueue(responseQueue).catch(console.error);
          }, 1000);
          resolve(response);
        }
      }
    });
  });
}

export default app;
