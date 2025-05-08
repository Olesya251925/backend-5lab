import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3006,
  apiVer: "api",
  enrollemntServiceUrl: "http://enrollment-service",
  userServiceUrl: "http://user-service:3001/api",
  courseServiceUrl: "http://courses-service:3002/api",
  lessonServiceUrl: "http://lessons-service:3004/api",
  mongoURL: process.env.MONGODB_URI || "mongodb://mongodb:27017/enrollment-service",
  queue: "enrollment_queue",
  jwtKey: process.env.JWT_KEY || "olesya",
  rabbitMQUrl: "amqp://guest:guest@rabbitmq:5672",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
