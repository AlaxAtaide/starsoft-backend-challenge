import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { CreateSessionDto } from '../dto/create-session.dto';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { SessionEntity } from '../entities/session.entity';
import { SeatEntity } from '../entities/seat.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import { ReservationItemEntity } from '../entities/reservation_item.entity';
import { SaleEntity } from '../entities/sale.entity';
import { RabbitMQService } from '../messaging/rabbitmq.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mq: RabbitMQService,
  ) {}

  private ttlSeconds(): number {
    const n = Number(process.env.RESERVATION_TTL_SECONDS ?? '30');
    return Number.isFinite(n) && n > 0 ? n : 30;
  }

  async createSession(dto: CreateSessionDto) {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('startsAt must be a valid ISO date');
    }

    return this.dataSource.transaction(async (manager) => {
      const session = manager.create(SessionEntity, {
        movieTitle: dto.movieTitle.trim(),
        startsAt,
        room: dto.room.trim(),
        seatCount: dto.seatCount,
        priceCents: dto.priceCents,
      });

      await manager.save(session);

      const seats = Array.from({ length: session.seatCount }, (_, i) =>
        manager.create(SeatEntity, {
          sessionId: session.id,
          number: i + 1,
          status: 'AVAILABLE',
          reservationId: null,
        }),
      );
      await manager.save(seats);

      return {
        id: session.id,
        movieTitle: session.movieTitle,
        startsAt: session.startsAt,
        room: session.room,
        seatCount: session.seatCount,
        priceCents: session.priceCents,
      };
    });
  }

  async getAvailability(sessionId: string) {
    const session = await this.dataSource.getRepository(SessionEntity).findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const seats = await this.dataSource.getRepository(SeatEntity).find({
      where: { sessionId },
      order: { number: 'ASC' },
    });

    const summary = seats.reduce(
      (acc, s) => {
        acc[s.status] += 1;
        return acc;
      },
      { AVAILABLE: 0, RESERVED: 0, SOLD: 0 } as Record<'AVAILABLE' | 'RESERVED' | 'SOLD', number>,
    );

    return {
      sessionId,
      movieTitle: session.movieTitle,
      startsAt: session.startsAt,
      room: session.room,
      seatCount: session.seatCount,
      summary,
      seats: seats.map((s) => ({ number: s.number, status: s.status })),
    };
  }

  async createReservation(sessionId: string, dto: CreateReservationDto) {
    // normalize / remove duplicados
    const requestedSeats = Array.from(new Set(dto.seats.map((n) => Number(n))));

    // Evita deadlock: sempre trava na mesma ordem
    requestedSeats.sort((a, b) => a - b);

    return this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(SessionEntity, { where: { id: sessionId } });
      if (!session) throw new NotFoundException('Session not found');

      // range
      for (const n of requestedSeats) {
        if (!Number.isInteger(n) || n < 1 || n > session.seatCount) {
          throw new BadRequestException(`Invalid seat number: ${n}`);
        }
      }

      // idempotência (por sessão)
      if (dto.idempotencyKey) {
        const existing = await manager.findOne(ReservationEntity, {
          where: { sessionId, idempotencyKey: dto.idempotencyKey },
          relations: { items: true },
        });

        if (existing) {
          return {
            id: existing.id,
            status: existing.status,
            expiresAt: existing.expiresAt,
            seats: existing.items?.map((i) => i.seatNumber) ?? [],
          };
        }
      }

      // trava os seats (FOR UPDATE)
      const seats = await manager
        .createQueryBuilder(SeatEntity, 'seat')
        .setLock('pessimistic_write')
        .where('seat.sessionId = :sessionId', { sessionId })
        .andWhere('seat.number IN (:...numbers)', { numbers: requestedSeats })
        .orderBy('seat.number', 'ASC')
        .getMany();

      if (seats.length !== requestedSeats.length) {
        throw new BadRequestException('Seats not initialized for this session');
      }

      // se algum ocupado, falha
      for (const s of seats) {
        if (s.status === 'SOLD') throw new ConflictException(`Seat ${s.number} already sold`);
        if (s.status === 'RESERVED') throw new ConflictException(`Seat ${s.number} is reserved`);
      }

      const expiresAt = new Date(Date.now() + this.ttlSeconds() * 1000);

      const reservation = manager.create(ReservationEntity, {
        sessionId,
        userId: dto.userId,
        status: 'PENDING',
        expiresAt,
        idempotencyKey: dto.idempotencyKey ?? null,
      });
      await manager.save(reservation);

      const items = seats.map((s) =>
        manager.create(ReservationItemEntity, {
          reservationId: reservation.id,
          seatId: s.id,
          seatNumber: s.number,
        }),
      );
      await manager.save(items);

      await manager.update(
        SeatEntity,
        { id: In(seats.map((s) => s.id)) },
        { status: 'RESERVED', reservationId: reservation.id },
      );

      await this.mq.publish('reservation.created', {
        reservationId: reservation.id,
        sessionId,
        userId: dto.userId,
        seats: requestedSeats,
        expiresAt,
      });

      return {
        id: reservation.id,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
        seats: requestedSeats,
      };
    });
  }

  async confirmPayment(reservationId: string, dto: ConfirmPaymentDto) {
    return this.dataSource.transaction(async (manager) => {
      // trava a reserva
      const reservation = await manager
        .createQueryBuilder(ReservationEntity, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id: reservationId })
        .getOne();

      if (!reservation) throw new NotFoundException('Reservation not found');

      if (reservation.userId !== dto.userId) {
        throw new ConflictException('Reservation does not belong to this user');
      }

      // já confirmada? idempotência do pagamento
      if (reservation.status === 'CONFIRMED') {
        const sale = await manager.findOne(SaleEntity, { where: { reservationId: reservation.id } });
        return { status: 'CONFIRMED', saleId: sale?.id ?? null };
      }

      // expirou?
      if (reservation.status !== 'PENDING') {
        throw new ConflictException(`Reservation is ${reservation.status}`);
      }
      if (reservation.expiresAt.getTime() < Date.now()) {
        // marca expirado e libera seats aqui mesmo
        reservation.status = 'EXPIRED';
        await manager.save(reservation);
        await manager
          .createQueryBuilder()
          .update(SeatEntity)
          .set({ status: 'AVAILABLE', reservationId: null })
          .where('reservationId = :rid', { rid: reservation.id })
          .execute();

        await this.mq.publish('reservation.expired', { reservationId: reservation.id });
        await this.mq.publish('seat.released', { reservationId: reservation.id });

        throw new ConflictException('Reservation expired');
      }

      // pega itens
      const items = await manager.find(ReservationItemEntity, {
        where: { reservationId: reservation.id },
      });
      if (items.length === 0) throw new ConflictException('Reservation has no items');

      // trava seats envolvidos
      const seatIds = items.map((i) => i.seatId);
      const seats = await manager
        .createQueryBuilder(SeatEntity, 'seat')
        .setLock('pessimistic_write')
        .where('seat.id IN (:...ids)', { ids: seatIds })
        .orderBy('seat.number', 'ASC')
        .getMany();

      // valida ainda RESERVED pela reserva
      for (const s of seats) {
        if (s.status === 'SOLD') throw new ConflictException(`Seat ${s.number} already sold`);
        if (s.reservationId !== reservation.id) throw new ConflictException(`Seat ${s.number} not reserved by this reservation`);
      }

      // marca reserva confirmada
      reservation.status = 'CONFIRMED';
      await manager.save(reservation);

      // marca seats SOLD
      await manager.update(
        SeatEntity,
        { id: In(seatIds) },
        { status: 'SOLD' },
      );

      // cria venda
      const session = await manager.findOne(SessionEntity, { where: { id: reservation.sessionId } });
      if (!session) throw new NotFoundException('Session not found');

      const sale = manager.create(SaleEntity, {
        sessionId: reservation.sessionId,
        reservationId: reservation.id,
        userId: reservation.userId,
        paymentId: dto.paymentId,
        totalCents: session.priceCents * items.length,
      });
      await manager.save(sale);

      await this.mq.publish('payment.confirmed', {
        saleId: sale.id,
        reservationId: reservation.id,
        sessionId: reservation.sessionId,
        userId: reservation.userId,
        seatNumbers: items.map((i) => i.seatNumber),
        totalCents: sale.totalCents,
      });

      return {
        saleId: sale.id,
        status: 'CONFIRMED',
        totalCents: sale.totalCents,
      };
    });
  }

  async getPurchases(userId: string, limit = 50) {
    const sales = await this.dataSource.getRepository(SaleEntity).find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return {
      userId,
      count: sales.length,
      sales: sales.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        reservationId: s.reservationId,
        paymentId: s.paymentId,
        totalCents: s.totalCents,
        createdAt: s.createdAt,
      })),
    };
  }
}
