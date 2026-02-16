import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SessionEntity } from './session.entity';
import { ReservationItemEntity } from './reservation_item.entity';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

@Entity('reservations')
@Index(['sessionId', 'idempotencyKey'], { unique: true })
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => SessionEntity, (s) => s.reservations, { onDelete: 'CASCADE' })
  session!: SessionEntity;

  @Column({ type: 'varchar', length: 80 })
  userId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: ReservationStatus;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @OneToMany(() => ReservationItemEntity, (i) => i.reservation, { cascade: true })
  items!: ReservationItemEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
