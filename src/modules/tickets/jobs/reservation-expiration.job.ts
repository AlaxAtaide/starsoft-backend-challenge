import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { ReservationEntity } from '../entities/reservation.entity';
import { SeatEntity } from '../entities/seat.entity';
import { RabbitMQService } from '../messaging/rabbitmq.service';

@Injectable()
export class ReservationExpirationJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mq: RabbitMQService,
  ) {}

  @Cron('*/5 * * * * *') // a cada 5s
  async run() {
    await this.dataSource.transaction(async (manager) => {
      // 1) encontra reservas expiradas pendentes
      const expired = await manager
        .createQueryBuilder(ReservationEntity, 'r')
        .setLock('pessimistic_write')
        .where('r.status = :status', { status: 'PENDING' })
        .andWhere('r.expiresAt < NOW()')
        .getMany();

      if (expired.length === 0) return;

      // 2) marca como EXPIRED
      await manager
        .createQueryBuilder()
        .update(ReservationEntity)
        .set({ status: 'EXPIRED' })
        .whereInIds(expired.map((r) => r.id))
        .execute();

      // 3) libera seats
      await manager
        .createQueryBuilder()
        .update(SeatEntity)
        .set({ status: 'AVAILABLE', reservationId: null })
        .where('reservationId IN (:...ids)', { ids: expired.map((r) => r.id) })
        .execute();

      // 4) eventos
      for (const r of expired) {
        await this.mq.publish('reservation.expired', {
          reservationId: r.id,
          sessionId: r.sessionId,
          userId: r.userId,
          expiresAt: r.expiresAt,
        });
        await this.mq.publish('seat.released', {
          reservationId: r.id,
          sessionId: r.sessionId,
        });
      }
    });
  }
}
