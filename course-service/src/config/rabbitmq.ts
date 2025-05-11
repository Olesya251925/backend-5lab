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

    await channel.assertQueue("course-service");
    console.log("Подключено к RabbitMQ");

    channel.consume("course-service", async (data) => {
      if (data) {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;

        const req = {
          method: message.method,
          path: message.path,
          body: message.body,
          query: message.query || {},
          params: {},
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
        console.log("Сообщение обработано и подтверждено");
      }
    });
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}
