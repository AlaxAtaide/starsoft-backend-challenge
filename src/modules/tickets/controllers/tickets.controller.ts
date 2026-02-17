import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { TicketsService } from '../services/tickets.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';

@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('sessions')
  createSession(@Body() dto: CreateSessionDto) {
    return this.ticketsService.createSession(dto);
  }

  @Get('sessions/:sessionId/seats')
  getAvailability(@Param('sessionId', new ParseUUIDPipe()) sessionId: string) {
    return this.ticketsService.getAvailability(sessionId);
  }

  @Post('sessions/:sessionId/reservations')
  createReservation(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.ticketsService.createReservation(sessionId, dto);
  }

  @Post('reservations/:reservationId/confirm-payment')
  confirmPayment(
    @Param('reservationId', new ParseUUIDPipe()) reservationId: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.ticketsService.confirmPayment(reservationId, dto);
  }

  @Get('reservations/:reservationId')
  getReservation(
    @Param('reservationId', new ParseUUIDPipe()) reservationId: string,
  ) {
    return this.ticketsService.getReservation(reservationId);
  }

  @Get('users/:userId/purchases')
  getPurchases(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.getPurchases(userId, limit ? Number(limit) : 50);
  }
}
