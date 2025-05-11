import amqp from "amqplib";
import {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../controllers/lessonController";
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
  method: string;
  path: string;
  body: unknown;
  query?: Record<string, string>;
  responseQueue: string;
  correlationId: string;
}

export async function connectQueue() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue("lesson-service", { durable: true });
    console.log("Очередь lesson-service готова к работе");

    channel.consume("lesson-service", async (data) => {
      if (!data) return;

      try {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;
        console.log(`Получен запрос: ${message.method} ${message.path}`);

        const req = {
          method: message.method,
          path: message.path,
          body: message.body,
          query: message.query || {},
          params: {},
        } as Request;

        const pathParts = message.path.split("/").filter(Boolean);
        if (pathParts[0] === "lessons" && pathParts[1]) {
          req.params.id = pathParts[1];
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

        if (message.method === "POST" && message.path === "/lessons") {
          await createLesson(req, res as unknown as Response);
        } else if (message.method === "GET" && message.path === "/lessons") {
          await getLessons(req, res as unknown as Response);
        } else if (message.method === "GET" && message.path.startsWith("/lessons/")) {
          await getLessonById(req, res as unknown as Response);
        } else if (message.method === "PUT" && message.path.startsWith("/lessons/")) {
          await updateLesson(req, res as unknown as Response);
        } else if (message.method === "DELETE" && message.path.startsWith("/lessons/")) {
          await deleteLesson(req, res as unknown as Response);
        } else {
          res.status(404).json({ error: "Маршрут не найден" });
        }

        channel.sendToQueue(
          message.responseQueue,
          Buffer.from(
            JSON.stringify({
              statusCode: res.statusCode,
              data: res.data,
              error: res.statusCode >= 400 ? (res.data as any)?.message : undefined,
              correlationId: message.correlationId,
            }),
          ),
          { persistent: true },
        );

        channel.ack(data);
      } catch (error) {
        console.error("Ошибка обработки сообщения:", error);
        channel.nack(data);
      }
    });
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}
