import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3004,
  apiVer: "api",
  lessonServiceUrl: "http://lessons-service",
  userServiceUrl: "http://user-service:3001/api",
  mongoURL:
    process.env.MONGO_URL ||
    "mongodb://host.docker.internal:27017/?directConnection=true&serverSelectionTimeoutMS=2000",
  queue: "lesson_queue",
  jwtKey: process.env.JWT_KEY || "olesya",
  rabbitMQUrl: "amqp://guest:guest@rabbitmq:5672",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
