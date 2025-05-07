import amqp from "amqplib";
import config from "../utils/config";
import { ParsedQs } from "qs";

type QueryValue = string | string[] | ParsedQs | ParsedQs[] | undefined;

interface QueueMessage {
  requestId: string;
  path: string;
  method: string;
  body: Record<string, unknown>;
  query: { [key: string]: QueryValue };
  params: Record<string, string>;
}

let connection: amqp.ChannelModel | null = null;

const getConnection = async (): Promise<amqp.ChannelModel> => {
  if (!connection) {
    try {
      connection = await amqp.connect(config.rabbitMQUrl);
      if (connection) {
        connection.on("error", (err: Error) => {
          console.error("Ошибка соединения с RabbitMQ:", err);
          connection = null;
        });
        connection.on("close", () => {
          console.log("Соединение с RabbitMQ закрыто");
          connection = null;
        });
      }
    } catch (error) {
      console.error("Ошибка при подключении к RabbitMQ:", error);
      throw error;
    }
  }
  if (!connection) {
    throw new Error("Не удалось установить соединение с RabbitMQ");
  }
  return connection;
};

export const sendMessageToQueue = async (
  queueName: string,
  message: QueueMessage,
): Promise<void> => {
  let channel: amqp.Channel | null = null;
  try {
    const conn = await getConnection();
    channel = await conn.createChannel();

    if (!channel) {
      throw new Error("Не удалось создать канал");
    }

    await channel.assertQueue(queueName, {
      durable: true,
    });

    const success = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    if (!success) {
      throw new Error("Не удалось отправить сообщение в очередь");
    }

    console.log(`Сообщение отправлено в очередь ${queueName}`);

    await new Promise<void>((resolve, reject) => {
      if (!channel) {
        reject(new Error("Канал не создан"));
        return;
      }
      const confirmPromise = new Promise<void>((resolveConfirm) => {
        const checkQueue = async () => {
          try {
            const queueInfo = await channel!.checkQueue(queueName);
            if (queueInfo.messageCount > 0) {
              console.log(`Сообщение получено в очереди ${queueName}`);
              resolveConfirm();
            } else {
              setTimeout(checkQueue, 1000);
            }
          } catch (error) {
            console.error("Ошибка при проверке очереди:", error);
            setTimeout(checkQueue, 1000);
          }
        };
        checkQueue();
      });

      const timeoutPromise = new Promise<void>((_, rejectTimeout) => {
        setTimeout(() => {
          rejectTimeout(new Error("Таймаут ожидания подтверждения доставки"));
        }, 15000);
      });
      Promise.race([confirmPromise, timeoutPromise])
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  } catch (error) {
    console.error("Ошибка при отправке сообщения в очередь:", error);
    throw error;
  } finally {
    if (channel) {
      await channel.close();
    }
  }
};
