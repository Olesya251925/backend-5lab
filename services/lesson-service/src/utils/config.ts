import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3004,
  apiVer: "api",
  lessonServiceUrl: "http://localhost:3004",
  userServiceUrl: "http://localhost:3001/api",
  coursesServiceUrl: "http://localhost:3002/api",
  mongoURL: process.env.MONGODB_URI || "mongodb://mongodb:27017/backend",
  queue: "lesson_queue",
  jwtKey: process.env.JWT_KEY || "olesya",
  rabbitMQUrl: "amqp://guest:guest@rabbitmq:5672",
  statusServiceUrl: "http://localhost:3007/api/status",
};

export default config;
