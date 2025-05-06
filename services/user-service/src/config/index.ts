export const config = {
  port: process.env.PORT || 3001,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq:5672',
    queue: 'user-service',
  },
}; 