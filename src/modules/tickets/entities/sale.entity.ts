import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SessionEntity } from './session.entity';

@Entity('sales')
@Index(['userId'])
export class SaleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => SessionEntity, (s) => s.sales, { onDelete: 'CASCADE' })
  session!: SessionEntity;

  @Column({ type: 'uuid' })
  reservationId!: string;

  @Column({ type: 'varchar', length: 80 })
  userId!: string;

  @Column({ type: 'varchar', length: 80 })
  paymentId!: string;

  @Column({ type: 'int' })
  totalPriceCents!: number;

  @Column('int', { array: true })
  seatNumbers!: number[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
