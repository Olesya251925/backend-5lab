import { Router } from "express";
import lessonRouter from "../routes/lessonRoutes";

const apiRouter = Router();

apiRouter.use("/lessons", lessonRouter);

export default apiRouter;
