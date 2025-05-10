import amqp from "amqplib";
import { register, login, getUserByLogin, deleteUser } from "../controllers/authController";
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

    await channel.assertQueue("user-service");
    console.log("Подключено к RabbitMQ");

    channel.consume("user-service", async (data) => {
      if (data) {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;

        const req = {
          method: message.method,
          path: message.path,
          body: message.body,
          query: message.query || {},
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

        if (message.method === "POST" && message.path === "/auth/register") {
          await register(req, res as unknown as Response);
        } else if (message.method === "POST" && message.path === "/auth/login") {
          await login(req, res as unknown as Response);
        } else if (message.method === "GET" && message.path === "/auth/me") {
          await getUserByLogin(req, res as unknown as Response);
        } else if (message.method === "DELETE" && message.path === "/auth/delete") {
          await deleteUser(req, res as unknown as Response);
        } else {
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
      }
    });
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}
