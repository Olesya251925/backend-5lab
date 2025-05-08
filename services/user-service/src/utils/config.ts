import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  userServiceUrl: "http://user-service",
  mongoURL: process.env.MONGODB_URI || "mongodb://mongodb:27017/backend",
  apiVer: "api",
  rabbitMQUrl: process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672",
  queue: "user_queue",
  statusServiceUrl: "http://status-service:3007/api/status",
  JWT_SECRET: process.env.JWT_SECRET || "olesya251925"
};

if (!config.JWT_SECRET) {
  console.warn("JWT_SECRET не определен в .env, используется значение по умолчанию");
}

export default config;
