import { Request, Response } from "express";
import Status from "../models/status";
import { StatusData } from "../types/status";

interface StatusResponse {
  status: string;
  data?: StatusData;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export const createStatus = async (
  req: Request,
  res: Response<{ requestId: string; statusUrl: string } | ErrorResponse>,
) => {
  try {
    const requestId = generateRequestId();

    const status = new Status({
      requestId,
      status: "pending",
    });
    await status.save();

    res.status(200).json({
      requestId,
      statusUrl: `/status/${requestId}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    res.status(500).json({ error: "Не удалось получить статус", details: message });
  }
};

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
      data: status.data as StatusData | undefined,
      error: status.error,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    res.status(500).json({ error: "Не удалось получить статус", details: message });
  }
};

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
