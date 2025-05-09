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

export async function connectQueue() {
  try {
    console.log('🔄 Попытка подключения к RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue('tag-service');
    console.log('Подключено к RabbitMQ');
    console.log('Ожидание сообщений...');

    channel.consume('tag-service', async (data) => {
      if (data) {
        const message = JSON.parse(data.content.toString());
        console.log('📨 Получено сообщение:', JSON.stringify(message, null, 2));

        const req = {
          method: message.method,
          path: message.path,
          body: message.body,
          query: message.query || {}
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

        console.log('🔄 Обработка запроса:', {
          method: message.method,
          path: message.path,
          body: message.body,
          correlationId: message.correlationId
        });
        
        try {
          if (message.method === 'POST' && message.path === '/tags') {
            console.log('Создание тега');
            await createTag(req, res as unknown as Response, () => {});
          } else if (message.method === 'GET' && message.path === '/tags') {
            console.log('Просмотр всех тегов');
            await getTags(req, res as unknown as Response, () => {});
          } else {
            console.log('Маршрут не найден:', message.path);
            res.status(404).json({ error: 'Маршрут не найден' });
          }

          console.log('Отправка ответа:', {
            statusCode: res.statusCode,
            data: res.data,
            correlationId: message.correlationId
          });

          const response: {
            statusCode: number;
            data?: any;
            error?: string;
            correlationId: string;
          } = {
            statusCode: res.statusCode,
            data: res.data,
            correlationId: message.correlationId
          };

          if (res.statusCode >= 400) {
            response.error = res.data?.message || 'Ошибка при обработке запроса';
          }

          channel.sendToQueue(
            message.responseQueue,
            Buffer.from(JSON.stringify(response))
          );
          
          channel.ack(data);
          console.log('Сообщение обработано и подтверждено');
        } catch (error) {
          console.error('Ошибка при обработке сообщения:', error);
          channel.sendToQueue(
            message.responseQueue,
            Buffer.from(JSON.stringify({
              statusCode: 500,
              error: 'Внутренняя ошибка сервера',
              correlationId: message.correlationId
            }))
          );
          channel.ack(data);
        }
      }
    });
  } catch (error) {
    console.error('Ошибка подключения к RabbitMQ:', error);
    process.exit(1);
  }
} 