import amqp from 'amqplib';

export const sendMessageToQueue = async (queueName: string, message: any): Promise<void> => {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        await channel.assertQueue(queueName, {
            durable: true
        });

        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
            persistent: true
        });

        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Ошибка при отправке сообщения в очередь:', error);
        throw error;
    }
}; 