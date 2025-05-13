import amqp from "amqplib";
import {
  enrollInCourse,
  getCourseProgress,
  countCourseEnrollments,
  cancelLessonCompletion,
  completeLesson,
} from "../controllers/enrollmentController";
import { Request, Response } from "express";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672";

interface CustomResponse {
  statusCode: number;
  data: unknown;
  status(code: number): CustomResponse;
  json(data: unknown): CustomResponse;
  end(): CustomResponse;
}

interface RabbitMQMessage {
  statusId: string;
  method: string;
  path: string;
  body: unknown;
  query?: Record<string, string>;
  responseQueue: string;
  correlationId: string;
}

let channel: amqp.Channel;

export async function connectQueue() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue("enrollment-service", { durable: true });
    await channel.assertQueue("status-updates", { durable: true });

    console.log("Подключено к RabbitMQ");

    channel.consume("enrollment-service", async (data) => {
      if (!data) return;

      let message: RabbitMQMessage;

      try {
        message = JSON.parse(data.content.toString()) as RabbitMQMessage;
      } catch (parseError) {
        console.error("[Enrollment-service] Ошибка парсинга сообщения:", parseError);
        channel.ack(data);
        return;
      }

      await sendStatusUpdate(message.statusId, "pending", null, null, message);

      const req = {
        method: message.method,
        path: message.path,
        body: message.body,
        query: message.query || {},
        params: {} as Record<string, string>,
      } as Request;

      const next = () => {};

      const res: CustomResponse = {
        statusCode: 200,
        data: null,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: unknown) {
          this.data = data;
          return this;
        },
        end() {
          this.data = null;
          return this;
        },
      };

      try {
        if (message.method === "POST" && message.path.startsWith("/enrollments/enroll/")) {
          const courseId = message.path.split("/")[3];
          req.params.courseId = courseId;
          await enrollInCourse(req, res as unknown as Response, next);
        } else if (message.method === "POST" && message.path.startsWith("/enrollments/complete/")) {
          const parts = message.path.split("/");
          req.params.courseId = parts[3];
          req.params.lessonId = parts[4];
          await completeLesson(req, res as unknown as Response, next);
        } else if (message.method === "GET" && message.path.startsWith("/enrollments/progress/")) {
          const courseId = message.path.split("/")[3];
          req.params.courseId = courseId;
          await getCourseProgress(req, res as unknown as Response, next);
        } else if (message.method === "GET" && message.path.startsWith("/enrollments/count/")) {
          const courseId = message.path.split("/")[3];
          req.params.courseId = courseId;
          await countCourseEnrollments(req, res as unknown as Response, next);
        } else if (message.method === "DELETE" && message.path.startsWith("/enrollments/cancel/")) {
          const parts = message.path.split("/");
          req.params.courseId = parts[3];
          req.params.lessonId = parts[4];
          await cancelLessonCompletion(req, res as unknown as Response, next);
        } else {
          console.log("[Enrollment-service] Маршрут не найден:", message.method, message.path);
          res.status(404).json({ error: "Маршрут не найден" });
        }

        await sendStatusUpdate(message.statusId, "success", res.data, null, message);

        channel.sendToQueue(
          message.responseQueue,
          Buffer.from(
            JSON.stringify({
              statusCode: res.statusCode,
              data: res.data,
              error:
                res.statusCode >= 400
                  ? (res.data as { message?: string })?.message || "Ошибка при обработке запроса"
                  : undefined,
              correlationId: message.correlationId,
            })
          ),
          { persistent: true }
        );

        channel.ack(data);
      } catch (error) {
        console.error(
          `[Enrollment-service] Ошибка в контроллере для statusId=${message.statusId}:`,
          error
        );

        // Отправляем статус error
        await sendStatusUpdate(message.statusId, "error", null, (error as Error).message, message);

        // Отправляем ошибку в очередь ответа
        channel.sendToQueue(
          message.responseQueue,
          Buffer.from(
            JSON.stringify({
              statusCode: 500,
              error: (error as Error).message || "Внутренняя ошибка сервиса",
              correlationId: message.correlationId,
            })
          ),
          { persistent: true }
        );

        channel.ack(data);
      }
    });
  } catch (error) {
    console.error("[Enrollment-service] Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}

async function sendStatusUpdate(
  statusId: string,
  status: "pending" | "success" | "error",
  result: unknown = null,
  error: string | null = null,
  originalMessage?: RabbitMQMessage
) {
  if (!channel) {
    console.error("[Enrollment-service] Канал RabbitMQ не инициализирован");
    return;
  }

  const updateMessage = {
    statusId,
    status,
    result,
    error,
    method: originalMessage?.method,
    path: originalMessage?.path,
    body: originalMessage?.body,
    timestamp: new Date().toISOString(),
  };

  console.log(
    "[Enrollment-service] Отправляем обновление статуса в очередь status-updates:",
    updateMessage
  );

  channel.sendToQueue("status-updates", Buffer.from(JSON.stringify(updateMessage)), {
    persistent: true,
  });
}
