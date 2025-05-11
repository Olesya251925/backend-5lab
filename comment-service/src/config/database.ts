import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

const connectDB = async () => {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error("Переменная MONGO_URI не задана в .env файле");
      }

      await mongoose.connect(process.env.MONGO_URI);
      return;
    } catch (error) {
      attempt++;
      console.error(`Ошибка подключения (попытка ${attempt}):`, (error as Error).message);

      if (attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      } else {
        console.error("Все попытки подключения исчерпаны. Завершение процесса.");
        process.exit(1);
      }
    }
  }
};

export default connectDB;
