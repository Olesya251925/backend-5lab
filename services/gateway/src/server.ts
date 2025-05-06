import express from 'express';
import config from './utils/config';
import userRoute from './routes/userRoutes';
import statusRoute from './routes/statusRoutes';
import coursesRoute from './routes/courseRoutes';
import tagsRoute from './routes/tagsRoutes';
import lessonRoute from './routes/lessonRoutes';
import commentRoute from './routes/commentRoutes';
import enrollmentRoute from './routes/enrollmentRoutes';

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

app.listen(port, () => {
	console.log(`API Gateway прослушивает порт: ${port}`);
});
