import express, { Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import connectDB from "./config/database";
import apiRouter from "./config/routeConfig";
import { connectQueue } from "./config/rabbitmq";
import "module-alias/register";
import "tsconfig-paths/register";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET не определен в файле .env");
  process.exit(1);
}

const app = express();

const PORT = 3002;

connectDB();
connectQueue();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRouter);

app.use((err: Error, _req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ message: "Что-то пошло не так на сервере!" });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
