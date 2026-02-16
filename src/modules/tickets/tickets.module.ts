import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SeatEntity } from './entities/seat.entity';
import { SessionEntity } from './entities/session.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { ReservationItemEntity } from './entities/reservation_item.entity';
import { SaleEntity } from './entities/sale.entity';

import { TicketsController } from './controllers/tickets.controller';
import { TicketsService } from './services/tickets.service';

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
  providers: [TicketsService],
})
export class TicketsModule {}
