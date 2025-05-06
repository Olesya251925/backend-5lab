import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { setStatusRequest } from "../services/statusService";
import { sendMessageToQueue } from "../services/queueService";
import config from "../utils/config";
import { ParsedQs } from "qs";

type QueryValue = string | string[] | ParsedQs | ParsedQs[] | undefined;

const lessonRoute = express.Router();

lessonRoute.all("/lessons*", async (req: Request, res: Response) => {
  const requestId = uuidv4();
  const path = req.originalUrl.replace("/api/lessons", "");
  const method = req.method.toLowerCase();

  try {
    if (!(await setStatusRequest(requestId, "В ожидании", "Запрос находится в очереди"))) {
      res.status(500).json({ error: "Не удалось поставить запрос в очередь" });
      return;
    }

    await sendMessageToQueue(config.lessonServiceQueue, {
      requestId,
      path,
      method,
      body: req.body,
      query: req.query as { [key: string]: QueryValue },
      params: req.params,
    });

    res.status(202).json({
      message: "Запрос принят в обработку",
      requestId,
    });
  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

export default lessonRoute;
