import { Router } from "express";
import enrollmenttRouter from "../routes/enrollmentRoutes";

const apiRouter = Router();

apiRouter.use("/enrollments", enrollmenttRouter);

export default apiRouter;
