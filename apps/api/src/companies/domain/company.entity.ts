import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Entity = espejo 1:1 de la tabla `companies` (creada por el ETL).
 * No agregamos columnas acá: el schema canónico vive en `packages/etl/src/schema.sql`.
 */
@Entity({ name: 'companies' })
@Index(['sector'])
@Index(['departamento'])
@Index(['tamano'])
export class CompanyEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 11 })
  ruc!: string;

  @Column({ name: 'razon_social', type: 'text' })
  razonSocial!: string;

  @Column({ name: 'nombre_comercial', type: 'text', nullable: true })
  nombreComercial!: string | null;

  @Column({ name: 'indice_riesgo', type: 'text', nullable: true })
  indiceRiesgo!: string | null;

  @Column({ type: 'text', nullable: true })
  estado!: string | null;

  @Column({ type: 'text', nullable: true })
  tipo!: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'text', nullable: true })
  sector!: string | null;

  @Column({ type: 'text', nullable: true })
  macrosector!: string | null;

  @Column({ type: 'text', nullable: true })
  productos!: string | null;

  @Column({ type: 'text', nullable: true })
  tamano!: string | null;

  @Column({ type: 'text', nullable: true })
  direccion!: string | null;

  @Column({ type: 'text', nullable: true })
  distrito!: string | null;

  @Column({ type: 'text', nullable: true })
  provincia!: string | null;

  @Column({ type: 'text', nullable: true })
  departamento!: string | null;

  @Column({ name: 'telefono_1', type: 'text', nullable: true })
  telefono1!: string | null;

  @Column({ name: 'telefono_2', type: 'text', nullable: true })
  telefono2!: string | null;

  @Column({ name: 'telefono_3', type: 'text', nullable: true })
  telefono3!: string | null;

  @Column({ name: 'celular_1', type: 'text', nullable: true })
  celular1!: string | null;

  @Column({ name: 'celular_2', type: 'text', nullable: true })
  celular2!: string | null;

  @Column({ type: 'text', nullable: true })
  email!: string | null;

  @Column({ name: 'fecha_fundacion', type: 'date', nullable: true })
  fechaFundacion!: string | null;

  @Column({ type: 'int', nullable: true })
  locales!: number | null;

  @Column({ type: 'int', nullable: true })
  trabajadores!: number | null;

  @Column({ type: 'text', nullable: true })
  origen!: string | null;

  @Column({ name: 'pais_holding', type: 'text', nullable: true })
  paisHolding!: string | null;

  @Column({ type: 'boolean', nullable: true })
  estatal!: boolean | null;

  @Column({ name: 'privada_publica', type: 'text', nullable: true })
  privadaPublica!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
