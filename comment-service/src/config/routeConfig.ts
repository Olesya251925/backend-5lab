import { Router } from "express";
import commentRouter from "../routes/commentRoutes";

const apiRouter = Router();

apiRouter.use("/comments", commentRouter);

export default apiRouter;
