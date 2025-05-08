import express, { RequestHandler } from "express";
import cors from "cors";
import { connectToRabbitMQ, getChannel } from "./utils/rabbitmq";

// Константы для имен очередей
const USER_SERVICE_QUEUE = "user-service";
const STATUS_SERVICE_QUEUE = "status-service";

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
  .then(() => {
    console.log("✅ Gateway успешно подключен к RabbitMQ");
    isRabbitMQReady = true;

    // Создаем очереди для сервисов
    const channel = getChannel();
    channel
      .assertQueue(USER_SERVICE_QUEUE, { durable: true })
      .then(() => {
        console.log(`✅ Очередь ${USER_SERVICE_QUEUE} создана`);
        return channel.checkQueue(USER_SERVICE_QUEUE);
      })
      .then((queueInfo) => {
        console.log(`📊 Информация об очереди ${USER_SERVICE_QUEUE}:`);
        console.log(`   - Количество сообщений: ${queueInfo.messageCount}`);
        console.log(`   - Количество потребителей: ${queueInfo.consumerCount}`);
      })
      .catch((err) => {
        console.error("❌ Ошибка при работе с очередью:", err);
      });
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
    const targetQueue = service === "user" ? USER_SERVICE_QUEUE : STATUS_SERVICE_QUEUE;

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
  if (path.startsWith("/api/auth") || path.startsWith("/api/users")) {
    return "user";
  } else if (path.startsWith("/api/status")) {
    return "status";
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
