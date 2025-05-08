import express from "express";
import cors from "cors";
import { connectToRabbitMQ, getChannel } from "./utils/rabbitmq";

const app = express();

app.use(cors());
app.use(express.json());

// Подключение к RabbitMQ с задержкой
setTimeout(() => {
  connectToRabbitMQ()
    .then(() => {
      console.log("✅ Успешно подключено к RabbitMQ");
    })
    .catch((err) => {
      console.error("❌ Ошибка подключения к RabbitMQ:", err);
    });
}, 10000); // 10 секунд задержки

// Маршрутизация запросов
app.all("*", async (req, res) => {
  const { method, path, body } = req;
  const service = determineService(path);
  console.log(`📨 Получен запрос: ${method} ${path}`);

  try {
    const channel = getChannel();
    const correlationId = generateCorrelationId();
    console.log(`🔄 Отправка запроса в сервис ${service} с ID: ${correlationId}`);

    // Отправляем сообщение в соответствующую очередь
    channel.sendToQueue(`${service}-service`, Buffer.from(JSON.stringify({ method, path, body })), {
      correlationId,
    });

    // Ждем ответа
    const response = await waitForResponse(correlationId);
    console.log(`✅ Получен ответ от сервиса ${service}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`❌ Ошибка при обработке запроса: ${error}`);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

function determineService(path: string): string {
  if (path.startsWith("/auth") || path.startsWith("/users")) {
    return "user";
  } else if (path.startsWith("/status")) {
    return "status";
  }
  return "unknown";
}

function generateCorrelationId(): string {
  return Math.random().toString() + Date.now().toString();
}

async function waitForResponse(correlationId: string): Promise<any> {
  // Здесь должна быть реализация ожидания ответа от сервиса
  // Это упрощенная версия, в реальности нужно использовать механизм ожидания
  return { status: 200, data: { message: "Success" } };
}

export default app;
