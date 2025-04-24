import express, { Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import connectDB from "./config/database";
import apiRouter from "./config/routeConfig";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

connectDB();

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
