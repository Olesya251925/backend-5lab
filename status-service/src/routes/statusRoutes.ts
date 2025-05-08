import { Router } from "express";
import { getChannel } from "../utils/rabbitmq";
import { Request, Response } from "express";

const router = Router();

// Получение всех статусов
router.get("/", async (req: Request, res: Response) => {
  try {
    const channel = getChannel();
    const correlationId = generateCorrelationId();

    // Отправляем запрос через RabbitMQ
    channel.sendToQueue(
      "status-service-requests",
      Buffer.from(
        JSON.stringify({
          action: "getAllStatuses",
          correlationId,
        })
      ),
      { correlationId }
    );

    // Здесь должен быть механизм ожидания ответа
    // В реальном проекте нужно реализовать ожидание ответа из очереди
    const statuses = await waitForResponse(correlationId);

    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Создание нового статуса
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const channel = getChannel();
    const correlationId = generateCorrelationId();

    channel.sendToQueue(
      "status-service-requests",
      Buffer.from(
        JSON.stringify({
          action: "createStatus",
          data: { name, description },
          correlationId,
        })
      ),
      { correlationId }
    );

    const newStatus = await waitForResponse(correlationId);
    res.status(201).json(newStatus);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Вспомогательные функции
function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function waitForResponse(correlationId: string): Promise<any> {
  // В реальном проекте здесь должна быть реализация ожидания ответа
  // Например, через Promise с таймаутом и подпиской на очередь ответов
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: 1, name: "Sample Status", description: "Sample description" });
    }, 500);
  });
}

export default router;
