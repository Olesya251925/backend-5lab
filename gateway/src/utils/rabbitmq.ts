import * as amqp from "amqplib";

let channel: amqp.Channel | null = null;
let connection: amqp.Connection | null = null;
let isConnecting = false;

export const connectToRabbitMQ = async (retries = 5, delay = 5000): Promise<void> => {
  if (isConnecting) {
    console.log("🔄 Подключение уже в процессе...");
    return;
  }

  isConnecting = true;

  for (let i = 0; i < retries; i++) {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq";
      console.log(`\n🔄 Попытка подключения к RabbitMQ:`);
      console.log(`   URL: ${rabbitmqUrl}`);
      console.log(`   Попытка: ${i + 1}/${retries}`);

      connection = await amqp.connect(rabbitmqUrl);
      console.log("✅ Успешно подключено к RabbitMQ");

      channel = await connection.createChannel();
      console.log("✅ Канал успешно создан");

      // Настройка обработчиков событий
      connection.on("error", (err) => {
        console.error("❌ Ошибка соединения с RabbitMQ:", err);
        handleConnectionError();
      });

      connection.on("close", () => {
        console.log("⚠️ Соединение с RabbitMQ закрыто");
        handleConnectionError();
      });

      channel.on("error", (err) => {
        console.error("❌ Ошибка канала RabbitMQ:", err);
        handleChannelError();
      });

      channel.on("close", () => {
        console.log("⚠️ Канал RabbitMQ закрыт");
        handleChannelError();
      });

      isConnecting = false;
      return;
    } catch (error) {
      console.error(`❌ Ошибка подключения к RabbitMQ (попытка ${i + 1}/${retries}):`, error);

      if (i < retries - 1) {
        console.log(`⏳ Ожидание ${delay / 1000} секунд перед следующей попыткой...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        isConnecting = false;
        throw new Error(`Не удалось подключиться к RabbitMQ после ${retries} попыток`);
      }
    }
  }
};

const handleConnectionError = () => {
  channel = null;
  connection = null;
  if (!isConnecting) {
    setTimeout(() => connectToRabbitMQ(), 5000);
  }
};

const handleChannelError = () => {
  channel = null;
  if (connection && !isConnecting) {
    connection
      .createChannel()
      .then((newChannel) => {
        channel = newChannel;
        console.log("✅ Канал успешно пересоздан");
      })
      .catch((err) => {
        console.error("❌ Ошибка при пересоздании канала:", err);
        handleConnectionError();
      });
  }
};

export const getChannel = () => {
  if (!channel) {
    throw new Error("Канал RabbitMQ не инициализирован");
  }
  return channel;
};

export const isConnected = () => {
  return channel !== null && connection !== null;
};
