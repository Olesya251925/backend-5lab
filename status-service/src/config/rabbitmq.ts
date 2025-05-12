import amqp from "amqplib";
import Status from "../models/status";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672";

let channel: amqp.Channel;

export async function connectQueue() {
  try {
    console.log("Попытка подключения к RabbitMQ...");
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Основная очередь для статусов
    await channel.assertQueue("status-service", { durable: true });
    console.log("Очередь 'status-service' создана");

    // Очередь для обновлений статусов
    await channel.assertQueue("status-updates", { durable: true });
    console.log("Очередь 'status-updates' создана");

    console.log("Status Service успешно подключен к RabbitMQ");

    // Обработчик запросов статусов
    channel.consume("status-service", async (msg) => {
      if (!msg) return;

      try {
        const { method, path, correlationId, responseQueue } = JSON.parse(msg.content.toString());

        if (method === "GET" && path.startsWith("/status/")) {
          const requestId = path.split("/")[2];
          const status = await Status.findOne({ requestId });

          channel.sendToQueue(
            responseQueue,
            Buffer.from(
              JSON.stringify({
                statusCode: status ? 200 : 404,
                data: status || { error: "Статус не найден" },
                correlationId,
              }),
            ),
          );
        }

        channel.ack(msg);
      } catch (error) {
        console.error("Ошибка обработки запроса статуса:", error);
        channel.nack(msg);
      }
    });

    // Обработчик обновлений статусов
    channel.consume("status-updates", async (msg) => {
      if (!msg) return;

      try {
        const { requestId, status, data, error } = JSON.parse(msg.content.toString());

        await Status.findOneAndUpdate(
          { requestId },
          { status, data, error },
          { upsert: true, new: true },
        );

        console.log(`Статус обновлен для ${requestId}: ${status}`);
        channel.ack(msg);
      } catch (error) {
        console.error("EОшибка обновления статуса:", error);
        channel.nack(msg);
      }
    });
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}

export function getChannel() {
  if (!channel) {
    throw new Error("Канал RabbitMQ не инициализирован");
  }
  return channel;
}
