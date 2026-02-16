import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SeatEntity } from '../entities/seat.entity';
import { SessionEntity } from '../entities/session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SessionEntity) private readonly sessionRepo: Repository<SessionEntity>,
    @InjectRepository(SeatEntity) private readonly seatRepo: Repository<SeatEntity>,
  ) {}

  async createSession(dto: CreateSessionDto) {
    if (!dto.movieTitle?.trim()) throw new BadRequestException('movieTitle is required');
    if (!dto.room?.trim()) throw new BadRequestException('room is required');

    const seatCount = Number(dto.seatCount);
    if (!Number.isInteger(seatCount) || seatCount < 16) {
      throw new BadRequestException('seatCount must be >= 16');
    }

    const priceCents = Number(dto.priceCents);
    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      throw new BadRequestException('priceCents must be a positive integer (cents)');
    }

    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('startsAt must be a valid ISO date string');
    }

    return this.dataSource.transaction(async (manager) => {
      const session = manager.create(SessionEntity, {
        movieTitle: dto.movieTitle.trim(),
        startsAt,
        room: dto.room.trim(),
        seatCount,
        priceCents,
      });

      const saved = await manager.save(session);

      const seats = Array.from({ length: seatCount }, (_, i) =>
        manager.create(SeatEntity, {
          sessionId: saved.id,
          number: i + 1,
          status: 'AVAILABLE',
        }),
      );

      await manager.save(seats);

      return {
        id: saved.id,
        movieTitle: saved.movieTitle,
        startsAt: saved.startsAt,
        room: saved.room,
        seatCount: saved.seatCount,
        priceCents: saved.priceCents,
      };
    });
  }
}
