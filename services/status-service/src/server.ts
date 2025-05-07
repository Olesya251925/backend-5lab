import express, { Request, Response } from 'express';
import amqp from 'amqplib';
import config from './utils/config';

const app = express();
const port = config.port;

interface RequestStatuses {
	[requestId: string]: {
		status: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data?: any;
		message?: string;
		error?: string;
	};
}

const requestStatuses: RequestStatuses = {};

app.use(express.json());

const connectToRabbitMQ = async () => {
	try {
		console.log('Attempting to connect to RabbitMQ...');
		const connection = await amqp.connect(config.rabbitMQUrl);
		const channel = await connection.createChannel();

		// Создаем очередь для статусов
		await channel.assertQueue('status_queue', {
			durable: true
		});

		// Обработка сообщений из очереди
		channel.consume('status_queue', (msg) => {
			if (msg) {
				const content = JSON.parse(msg.content.toString());
				const { requestId, status, data, message, error } = content;
				
				requestStatuses[requestId] = {
					status,
					data,
					message,
					error
				};

				channel.ack(msg);
			}
		});

		console.log('Successfully connected to RabbitMQ');
	} catch (error) {
		console.error('Error connecting to RabbitMQ:', error);
		// Повторная попытка подключения через 5 секунд
		setTimeout(connectToRabbitMQ, 5000);
	}
};

app.post('/api/status/:requestId', (req: Request, res: Response) => {
	const { requestId } = req.params;

	if (!requestId) {
		res.status(400).json({ message: 'Не найден id запроса' });
		return;
	}

	requestStatuses[requestId] = req.body;
	res.status(200).json({ message: 'Статус изменен' });
});

app.get('/api/status/:requestId', (req: Request, res: Response) => {
	const { requestId } = req.params;

	if (!requestStatuses[requestId]) {
		res.status(404).json({ message: 'Запрос не найден' });
		return;
	}

	res.status(200).json(requestStatuses[requestId]);
});

// Подключаемся к RabbitMQ при запуске сервиса
connectToRabbitMQ();

app.listen(port, () => {
	console.log(`Status Service Прослушивает порт: ${port}`);
});
