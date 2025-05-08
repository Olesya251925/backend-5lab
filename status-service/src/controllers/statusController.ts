import { getChannel } from "../utils/rabbitmq";
import { Response } from "express";

interface Status {
  id: number;
  name: string;
  description: string;
}

const statuses: Status[] = [
  { id: 1, name: "Active", description: "Active status" },
  { id: 2, name: "Inactive", description: "Inactive status" },
];

export const setupStatusHandlers = () => {
  const channel = getChannel();

  channel.consume("status-service-requests", async (msg) => {
    if (!msg) return;

    const { action, data, correlationId } = JSON.parse(msg.content.toString());
    let response;

    try {
      switch (action) {
        case "getAllStatuses":
          response = { success: true, data: statuses };
          break;

        case "createStatus":
          const newStatus = {
            id: statuses.length + 1,
            name: data.name,
            description: data.description,
          };
          statuses.push(newStatus);
          response = { success: true, data: newStatus };
          break;

        default:
          response = { success: false, error: "Unknown action" };
      }

      // Отправляем ответ в очередь ответов
      channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(response)), {
        correlationId,
      });

      channel.ack(msg);
    } catch (error) {
      console.error("Error processing message:", error);
      channel.nack(msg);
    }
  });
};
