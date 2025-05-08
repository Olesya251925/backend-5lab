import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3005,
  apiVer: "api",
  commentServiceUrl: "http://comments-service",
  userServiceUrl: "http://user-service:3001/api",
  mongoURL: process.env.MONGODB_URI || "mongodb://mongodb:27017/backend",
  queue: "comment_queue",
  jwtKey: process.env.JWT_KEY || "olesya",
  rabbitMQUrl: "amqp://guest:guest@rabbitmq:5672",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
