import { Router } from "express";
import tagRoutes from "../routes/tagRoutes";

const apiRouter = Router();

apiRouter.use("/tags", tagRoutes);

export default apiRouter;
