import express, { Request, Response } from 'express';
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

app.listen(port, () => {
	console.log(`Status Service Прослушивает порт: ${port}`);
});
