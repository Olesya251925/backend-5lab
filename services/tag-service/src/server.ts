import express from "express";
import mongoose from "mongoose";
import amqp from "amqplib/callback_api";
import config from "./utils/config";
import axios from "axios";
import tagRouter from "./routes/tagRoutes";
import { setStatusRequest } from "./services/setStatusRequest";

const port = config.port;
const apiVer = config.apiVer;
const tagQueue = "tag_queue";
const dbUrl = config.mongoURL;

const app = express();

app.use(express.json());

app.use(`/${apiVer}`, tagRouter);

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

async function connectRabbitMQ() {
  let retries = 5;
  const delay = 5000;

  while (retries > 0) {
    try {
      console.log(`Attempting to connect to RabbitMQ (${6 - retries}/5)...`);

      await new Promise<void>((resolve, reject) => {
        amqp.connect(config.rabbitMQUrl, (err, conn) => {
          if (err) {
            reject(err);
            return;
          }
          connection = conn;

          connection.on("error", (err) => {
            console.error("Ошибка соединения с RabbitMQ:", err);
            connection = null;
            channel = null;
          });

          connection.on("close", () => {
            console.log("Соединение с RabbitMQ закрыто");
            connection = null;
            channel = null;
            setTimeout(() => connectRabbitMQ(), delay);
          });

          connection.createChannel((err, ch) => {
            if (err) {
              reject(err);
              return;
            }
            channel = ch;

            channel.on("error", (err) => {
              console.error("Ошибка канала RabbitMQ:", err);
              channel = null;
            });

            channel.on("close", () => {
              console.log("Канал RabbitMQ закрыт");
              channel = null;
              setTimeout(() => connectRabbitMQ(), delay);
            });

            channel.assertQueue(tagQueue, { durable: true }, (err) => {
              if (err) {
                reject(err);
                return;
              }

              console.log("[*] Waiting for messages. To exit press CTRL+C", tagQueue);

              if (!channel) {
                reject(new Error("Channel is null"));
                return;
              }

              channel.consume(
                tagQueue,
                async (msg) => {
                  if (msg && channel) {
                    try {
                      const message = JSON.parse(msg.content.toString());
                      const { requestId, path, method, body, query, headers } = message;

                      const url = `http://tag-service:${port}/${apiVer}${path}`;

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
                        if (response.status >= 200 && response.status < 300) {
                          await setStatusRequest(
                            requestId,
                            response.data,
                            "Completed",
                            "Request completed successfully",
                          );
                        } else {
                          await setStatusRequest(
                            requestId,
                            response.data,
                            `Error: ${response.status}`,
                            "An error occurred while processing the request",
                          );
                        }
                      } catch (error) {
                        console.error("Error processing message:", error);
                        await setStatusRequest(
                          requestId,
                          null,
                          "Error",
                          error instanceof Error ? error.message : "Unknown error occurred",
                        );
                      }
                      channel.ack(msg);
                    } catch (error) {
                      console.error("Error processing message:", error);
                      if (channel) {
                        channel.nack(msg, false, true);
                      }
                    }
                  }
                },
                {
                  noAck: false,
                },
              );

              console.log("Successfully connected to RabbitMQ");
              resolve();
            });
          });
        });
      });

      return connection;
    } catch (err) {
      console.log(`Connection error, retrying in ${delay / 1000} seconds...`, err);
      retries--;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error("Failed to connect to RabbitMQ after multiple attempts");
  process.exit(1);
}

const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  try {
    await mongoose.connect(dbUrl!);
    connectRabbitMQ().then(() => {
      app.listen(port, () => {
        console.log(`Tag Service запущен на порту: ${port}`);
      });
    });
  } catch (error) {
    console.error("Ошибка подключения к базе данных:", error);
    if (retryCount < maxRetries) {
      setTimeout(() => connectDB(retryCount + 1), 5000);
    } else {
      console.error("Превышено максимальное количество подключений.");
      process.exit(1);
    }
  }
};

connectDB();
