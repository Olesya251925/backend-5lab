import amqp, { ChannelModel, Channel } from 'amqplib';

const rabbitMQConfig = {
  url: 'amqp://guest:guest@rabbitmq:5672',
  options: {
    heartbeat: 60,
    reconnectTimeInSeconds: 5
  }
};

class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  public async connect(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    if (this.isConnecting) {
      throw new Error('Connection attempt already in progress');
    }

    this.isConnecting = true;

    try {
      console.log('Connecting to RabbitMQ...');
      this.connection = await amqp.connect(rabbitMQConfig.url);
      
      if (this.connection) {
        this.channel = await this.connection.createChannel();
        console.log('Successfully connected to RabbitMQ');

        this.connection.on('error', (err) => {
          console.error('RabbitMQ connection error:', err);
          this.handleDisconnect();
        });

        this.connection.on('close', () => {
          console.log('RabbitMQ connection closed');
          this.handleDisconnect();
        });
      }

      this.isConnecting = false;
      
      if (!this.channel) {
        throw new Error('Failed to create channel');
      }
      
      return this.channel;
    } catch (error) {
      this.isConnecting = false;
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  private handleDisconnect() {
    this.connection = null;
    this.channel = null;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Failed to reconnect to RabbitMQ:', error);
      }
    }, rabbitMQConfig.options.reconnectTimeInSeconds * 1000);
  }

  public async createQueue(queueName: string, options = { durable: false }): Promise<void> {
    const channel = await this.connect();
    await channel.assertQueue(queueName, options);
    console.log(`Queue ${queueName} created successfully`);
  }

  public async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }
}

export const rabbitMQService = RabbitMQService.getInstance(); 