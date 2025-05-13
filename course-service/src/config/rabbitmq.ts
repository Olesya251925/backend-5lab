import amqp from "amqplib";
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  addToFavorites,
  removeFromFavorites,
  getCourseWithTags,
} from "../controllers/courseController";
import { Request, Response } from "express";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672";

interface CustomResponse {
  statusCode: number;
  data: unknown;
  status(code: number): CustomResponse;
  json(data: unknown): CustomResponse;
  end(): CustomResponse;
}

interface RabbitMQMessage {
  statusId: string;
  method: string;
  path: string;
  body: unknown;
  query?: Record<string, string>;
  responseQueue: string;
  correlationId: string;
}

let channel: amqp.Channel;

export async function connectQueue() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue("course-service", { durable: true });
    await channel.assertQueue("status-updates", { durable: true });

    console.log("Подключено к RabbitMQ");

    channel.consume("course-service", async (data) => {
      if (!data) return;

      try {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;
        console.log(
          `[Course-service] Получено сообщение с statusId=${message.statusId}, path=${message.path}`,
        );

        const req = {
          method: message.method,
          path: message.path,
          body: message.body,
          query: message.query || {},
          params: {} as Record<string, string>,
        } as Request;

        const pathParts = message.path.split("/").filter(Boolean);

        if (pathParts[0] === "courses") {
          if (pathParts[1] === "favorite" && pathParts[2]) {
            req.params.id = pathParts[2];
          } else if (pathParts[1] && !["favorite", "tags"].includes(pathParts[1])) {
            req.params.id = pathParts[1];
          }
        }

        const res: CustomResponse = {
          statusCode: 200,
          data: null,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: unknown) {
            this.data = data;
            return this;
          },
          end() {
            this.data = null;
            return this;
          },
        };

        if (message.method === "GET" && message.path === "/courses") {
          await getCourses(req, res as unknown as Response, () => {});
        } else if (message.method === "POST" && message.path === "/courses") {
          await createCourse(req, res as unknown as Response, () => {});
        } else if (message.method === "POST" && message.path.includes("/favorite/")) {
          await addToFavorites(req, res as unknown as Response, () => {});
        } else if (message.method === "DELETE" && message.path.includes("/favorite/")) {
          await removeFromFavorites(req, res as unknown as Response, () => {});
        } else if (message.method === "GET" && /\/courses\/\w+\/tags/.test(message.path)) {
          const match = message.path.match(/\/courses\/(\w+)\/tags/);
          if (match) req.params.id = match[1];
          await getCourseWithTags(req, res as unknown as Response, () => {});
        } else if (message.method === "GET" && message.path.startsWith("/courses/")) {
          await getCourseById(req, res as unknown as Response, () => {});
        } else if (message.method === "PUT" && message.path.startsWith("/courses/")) {
          await updateCourse(req, res as unknown as Response, () => {});
        } else if (message.method === "DELETE" && message.path.startsWith("/courses/")) {
          await deleteCourse(req, res as unknown as Response, () => {});
        } else {
          console.log("Маршрут не найден:", message.path);
          res.status(404).json({ error: "Маршрут не найден" });
        }

        console.log(
          `[Course-service] Отправляем статус success для statusId=${message.statusId} с результатом:`,
          res.data,
        );
        await sendStatusUpdate(message.statusId, "success", res.data, null, message);

        // Отправляем ответ в очередь ответа
        if (res.statusCode >= 400) {
          channel.sendToQueue(
            message.responseQueue,
            Buffer.from(
              JSON.stringify({
                statusCode: res.statusCode,
                error:
                  (res.data as { message?: string })?.message || "Ошибка при обработке запроса",
                correlationId: message.correlationId,
              }),
            ),
          );
        } else {
          channel.sendToQueue(
            message.responseQueue,
            Buffer.from(
              JSON.stringify({
                statusCode: res.statusCode,
                data: res.data,
                correlationId: message.correlationId,
              }),
            ),
          );
        }

        channel.ack(data);
      } catch (error) {
        console.error(`[Course-service] Ошибка в контроллере:`, error);

        let statusId = "unknown";
        let originalMessage: RabbitMQMessage | undefined;
        try {
          if (data) {
            originalMessage = JSON.parse(data.content.toString()) as RabbitMQMessage;
            statusId = originalMessage.statusId;
          }
        } catch (parseError) {
          console.warn(
            "[Course-service] Не удалось распарсить сообщение для получения statusId:",
            parseError,
          );
        }

        await sendStatusUpdate(statusId, "error", null, (error as Error).message, originalMessage);

        channel.ack(data);
      }
    });
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}

async function sendStatusUpdate(
  statusId: string,
  status: "pending" | "success" | "error",
  result: unknown = null,
  error: string | null = null,
  originalMessage?: RabbitMQMessage,
) {
  if (!channel) {
    console.error("[Course-service] Канал RabbitMQ не инициализирован");
    return;
  }

  const updateMessage = {
    statusId,
    status,
    result,
    error,
    method: originalMessage?.method,
    path: originalMessage?.path,
    body: originalMessage?.body,
    timestamp: new Date().toISOString(),
  };

  console.log(
    `[Course-service] Отправляем обновление статуса в очередь status-updates:`,
    updateMessage,
  );

  channel.sendToQueue("status-updates", Buffer.from(JSON.stringify(updateMessage)), {
    persistent: true,
  });
}
