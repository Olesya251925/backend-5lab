import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3001,
  userServiceUrl: "http://user-service",
  mongoURL:
    process.env.MONGO_URL ||
    "mongodb://host.docker.internal:27017/?directConnection=true&serverSelectionTimeoutMS=2000",
  jwtKey: process.env.JWT_KEY || "olesya",
  apiVer: "api",
  rabbitMQUrl: "amqp://rabbitmq:5672",
  queue: "user_queue",
  statusServiceUrl: "http://status-service:3007/api/status",
};

export default config;
