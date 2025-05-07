import express from 'express';
import config from './utils/config';
import userRoute from './routes/userRoutes';
import statusRoute from './routes/statusRoutes';
import coursesRoute from './routes/courseRoutes';
import tagsRoute from './routes/tagsRoutes';
import lessonRoute from './routes/lessonRoutes';
import commentRoute from './routes/commentRoutes';
import enrollmentRoute from './routes/enrollmentRoutes';
import { rabbitMQService } from './services/rabbitmq';

const app = express();
const port = config.port;

app.use(express.json());

const routes = [
	userRoute,
	statusRoute,
	coursesRoute,
	tagsRoute,
	lessonRoute,
	commentRoute,
	enrollmentRoute,
];

routes.forEach((route) => {
	app.use(`/${config.apiVer}`, route);
});

async function connectRabbitMQ() {
	try {
		console.log("Попытка подключения к RabbitMQ...");
		const channel = await rabbitMQService.connect();
		console.log("Канал RabbitMQ создан успешно");
		console.log("API Gateway подключен к RabbitMQ и готов к работе");
	} catch (error) {
		console.error("Ошибка подключения к RabbitMQ:", error);
		process.exit(1);
	}
}

connectRabbitMQ().then(() => {
	app.listen(port, () => {
		console.log(`API Gateway прослушивает порт: ${port}`);
	});
});
