import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SeatEntity } from './seat.entity';
import { ReservationEntity } from './reservation.entity';
import { SaleEntity } from './sale.entity';

@Entity('sessions')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  movieTitle!: string;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'varchar', length: 80 })
  room!: string;

  @Column({ type: 'int' })
  seatCount!: number;

  @Column({ type: 'int' })
  priceCents!: number;

  @OneToMany(() => SeatEntity, (s) => s.session)
  seats!: SeatEntity[];

  @OneToMany(() => ReservationEntity, (r) => r.session)
  reservations!: ReservationEntity[];

  @OneToMany(() => SaleEntity, (sale) => sale.session)
  sales!: SaleEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
