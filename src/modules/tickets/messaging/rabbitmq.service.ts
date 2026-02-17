import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import type { Channel, Connection } from 'amqplib';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private conn!: Connection;
  private channel!: Channel;
  private readonly exchange = 'ticket.events';
  constructor(private readonly logger: PinoLogger) {}

  async onModuleInit() {
    const url = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
    this.conn = await amqp.connect(url);
    this.channel = await this.conn.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    this.logger.info({ url, exchange: this.exchange }, 'RabbitMQ connected');
  }

  async publish(routingKey: string, payload: unknown) {
    try {
      const body = Buffer.from(JSON.stringify(payload));
      const ok = this.channel.publish(this.exchange, routingKey, body, {
        contentType: 'application/json',
        persistent: true,
      });
      this.logger.debug({ routingKey, ok }, 'Event published');
    } catch (err) {
      this.logger.error({ err, routingKey }, 'Failed to publish event');
      throw err;
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.conn?.close();
      this.logger.info('RabbitMQ connection closed');
    } catch (err) {
      this.logger.warn({ err }, 'Error closing RabbitMQ');
    }
  }
}
