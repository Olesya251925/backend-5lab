import amqp, { Connection, Channel } from "amqplib/callback_api";
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return getConnection();
  }

  if (!connection) {
    isConnecting = true;
    try {
      const conn = await new Promise<Connection>((resolve, reject) => {
        amqp.connect(config.rabbitMQUrl, (err, conn) => {
          if (err) {
            reject(err);
          } else {
            resolve(conn);
          }
        });
      });

      connection = conn;

      if (connection) {
        connection.on("error", (err: Error) => {
          console.error("Ошибка соединения с RabbitMQ:", err);
          connection = null;
          channel = null;
        });

        connection.on("close", () => {
          console.log("Соединение с RabbitMQ закрыто");
          connection = null;
          channel = null;
          setTimeout(() => getConnection(), 5000);
        });
      }
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
      const ch = await new Promise<Channel>((resolve, reject) => {
        conn.createChannel((err, ch) => {
          if (err) {
            reject(err);
          } else {
            resolve(ch);
          }
        });
      });

      channel = ch;

      if (channel) {
        // No need for confirmSelect in callback API as it's automatically handled
        // by the sendToQueue method with the persistent flag

        channel.on("error", (err: Error) => {
          console.error("Ошибка канала RabbitMQ:", err);
          channel = null;
        });

        channel.on("close", () => {
          console.log("Канал RabbitMQ закрыт");
          channel = null;
          setTimeout(() => getChannel(), 5000);
        });
      }
    } catch (error) {
      console.error("Ошибка при создании канала:", error);
      channel = null;
      throw error;
    }
  }

  if (!channel) {
    throw new Error("Не удалось создать канал RabbitMQ");
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
      await new Promise<void>((resolve, reject) => {
        ch.assertQueue(queueName, { durable: false }, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Таймаут ожидания подтверждения доставки"));
        }, 15000);

        const sent = ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
          persistent: false,
        });

        if (!sent) {
          clearTimeout(timeout);
          reject(new Error("Очередь заполнена"));
          return;
        }

        ch.once("drain", () => {
          clearTimeout(timeout);
          console.log(`Сообщение отправлено в очередь ${queueName}`);
          resolve();
        });

        ch.once("error", (err: Error) => {
          clearTimeout(timeout);
          console.error("Ошибка при отправке сообщения:", err);
          reject(err);
        });
      });
    } catch (error) {
      console.error(`Ошибка при отправке сообщения в очередь (попытка ${4 - retries}/3):`, error);
      retries--;
      if (retries === 0) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};
