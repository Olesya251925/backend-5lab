import { Router } from "express";
import statusRouter from "../routes/statusRoutes";

const apiRouter = Router();

apiRouter.use("/status", statusRouter);

export default apiRouter;
