import * as dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3007,
  rabbitMQUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672'
};

export default config;
