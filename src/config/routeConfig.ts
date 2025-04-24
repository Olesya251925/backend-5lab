import { Router } from "express";
import authRouter from "../routes/authRoutes";
import courseRouter from "../routes/courseRoutes";
import commentRouter from "../routes/commentRoutes";
import enrollmentRouter from "../routes/enrollmentRoutes";
import lessonRouter from "../routes/lessonRoutes";
import tagRouter from "../routes/tagRoutes";
import userRouter from "../routes/userRoutes";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/courses", courseRouter);
apiRouter.use("/comments", commentRouter);
apiRouter.use("/enrollments", enrollmentRouter);
apiRouter.use("/lessons", lessonRouter);
apiRouter.use("/tags", tagRouter);
apiRouter.use("/users", userRouter);

export default apiRouter;
