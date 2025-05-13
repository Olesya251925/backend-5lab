import amqp from 'amqplib';
import { createTag, getTags } from '../controllers/tagController';
import { Request, Response } from 'express';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

interface CustomResponse {
  statusCode: number;
  data: any;
  status(code: number): CustomResponse;
  json(data: any): CustomResponse;
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

    await channel.assertQueue("tag-service", { durable: true });
    await channel.assertQueue("status-updates", { durable: true });

    console.log('Подключено к RabbitMQ');

    channel.consume('tag-service', async (data) => {
      if (!data) return;

      try {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;
        console.log(
          `[Tag-service] Получено сообщение с statusId=${message.statusId}, path=${message.path}`,
        );

        const req = {
          method: message.method,
          path: message.path,
          body: message.body,
          query: message.query || {},
          params: {} as Record<string, string>,
        } as Request;

        const res: CustomResponse = {
          statusCode: 200,
          data: null,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(data: any) {
            this.data = data;
            return this;
          },
          end() {
            this.data = null;
            return this;
          }
        };

        if (message.method === 'POST' && message.path === '/tags') {
          await createTag(req, res as unknown as Response, () => {});
        } else if (message.method === 'GET' && message.path === '/tags') {
          await getTags(req, res as unknown as Response, () => {});
        } else {
          res.status(404).json({ error: 'Маршрут не найден' });
        }

        console.log(
          `[Tag-service] Отправляем статус success для statusId=${message.statusId} с результатом:`,
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
      } catch (error) {
        console.error(`[Tag-service] Ошибка в контроллере:`, error);

        let statusId = "unknown";
        let originalMessage: RabbitMQMessage | undefined;

        try {
          if (data) {
            originalMessage = JSON.parse(data.content.toString()) as RabbitMQMessage;
            statusId = originalMessage.statusId;
          }
        } catch (parseError) {
          console.warn(
            "[Tag-service] Не удалось распарсить сообщение для получения statusId:",
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
    console.error("[Tag-service] Канал RabbitMQ не инициализирован");
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
    `[Tag-service] Отправляем обновление статуса в очередь status-updates:`,
    updateMessage,
  );

  channel.sendToQueue("status-updates", Buffer.from(JSON.stringify(updateMessage)), {
    persistent: true,
  });
}
