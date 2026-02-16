import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SeatEntity } from './seat.entity';
import { ReservationEntity } from './reservation.entity';
import { SaleEntity } from './sale.entity';

@Entity('sessions')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  movieTitle!: string;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'varchar', length: 100 })
  room!: string;

  @Column({ type: 'int' })
  seatCount!: number;

  @Column({ type: 'int' }) // em centavos (ex: 2500)
  priceCents!: number;

  @OneToMany(() => SeatEntity, (seat) => seat.session)
  seats!: SeatEntity[];

  @OneToMany(() => ReservationEntity, (r) => r.session)
  reservations!: ReservationEntity[];

  @OneToMany(() => SaleEntity, (s) => s.session)
  sales!: SaleEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
