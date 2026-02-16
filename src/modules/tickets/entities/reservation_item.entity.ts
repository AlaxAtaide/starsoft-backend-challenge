import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ReservationEntity } from './reservation.entity';
import { SeatEntity } from './seat.entity';

@Entity('reservation_items')
@Index(['reservationId', 'seatId'], { unique: true })
export class ReservationItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  reservationId!: string;

  @ManyToOne(() => ReservationEntity, (r) => r.items, { onDelete: 'CASCADE' })
  reservation!: ReservationEntity;

  @Column({ type: 'uuid' })
  seatId!: string;

  @ManyToOne(() => SeatEntity, { onDelete: 'RESTRICT' })
  seat!: SeatEntity;
}
