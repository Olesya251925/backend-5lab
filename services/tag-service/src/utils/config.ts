import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3003,
  apiVer: "api",
  tagServiceUrl: "http://tag-service",
  jwtKey: process.env.JWT_KEY || "olesya",
  mongoURL: process.env.MONGODB_URI || "mongodb://mongodb:27017/tag-service",
  queue: "tag_queue",
  rabbitMQUrl: "amqp://guest:guest@rabbitmq:5672",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
