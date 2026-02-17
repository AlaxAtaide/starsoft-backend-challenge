import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './controllers/tickets.controller';
import { TicketsService } from './services/tickets.service';
import { SessionEntity } from './entities/session.entity';
import { SeatEntity } from './entities/seat.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { ReservationItemEntity } from './entities/reservation_item.entity';
import { SaleEntity } from './entities/sale.entity';
import { RabbitMQService } from './messaging/rabbitmq.service';
import { EventsConsumer } from './messaging/events.consumer';
import { ReservationExpirationJob } from './jobs/reservation-expiration.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionEntity,
      SeatEntity,
      ReservationEntity,
      ReservationItemEntity,
      SaleEntity,
    ]),
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    RabbitMQService,
    EventsConsumer,
    ReservationExpirationJob,
  ],
})
export class TicketsModule {}
