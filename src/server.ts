import express, { Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import connectDB from "./config/database";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import courseRoutes from "./routes/courseRoutes";
import tagRoutes from "./routes/tagRoutes";
import lessonRoutes from "./routes/lessonRoutes";
import commentRoutes from "./routes/commentRoutes";
import enrollmentRoutes from "./routes/enrollmentRoutes";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

connectDB();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/courses", courseRoutes);
app.use("/tags", tagRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/enrollments", enrollmentRoutes);

app.use((err: Error, _req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ message: "Что-то пошло не так на сервере!" });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
