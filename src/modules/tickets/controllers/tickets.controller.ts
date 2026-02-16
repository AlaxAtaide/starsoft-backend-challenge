import { Body, Controller, Post } from '@nestjs/common';
import { TicketsService } from '../services/tickets.service';
import { CreateSessionDto } from '../dto/create-session.dto';

@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('sessions')
  createSession(@Body() dto: CreateSessionDto) {
    return this.ticketsService.createSession(dto);
  }
}
