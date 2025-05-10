import { Router } from "express";
import courseRouter from "../routes/courseRoutes";

const apiRouter = Router();

apiRouter.use("/courses", courseRouter);

export default apiRouter;
