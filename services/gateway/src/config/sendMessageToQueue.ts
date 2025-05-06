import amqp from 'amqplib';
import config from '../utils/config';

export async function sendMessageToQueue(queue: string, message: unknown) {
	try {
		const connection = await amqp.connect(config.rabbitMQUrl);
		const channel = await connection.createChannel();

		await channel.assertQueue(queue, { durable: false });
		channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));

		console.log(`[x] запрос отправлен в очередь: ${queue}`);
		await channel.close();
		await connection.close();
	} catch (error) {
		console.error('Ошибка отправления по RabbitMQ:', error);
		throw error;
	}
}