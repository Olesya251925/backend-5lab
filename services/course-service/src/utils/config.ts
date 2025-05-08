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
  mongoURL: process.env.MONGODB_URI || "mongodb://mongodb:27017/course-service",
  queue: "course_queue",
  rabbitMQUrl: "amqp://guest:guest@rabbitmq:5672",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
