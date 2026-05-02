import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Contact = persona dentro de una empresa en pipeline.
 *
 * NOTA: el modelo NO tiene `userId`. Los contactos son visibles por toda la organización
 * (cualquier miembro de la org puede ver/editar contactos de las empresas en el pipeline
 * de esa org). Si en el futuro se quiere ownership por usuario, agregar la columna.
 *
 * `is_primary` tiene un UNIQUE parcial en DB: a lo sumo un contacto primary
 * por pipeline_entry (ver migration).
 */
@Entity({ name: 'contacts' })
@Index('idx_contacts_entry', ['pipelineEntryId'])
export class ContactEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'pipeline_entry_id', type: 'bigint' })
  pipelineEntryId!: string;

  @Column({ type: 'varchar', length: 64 })
  organization!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  role!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  phone!: string | null;

  @Column({ name: 'linkedin_url', type: 'varchar', length: 500, nullable: true })
  linkedinUrl!: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
