import express from "express";
import cors from "cors";
import statusRoutes from "./routes/statusRoutes";
import { connectQueue, getChannel } from "./config/rabbitmq";
import connectDB from "./config/database";
import Status from "./models/status";

const app = express();
const port = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    await connectDB();
    console.log("MongoDB подключен");

    await connectQueue();
    console.log("RabbitMQ подключен");

    const channel = getChannel();
    const STATUS_QUEUE = "status-service";

    await channel.assertQueue(STATUS_QUEUE, { durable: true });

    channel.consume(
      STATUS_QUEUE,
      async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            const { statusId, method, path, body, timestamp } = content;

            const existingStatus = await Status.findOne({ statusId });

            if (!existingStatus) {
              await Status.create({
                statusId,
                method,
                path,
                body,
                status: "pending",
                createdAt: new Date(timestamp),
                updatedAt: new Date(timestamp),
              });
              console.log(`Создан новый статус для ${statusId}`);
            } else {
              existingStatus.updatedAt = new Date();
              await existingStatus.save();
              console.log(`Обновлен статус updatedAt для ${statusId}`);
            }

            channel.ack(msg);
          } catch (err) {
            console.error("Ошибка обработки сообщения из очереди status-service:", err);
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false },
    );

    app.use("/status", statusRoutes);

    app.use((err: Error, req: express.Request, res: express.Response) => {
      console.error(err.stack);
      res.status(500).json({ error: "Что-то пошло не так!" });
    });

    app.listen(port, () => {
      console.log(`Сервер запущен на порту ${port}`);
    });
  } catch (error) {
    console.error("Ошибка при запуске сервера:", error);
    process.exit(1);
  }
}

startServer();

export default app;
