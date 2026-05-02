import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskType } from './task-type';

/**
 * Task = recordatorio / próxima acción.
 * `pipelineEntryId` puede ser NULL → tareas libres del usuario sin empresa asociada.
 * Cuando hay pipeline_entry_id, la FK cascadea ON DELETE.
 */
@Entity({ name: 'tasks' })
@Index('idx_tasks_org_user_due', ['organization', 'userId', 'dueAt'])
@Index('idx_tasks_entry_completed', ['pipelineEntryId', 'completedAt'])
export class TaskEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'pipeline_entry_id', type: 'bigint', nullable: true })
  pipelineEntryId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  organization!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: TaskType;

  @Column({ name: 'due_at', type: 'timestamptz' })
  dueAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
