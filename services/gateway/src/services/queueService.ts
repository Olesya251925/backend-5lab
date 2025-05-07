import amqp, { Connection, Channel } from "amqplib";
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

let connection: Connection | null = null;
let channel: Channel | null = null;
let isConnecting = false;

const getConnection = async (): Promise<Connection> => {
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getConnection();
  }

  if (!connection) {
    isConnecting = true;
    try {
      connection = await amqp.connect(config.rabbitMQUrl);
      connection.on("error", (err: Error) => {
        console.error("Ошибка соединения с RabbitMQ:", err);
        connection = null;
        channel = null;
      });
      connection.on("close", () => {
        console.log("Соединение с RabbitMQ закрыто");
        connection = null;
        channel = null;
      });
    } catch (error) {
      console.error("Ошибка при подключении к RabbitMQ:", error);
      connection = null;
      throw error;
    } finally {
      isConnecting = false;
    }
  }

  if (!connection) {
    throw new Error("Не удалось установить соединение с RabbitMQ");
  }
  return connection;
};

const getChannel = async (): Promise<Channel> => {
  if (!channel) {
    const conn = await getConnection();
    try {
      channel = await conn.createChannel();
      await channel.confirmSelect();
      
      channel.on("error", (err: Error) => {
        console.error("Ошибка канала RabbitMQ:", err);
        channel = null;
      });
      
      channel.on("close", () => {
        console.log("Канал RabbitMQ закрыт");
        channel = null;
      });
    } catch (error) {
      console.error("Ошибка при создании канала:", error);
      channel = null;
      throw error;
    }
  }
  return channel;
};

export const sendMessageToQueue = async (
  queueName: string,
  message: QueueMessage,
): Promise<void> => {
  let retries = 3;
  while (retries > 0) {
    try {
      const ch = await getChannel();
      await ch.assertQueue(queueName, {
        durable: true,
      });

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Таймаут ожидания подтверждения доставки"));
        }, 15000);

        ch.sendToQueue(
          queueName,
          Buffer.from(JSON.stringify(message)),
          {
            persistent: true,
          },
          (err: Error | null, ok: boolean) => {
            clearTimeout(timeout);
            if (err) {
              console.error("Ошибка при отправке сообщения:", err);
              reject(err);
            } else {
              console.log(`Сообщение отправлено в очередь ${queueName}`);
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.error(`Ошибка при отправке сообщения в очередь (попытка ${4 - retries}/3):`, error);
      retries--;
      if (retries === 0) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};
