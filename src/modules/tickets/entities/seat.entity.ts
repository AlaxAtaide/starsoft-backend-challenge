import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SessionEntity } from './session.entity';

export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

@Entity('seats')
@Index(['sessionId', 'number'], { unique: true })
export class SeatEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => SessionEntity, (s) => s.seats, { onDelete: 'CASCADE' })
  session!: SessionEntity;

  @Column({ type: 'int' })
  number!: number; // 1..N

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  status!: SeatStatus;
}
