export const rabbitMQConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  options: {
    heartbeat: 60,
    reconnectTimeInSeconds: 5,
    maxRetries: 5
  }
}; 