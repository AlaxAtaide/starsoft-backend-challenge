import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  movieTitle!: string;

  @IsString()
  @IsNotEmpty()
  startsAt!: string; // ISO

  @IsString()
  @IsNotEmpty()
  room!: string;

  @IsInt()
  @Min(16)
  seatCount!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;
}
