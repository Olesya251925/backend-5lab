import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3003,
  apiVer: "api",
  tagServiceUrl: "http://tags-service",
  jwtKey: process.env.JWT_KEY || "olesya",
  mongoURL:
    process.env.MONGO_URL ||
    "mongodb://host.docker.internal:27017/?directConnection=true&serverSelectionTimeoutMS=2000",
  queue: "tag_queue",
  rabbitMQUrl: "amqp://rabbitmq:5672",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
