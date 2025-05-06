import amqp, { Channel, ChannelModel } from "amqplib";
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

let connection: ChannelModel | null = null;

const getConnection = async (): Promise<ChannelModel> => {
  if (!connection) {
    try {
      connection = await amqp.connect(config.rabbitMQUrl);
      if (connection) {
        connection.on('error', (err: Error) => {
          console.error('Ошибка соединения с RabbitMQ:', err);
          connection = null;
        });
        connection.on('close', () => {
          console.log('Соединение с RabbitMQ закрыто');
          connection = null;
        });
      }
    } catch (error) {
      console.error('Ошибка при подключении к RabbitMQ:', error);
      throw error;
    }
  }
  if (!connection) {
    throw new Error('Не удалось установить соединение с RabbitMQ');
  }
  return connection;
};

export const sendMessageToQueue = async (
  queueName: string,
  message: QueueMessage,
): Promise<void> => {
  let channel: Channel | null = null;
  try {
    const conn = await getConnection();
    channel = await conn.createChannel();

    if (!channel) {
      throw new Error('Не удалось создать канал');
    }

    await channel.assertQueue(queueName, {
      durable: true,
    });

    const success = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    if (!success) {
      throw new Error('Не удалось отправить сообщение в очередь');
    }

    // Ждем подтверждения доставки
    await new Promise<void>((resolve, reject) => {
      if (!channel) {
        reject(new Error('Канал не создан'));
        return;
      }
      
      channel.once('drain', () => {
        resolve();
      });

      setTimeout(() => {
        reject(new Error('Таймаут ожидания подтверждения доставки'));
      }, 5000);
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