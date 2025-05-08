import amqp from "amqplib";

let channel: amqp.Channel;

export const connectToRabbitMQ = async () => {
  try {
    console.log("🔄 Попытка подключения к RabbitMQ...");
    const connection = await amqp.connect("amqp://rabbitmq");
    console.log("✅ Успешно подключено к RabbitMQ");
    
    channel = await connection.createChannel();
    console.log("✅ Канал RabbitMQ успешно создан");

    await channel.assertQueue("user-service");
    console.log("✅ Очередь 'user-service' успешно объявлена");

    channel.consume("user-service", async (msg) => {
      if (msg) {
        const { action, data } = JSON.parse(msg.content.toString());
        console.log(`📨 Получено сообщение: ${action}`);

        channel.ack(msg);
        console.log("✅ Сообщение подтверждено (ack)");
      }
    });

    console.log("👂 Начато прослушивание очереди 'user-service'");
  } catch (error) {
    console.error("❌ Ошибка при подключении к RabbitMQ:", error);
    throw error;
  }
};

export const getChannel = () => channel;
