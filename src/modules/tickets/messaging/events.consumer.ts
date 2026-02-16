import { Injectable, OnModuleInit } from '@nestjs/common';
import amqp from 'amqplib';

@Injectable()
export class EventsConsumer implements OnModuleInit {
  async onModuleInit() {
    const url = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
    const conn = await amqp.connect(url);
    const ch = await conn.createChannel();

    const exchange = 'ticket.events';
    await ch.assertExchange(exchange, 'topic', { durable: true });

    const q = await ch.assertQueue('ticket.events.audit', { durable: true });
    await ch.bindQueue(q.queue, exchange, 'reservation.*');
    await ch.bindQueue(q.queue, exchange, 'payment.*');

    ch.consume(q.queue, (msg) => {
      if (!msg) return;
      // exemplo simples (em prod você processaria de verdade)
      const content = msg.content.toString('utf-8');
      // eslint-disable-next-line no-console
      console.log('[EVENT]', msg.fields.routingKey, content);
      ch.ack(msg);
    });
  }
}
