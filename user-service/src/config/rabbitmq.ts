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

    await channel.assertQueue("user-service", { durable: true });
    await channel.assertQueue("status-updates", { durable: true });

    console.log("Подключено к RabbitMQ");

    channel.consume("user-service", async (data) => {
      if (data) {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;
        console.log(
          `[User-service] Получено сообщение с statusId=${message.statusId}, path=${message.path}`,
        );

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

        try {
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
        } catch (error) {
          console.error(
            `[User-service] Ошибка в контроллере для statusId=${message.statusId}:`,
            error,
          );
          await sendStatusUpdate(
            message.statusId,
            "error",
            null,
            (error as Error).message,
            message,
          );
          channel.ack(data);
          return;
        }

        console.log(
          `[User-service] Отправляем статус success для statusId=${message.statusId} с результатом:`,
          res.data,
        );
        await sendStatusUpdate(message.statusId, "success", res.data, null, message);

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

async function sendStatusUpdate(
  statusId: string,
  status: "pending" | "success" | "error",
  result: unknown = null,
  error: string | null = null,
  originalMessage?: RabbitMQMessage,
) {
  if (!channel) {
    console.error("[User-service] Канал RabbitMQ не инициализирован");
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
    `[User-service] Отправляем обновление статуса в очередь status-updates:`,
    updateMessage,
  );

  channel.sendToQueue("status-updates", Buffer.from(JSON.stringify(updateMessage)), {
    persistent: true,
  });
}
