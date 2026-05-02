import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InteractionType } from './interaction-type';

/**
 * Interaction = log puntual de contacto con una empresa en pipeline.
 * Siempre vinculada a un PipelineEntry (FK ON DELETE CASCADE).
 */
@Entity({ name: 'interactions' })
@Index('idx_interactions_entry_occurred', ['pipelineEntryId', 'occurredAt'])
export class InteractionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'pipeline_entry_id', type: 'bigint' })
  pipelineEntryId!: string;

  @Column({ type: 'varchar', length: 64 })
  organization!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: InteractionType;

  @Column({ type: 'varchar', length: 200 })
  summary!: string;

  @Column({ type: 'text', nullable: true })
  detail!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
