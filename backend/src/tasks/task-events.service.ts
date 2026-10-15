import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class TaskEventsService {
  private readonly logger = new Logger(TaskEventsService.name);
  private readonly queue = 'task-events';

  async publish(event: Record<string, unknown>): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? 'amqp://hello:hello-change-this@localhost:5672';
    let connection: any;
    let channel: any;
    try {
      connection = await amqp.connect(url);
      channel = await connection.createChannel();
      await channel.assertQueue(this.queue, { durable: true });
      channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        contentType: 'application/json'
      });
      await channel.close();
      await connection.close();
      this.logger.log(`Published ${String(event['type'])} to ${this.queue}`);
    } catch (error) {
      this.logger.error(`RabbitMQ publish failed: ${String(error)}`);
      try { await channel?.close(); } catch {}
      try { await connection?.close(); } catch {}
      // CRUD stays available if the broker is temporarily down.
    }
  }
}
