export class CreateSessionDto {
  movieTitle!: string;      // "Filme X"
  startsAt!: string;        // ISO string (ex: "2026-02-14T22:00:00-03:00")
  room!: string;            // "Sala 1"
  seatCount!: number;       // mínimo 16
  priceCents!: number;      // ex: 2500
}
