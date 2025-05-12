import amqp, { Channel, ConsumeMessage } from "amqplib";
import Status from "../models/status";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672";

let channel: Channel;

export async function connectQueue() {
  try {
    console.log("Попытка подключения к RabbitMQ...");
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Основная очередь для запросов статусов
    await channel.assertQueue("status-service", { durable: true });
    console.log("Очередь 'status-service' создана");

    // Очередь для обновлений статусов
    await channel.assertQueue("status-updates", { durable: true });
    console.log("Очередь 'status-updates' создана");

    console.log("Status Service успешно подключен к RabbitMQ");

    // Обработчик запросов статусов (GET /status/:statusId)
    channel.consume(
      "status-service",
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          const { method, path, correlationId, responseQueue } = content;

          if (method === "GET" && path.startsWith("/status/")) {
            const statusId = path.split("/")[2];
            const status = await Status.findOne({ statusId: statusId });

            const responsePayload = {
              statusCode: status ? 200 : 404,
              data: status || { error: "Статус не найден" },
              correlationId,
            };

            if (responseQueue) {
              channel.sendToQueue(responseQueue, Buffer.from(JSON.stringify(responsePayload)));
            }
          }

          channel.ack(msg);
        } catch (error) {
          console.error("Ошибка обработки запроса статуса:", error);
          channel.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    // Обработчик обновлений статусов
    channel.consume(
      "status-updates",
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`[Status-service] Получено сообщение с statusId=${content.statusId}`);
          console.log(`[Status-service] Данные:`, content);
          const { statusId, status, result, error } = content;

          // Обновляем статус, добавляем поля result и error при необходимости
          await Status.findOneAndUpdate(
            { statusId },
            {
              $set: {
                status,
                result,
                error,
                updatedAt: new Date(),
              },
              $push: {
                requests: {
                  method: content.method || null,
                  path: content.path || null,
                  body: content.body || null,
                  timestamp: new Date(),
                },
              },
            },
            { upsert: true, new: true },
          );

          console.log(`Статус обновлен для ${statusId}: ${status}`);
          channel.ack(msg);
        } catch (error) {
          console.error("Ошибка обновления статуса:", error);
          channel.nack(msg, false, false);
        }
      },
      { noAck: false },
    );
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error("Канал RabbitMQ не инициализирован");
  }
  return channel;
}
