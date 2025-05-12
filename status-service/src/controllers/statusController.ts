import { Request, Response } from "express";
import Status from "../models/status";

interface StatusResponse {
  status: string;
  data?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export const getStatus = async (
  req: Request<{ id: string }>,
  res: Response<StatusResponse | ErrorResponse>,
) => {
  try {
    const { id } = req.params;
    const status = await Status.findOne({ requestId: id });

    if (!status) {
      return res.status(404).json({ error: "Статус не найден" });
    }

    res.json({
      status: status.status,
      data: status.data,
      error: status.error,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    res.status(500).json({ error: "Не удалось получить статус", details: message });
  }
};
