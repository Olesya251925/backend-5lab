import amqp from "amqplib";

let channel: amqp.Channel;

export const connectToRabbitMQ = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq";
    console.log(`Попытка подключения к RabbitMQ по адресу: ${rabbitmqUrl}`);
    const connection = await amqp.connect(rabbitmqUrl);
    console.log("Успешно подключено к RabbitMQ");
    channel = await connection.createChannel();
    console.log("Канал успешно создан");
  } catch (error) {
    console.error("Подробная ошибка подключения к RabbitMQ:", error);
    throw error;
  }
};

export const getChannel = () => channel;
