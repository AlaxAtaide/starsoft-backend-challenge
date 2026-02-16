import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  seats!: number[];

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
