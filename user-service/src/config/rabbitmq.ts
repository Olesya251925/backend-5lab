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
    console.log("🔄 Попытка подключения к RabbitMQ...");
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue("user-service");
    console.log("✅ Подключено к RabbitMQ");
    console.log("👂 Ожидание сообщений...");

    channel.consume("user-service", async (data) => {
      if (data) {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;
        console.log("📨 Получено сообщение:", message);

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

        console.log("🔄 Обработка запроса:", message.method, message.path);

        if (message.method === "POST" && message.path === "/auth/register") {
          console.log(" Регистрация пользователя");
          await register(req, res as unknown as Response);
        } else if (message.method === "POST" && message.path === "/auth/login") {
          console.log(" Вход пользователя");
          await login(req, res as unknown as Response);
        } else if (message.method === "GET" && message.path === "/auth/me") {
          console.log("  Получение данных пользователя");
          await getUserByLogin(req, res as unknown as Response);
        } else if (message.method === "DELETE" && message.path === "/auth/delete") {
          console.log(" Удаление пользователя");
          await deleteUser(req, res as unknown as Response);
        } else {
          console.log(" Маршрут не найден:", message.path);
          res.status(404).json({ error: "Маршрут не найден" });
        }

        console.log(" Отправка ответа:", {
          statusCode: res.statusCode,
          data: res.data,
        });

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
