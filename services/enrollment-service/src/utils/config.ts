import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3006,
  apiVer: "api",
  enrollemntServiceUrl: "http://enrollment-service",
  userServiceUrl: "http://user-service:3001/api",
  courseServiceUrl: "http://courses-service:3002/api",
  lessonServiceUrl: "http://lessons-service:3004/api",
  mongoURL:
    process.env.MONGO_URL ||
    "mongodb://host.docker.internal:27017/?directConnection=true&serverSelectionTimeoutMS=2000",
  queue: "enrollment_queue",
  jwtKey: process.env.JWT_KEY || "olesya",
  rabbitMQUrl: "amqp://rabbitmq:5672",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
