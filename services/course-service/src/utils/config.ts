import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3002,
  apiVer: "api",
  fileSize: 5 * 1024 * 1024,
  imageTypes: /\.(jpg|jpeg|png|gif)$/,
  jwtKey: process.env.JWT_KEY || "olesya",
  coursesServiceUrl: "http://courses-service",
  userServiceUrl: "http://user-service:3001/api",
  mongoURL:
    process.env.MONGO_URL ||
    "mongodb://host.docker.internal:27017/?directConnection=true&serverSelectionTimeoutMS=2000",
  queue: "course_queue",
  rabbitMQUrl: "amqp://rabbitmq:5672",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
