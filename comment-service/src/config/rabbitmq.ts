import amqp from "amqplib";
import {
  getCommentsByLessonId,
  createComment,
  updateComment,
  deleteComment,
} from "../controllers/commentController";
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

    await channel.assertQueue("comment-service");
    console.log("Подключено к RabbitMQ");

    channel.consume("comment-service", async (data) => {
      if (data) {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;
        console.log("Получено сообщение:", JSON.stringify(message, null, 2));

        const req = {
          method: message.method,
          path: message.path,
          body: message.body,
          query: message.query || {},
          params: {},
        } as Request;

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

        try {
          if (message.method === "POST" && message.path === "/comments") {
            await createComment(req, res as unknown as Response);
          } else if (message.method === "GET" && message.path.startsWith("/comments/")) {
            const parts = message.path.split("/");
            const lessonId = parts[parts.length - 1];
            req.params.lessonId = lessonId;
            await getCommentsByLessonId(req, res as unknown as Response);
          } else if (message.method === "PUT" && message.path.startsWith("/comments/")) {
            const parts = message.path.split("/");
            const commentId = parts[parts.length - 1];
            req.params.id = commentId;
            await updateComment(req, res as unknown as Response);
          } else if (message.method === "DELETE" && message.path.startsWith("/comments/")) {
            const parts = message.path.split("/");
            const commentId = parts[parts.length - 1];
            req.params.id = commentId;
            await deleteComment(req, res as unknown as Response);
          } else {
            console.log("Маршрут не найден:", message.method, message.path);
            res.status(404).json({ error: "Маршрут не найден" });
          }

          channel.sendToQueue(
            message.responseQueue,
            Buffer.from(
              JSON.stringify({
                statusCode: res.statusCode,
                data: res.data,
                error:
                  res.statusCode >= 400
                    ? (res.data as { message?: string })?.message || "Ошибка при обработке запроса"
                    : undefined,
                correlationId: message.correlationId,
              })
            )
          );
        } catch (error) {
          console.error("Ошибка обработки сообщения:", error);
          channel.sendToQueue(
            message.responseQueue,
            Buffer.from(
              JSON.stringify({
                statusCode: 500,
                error: "Внутренняя ошибка сервера",
                correlationId: message.correlationId,
              })
            )
          );
        }

        channel.ack(data);
      }
    });
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}
