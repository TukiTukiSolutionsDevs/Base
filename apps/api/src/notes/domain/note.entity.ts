import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Note = texto libre vinculado a un PipelineEntry.
 * Cascade ON DELETE: si la empresa sale del pipeline, sus notas desaparecen.
 */
@Entity({ name: 'notes' })
@Index('idx_notes_entry_created', ['pipelineEntryId', 'createdAt'])
export class NoteEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'pipeline_entry_id', type: 'bigint' })
  pipelineEntryId!: string;

  @Column({ type: 'varchar', length: 64 })
  organization!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
