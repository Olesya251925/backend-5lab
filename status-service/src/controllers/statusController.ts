import { Request, Response } from "express";
import Status from "../models/status";

export const getStatus = async (
  req: Request<{ statusId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { statusId } = req.params;
    const status = await Status.findOne({ statusId });

    if (!status) {
      res.status(404).json({ error: "Статус не найден" });
      return;
    }

    res.json({
      statusId: status.statusId,
      requests: status.requests,
      status: status.status,
      result: status.result,
      error: status.error,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    });
  } catch (error) {
    res.status(500).json({
      error: "Ошибка сервера",
      details: (error as Error).message,
    });
  }
};
