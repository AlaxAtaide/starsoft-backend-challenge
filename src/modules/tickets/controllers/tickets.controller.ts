import { Body, Controller, Param, Post } from '@nestjs/common';
import { TicketsService } from '../services/tickets.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { CreateReservationDto } from '../dto/create-reservation.dto';

@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('sessions')
  createSession(@Body() dto: CreateSessionDto) {
    return this.ticketsService.createSession(dto);
  }

  @Post('sessions/:sessionId/reservations')
  createReservation(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.ticketsService.createReservation(sessionId, dto);
  }
}
