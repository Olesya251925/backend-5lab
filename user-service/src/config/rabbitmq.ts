import amqp from 'amqplib';
import { register } from '../controllers/authController';
import { Request, Response } from 'express';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

interface CustomResponse {
  statusCode: number;
  data: any;
  status: (code: number) => CustomResponse;
  json: (data: any) => CustomResponse;
}

export async function connectQueue() {
  try {
    console.log('🔄 Попытка подключения к RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue('user-service');
    console.log('✅ Подключено к RabbitMQ');
    console.log('👂 Ожидание сообщений...');

    channel.consume('user-service', async (data) => {
      if (data) {
        const message = JSON.parse(data.content.toString());
        console.log('📨 Получено сообщение:', message);

        try {
          if (message.method === 'POST' && message.path === '/auth/register') {
            const req = {
              body: message.body
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
              }
            };

            await register(req, res as unknown as Response);

            if (res.statusCode >= 400) {
              channel.sendToQueue(
                message.responseQueue,
                Buffer.from(JSON.stringify({
                  statusCode: res.statusCode,
                  error: res.data?.message || 'Ошибка при обработке запроса',
                  correlationId: message.correlationId
                }))
              );
            } else {
              channel.sendToQueue(
                message.responseQueue,
                Buffer.from(JSON.stringify({
                  statusCode: res.statusCode,
                  data: res.data,
                  correlationId: message.correlationId
                }))
              );
            }
          }
        } catch (error) {
          console.error('❌ Ошибка при обработке сообщения:', error);
          channel.sendToQueue(
            message.responseQueue,
            Buffer.from(JSON.stringify({
              statusCode: 500,
              error: 'Ошибка при обработке запроса',
              correlationId: message.correlationId
            }))
          );
        }

        channel.ack(data);
      }
    });
  } catch (error) {
    console.error('❌ Ошибка подключения к RabbitMQ:', error);
    setTimeout(connectQueue, 5000);
  }
} 