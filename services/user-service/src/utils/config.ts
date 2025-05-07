import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  userServiceUrl: "http://user-service",
  mongoURL: process.env.MONGODB_URI || "mongodb://mongodb:27017/backend",
  jwtKey: process.env.JWT_KEY || "olesya",
  apiVer: "api",
  rabbitMQUrl: process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672",
  queue: "user_queue",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
