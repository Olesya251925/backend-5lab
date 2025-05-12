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
  method: string;
  path: string;
  body: unknown;
  query?: Record<string, string>;
  responseQueue: string;
  correlationId: string;
}

export async function connectQueue() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue("enrollment-service");
    console.log("Подключено к RabbitMQ");

    channel.consume("enrollment-service", async (data) => {
      if (data) {
        const message = JSON.parse(data.content.toString()) as RabbitMQMessage;

        const req = {
          method: message.method,
          path: message.path,
          body: message.body,
          query: message.query || {},
          params: {},
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
          } else if (
            message.method === "POST" &&
            message.path.startsWith("/enrollments/complete/")
          ) {
            const parts = message.path.split("/");
            req.params.courseId = parts[3];
            req.params.lessonId = parts[4];
            await completeLesson(req, res as unknown as Response, next);
          } else if (
            message.method === "GET" &&
            message.path.startsWith("/enrollments/progress/")
          ) {
            const courseId = message.path.split("/")[3];
            req.params.courseId = courseId;
            await getCourseProgress(req, res as unknown as Response, next);
          } else if (message.method === "GET" && message.path.startsWith("/enrollments/count/")) {
            const courseId = message.path.split("/")[3];
            req.params.courseId = courseId;
            await countCourseEnrollments(req, res as unknown as Response, next);
          } else if (
            message.method === "DELETE" &&
            message.path.startsWith("/enrollments/cancel/")
          ) {
            const parts = message.path.split("/");
            req.params.courseId = parts[3];
            req.params.lessonId = parts[4];
            await cancelLessonCompletion(req, res as unknown as Response, next);
          } else {
            console.log("Маршрут не найден:", message.method, message.path);
            res.status(404).json({ error: "Маршрут не найден" });
          }

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
            )
          );
        } catch (error) {
          console.error("Ошибка обработки сообщения:", error);
          channel.sendToQueue(
            message.responseQueue,
            Buffer.from(
              JSON.stringify({
                statusCode: 500,
                error: "Внутренняя ошибка сервера",
                correlationId: message.correlationId,
              })
            )
          );
        }

        channel.ack(data);
      }
    });
  } catch (error) {
    console.error("Ошибка подключения к RabbitMQ:", error);
    process.exit(1);
  }
}
