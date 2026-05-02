import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PipelineStatus } from './pipeline-status';

/**
 * PipelineEntry = empresa que un usuario de una org está siguiendo.
 *
 * Multi-tenancy: scope por `organization` (varchar, mismo modelo que `users.organization`).
 * `companyRuc` es FK lógica a `companies.ruc` (no hay FK formal porque el ETL
 * puede recargar la tabla `companies` borrando filas; preservamos el seguimiento).
 *
 * Una empresa puede estar en pipeline una sola vez por organización
 * → UNIQUE (company_ruc, organization).
 */
@Entity({ name: 'pipeline_entries' })
@Unique('uq_pipeline_entries_company_org', ['companyRuc', 'organization'])
@Index('idx_pipeline_entries_org_status', ['organization', 'status'])
@Index('idx_pipeline_entries_org_lastcontact', ['organization', 'lastContactAt'])
export class PipelineEntryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'company_ruc', type: 'varchar', length: 11 })
  companyRuc!: string;

  @Column({ type: 'varchar', length: 64 })
  organization!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ type: 'varchar', length: 32, default: PipelineStatus.IN_SIGHT })
  status!: PipelineStatus;

  @Column({ name: 'value_hypothesis', type: 'text', nullable: true })
  valueHypothesis!: string | null;

  @Column({ name: 'lost_reason', type: 'text', nullable: true })
  lostReason!: string | null;

  @Column({ name: 'entered_at', type: 'timestamptz', default: () => 'NOW()' })
  enteredAt!: Date;

  @Column({ name: 'last_contact_at', type: 'timestamptz', nullable: true })
  lastContactAt!: Date | null;

  @Column({ name: 'last_status_change_at', type: 'timestamptz', default: () => 'NOW()' })
  lastStatusChangeAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
