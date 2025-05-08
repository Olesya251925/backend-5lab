import app from './app';
import { connectToRabbitMQ, getChannel } from './utils/rabbitmq';

const PORT = process.env.PORT || 3002;

// Подключение к RabbitMQ
connectToRabbitMQ()
  .then(() => {
    console.log('✅ Status Service успешно подключен к RabbitMQ');
    
    // Создаем очередь для status service
    const channel = getChannel();
    channel.assertQueue('status-service', { durable: true });
    
    // Запускаем сервер
    app.listen(PORT, () => {
      console.log(`🚀 Status Service запущен на порту ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Ошибка подключения к RabbitMQ:', err);
    process.exit(1);
  });
