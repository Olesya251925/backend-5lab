import amqp from "amqplib";

let channel: amqp.Channel;

export const connectToRabbitMQ = async () => {
  try {
  const connection = await amqp.connect("amqp://rabbitmq");
    console.log("Успешно подключено к RabbitMQ");
    
  channel = await connection.createChannel();

  await channel.assertQueue("status-service");
    console.log("Очередь 'status-service' успешно объявлена");

  channel.consume("status-service", async (msg) => {
    if (msg) {
      const { method, path, body } = JSON.parse(msg.content.toString());
        console.log(`Получено сообщение: ${method} ${path}`);

      channel.ack(msg);
        console.log("Сообщение подтверждено (ack)");
    }
  });

  } catch (error) {
    console.error("Ошибка при подключении к RabbitMQ:", error);
    throw error;
  }
};

export const getChannel = () => channel;
