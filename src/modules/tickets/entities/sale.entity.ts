import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SessionEntity } from './session.entity';
import { ReservationEntity } from './reservation.entity';

@Entity('sales')
@Index(['reservationId'], { unique: true })
export class SaleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => SessionEntity, (s) => s.sales, { onDelete: 'CASCADE' })
  session!: SessionEntity;

  @Column({ type: 'varchar', length: 80 })
  userId!: string;

  @Column({ type: 'uuid' })
  reservationId!: string;

  @ManyToOne(() => ReservationEntity, { onDelete: 'RESTRICT' })
  reservation!: ReservationEntity;

  @Column({ type: 'int' })
  totalCents!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
