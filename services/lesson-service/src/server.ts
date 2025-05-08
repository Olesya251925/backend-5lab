import express from "express";
import mongoose from "mongoose";
import config from "./utils/config";
import axios from "axios";
import lessonRouter from "./routes/lessonRoutes";
import { setStatusRequest } from "./services/setStatusRequest";
import { rabbitMQService } from './services/rabbitmq';
import { ConsumeMessage } from "amqplib";

const port = config.port;
const apiVer = config.apiVer;
const lessonUrl = config.lessonServiceUrl;
const lessonQueue = config.queue;
const dbUrl = config.mongoURL;

const app = express();

app.use(express.json());

app.use(`/${apiVer}`, lessonRouter);

// Инициализация RabbitMQ
const initializeRabbitMQ = async () => {
  try {
    const channel = await rabbitMQService.connect();
    await rabbitMQService.createQueue(lessonQueue);
    console.log('RabbitMQ initialized successfully');

    // Обработка сообщений
    channel.consume(
      lessonQueue,
      async (msg: ConsumeMessage | null) => {
        if (msg) {
          console.log("Received message:", msg.content.toString());
          const message = JSON.parse(msg.content.toString());
          const { requestId, path, method, body, query, headers } = message;

          const url = `${lessonUrl}:${port}/${apiVer}/${path}`;
          console.log("Processing request:", { method, url, path });

          const axiosConfig = {
            method: method,
            url: url,
            params: query,
            data: body,
            headers: headers,
            validateStatus: (status: number) => {
              return status >= 200 && status < 600;
            },
          };

          try {
            const response = await axios(axiosConfig);
            console.log("Response received:", response.status);
            if (response.status <= 300 && response.status >= 200) {
              setStatusRequest(requestId, response.data, "Completed", "Request completed successfully");
            } else {
              setStatusRequest(
                requestId,
                response.data,
                `Error: ${response.status}`,
                "An error occurred while processing the request"
              );
            }
          } catch (error) {
            console.error("Error processing request:", error);
          }
          channel.ack(msg);
        }
      },
      {
        noAck: false,
      }
    );
  } catch (error) {
    console.error('Failed to initialize RabbitMQ:', error);
    process.exit(1);
  }
};

// Подключение к MongoDB
mongoose
  .connect(dbUrl, {
    dbName: 'backend'
  })
  .then(() => {
    console.log("Connected to MongoDB");
    return initializeRabbitMQ();
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`Lesson service is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error starting service:", error);
    process.exit(1);
  });

// Обработка завершения работы
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing connections...');
  await rabbitMQService.close();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing connections...');
  await rabbitMQService.close();
  await mongoose.connection.close();
  process.exit(0);
});
