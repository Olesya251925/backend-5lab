import * as amqp from 'amqplib';
import { config } from '../config';

interface MessageData {
  type: string;
  data: Record<string, unknown>;
}

class RabbitMQService {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitMQUrl);
      this.channel = await this.connection.createChannel();
      
      console.log('Successfully connected to RabbitMQ');

      // Обработка ошибок и переподключение
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
        this.reconnect();
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
        this.reconnect();
      });

    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error);
      this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    console.log('Attempting to reconnect to RabbitMQ...');
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Failed to reconnect to RabbitMQ:', error);
      }
    }, 5000);
  }

  async createQueue(queueName: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    await this.channel.assertQueue(queueName, {
      durable: true
    });
    console.log(`Queue ${queueName} created or already exists`);
  }

  async publishMessage(queueName: string, message: MessageData): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }
    const messageBuffer = Buffer.from(JSON.stringify(message));
    this.channel.sendToQueue(queueName, messageBuffer);
    console.log(`Message published to queue ${queueName}`);
  }

  async consumeMessages(queueName: string, callback: (message: MessageData) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.assertQueue(queueName, {
      durable: true
    });

    console.log(`Waiting for messages in queue ${queueName}`);

    this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString()) as MessageData;
          await callback(content);
          this.channel?.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // В случае ошибки, сообщение будет возвращено в очередь
          this.channel?.nack(msg);
        }
      }
    });
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}

export const rabbitMQService = new RabbitMQService(); 