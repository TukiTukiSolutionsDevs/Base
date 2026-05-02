import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PipelineEntryEntity } from '../domain/pipeline-entry.entity';
import { PipelineStatus } from '../domain/pipeline-status';

/** Filtros de listado del Pipeline (Kanban / Hoy). */
export interface PipelineFilters {
  /** Filtrar por uno o más estados. */
  status?: PipelineStatus[];
  /**
   * Solo entries cuyo `lastContactAt` es más viejo que N días
   * (o nunca se contactó y `enteredAt` es viejo). Útil para alertar "frías".
   */
  staleDays?: number;
  /**
   * Solo entries que tienen al menos una task pendiente con `due_at < NOW()`.
   * Implementado vía subquery contra la tabla `tasks` (no joineamos entidad).
   */
  withOverdueTask?: boolean;
}

/**
 * Repositorio de PipelineEntries: TODA query scopeada por `organization`.
 * Mantiene la traducción filtros → SQL acá. Service nunca arma SQL.
 */
@Injectable()
export class PipelineEntriesRepository {
  constructor(
    @InjectRepository(PipelineEntryEntity)
    private readonly repo: Repository<PipelineEntryEntity>,
  ) {}

  /** Lookup multi-tenant: nunca devolver filas de otra organización. */
  async findByIdAndOrganization(
    id: string,
    organization: string,
  ): Promise<PipelineEntryEntity | null> {
    return this.repo.findOne({ where: { id, organization } });
  }

  /** Útil para chequear UNIQUE(company_ruc, organization) antes de crear. */
  async findByCompanyRucAndOrganization(
    companyRuc: string,
    organization: string,
  ): Promise<PipelineEntryEntity | null> {
    return this.repo.findOne({ where: { companyRuc, organization } });
  }

  /** Insert nuevo entry y devuelve la fila persistida. */
  async insert(data: Partial<PipelineEntryEntity>): Promise<PipelineEntryEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  /** Lista entries de la org aplicando los filtros opcionales. */
  async findByOrgWithFilters(
    organization: string,
    filters?: PipelineFilters,
  ): Promise<PipelineEntryEntity[]> {
    const qb = this.repo.createQueryBuilder('p').where('p.organization = :organization', { organization });
    this.applyFilters(qb, filters);
    qb.orderBy('p.last_status_change_at', 'DESC').addOrderBy('p.id', 'DESC');
    return qb.getMany();
  }

  /** Update parcial scopeado por org. Devuelve el entry actualizado o null si no existía. */
  async updateScoped(
    organization: string,
    id: string,
    patch: Partial<PipelineEntryEntity>,
  ): Promise<PipelineEntryEntity> {
    await this.repo.update({ id, organization }, patch);
    const updated = await this.repo.findOne({ where: { id, organization } });
    if (!updated) {
      throw new Error(`PipelineEntry ${id} desapareció durante el update`);
    }
    return updated;
  }

  /** Borrado scopeado por org. */
  async deleteScoped(organization: string, id: string): Promise<void> {
    await this.repo.delete({ id, organization });
  }

  private applyFilters(
    qb: SelectQueryBuilder<PipelineEntryEntity>,
    f?: PipelineFilters,
  ): void {
    if (!f) return;

    if (f.status?.length) {
      qb.andWhere('p.status IN (:...status)', { status: f.status });
    }

    if (typeof f.staleDays === 'number' && f.staleDays >= 0) {
      // Stale: nunca tuvo contacto Y entró hace más de N días, o
      //        último contacto hace más de N días.
      qb.andWhere(
        `(
          (p.last_contact_at IS NULL AND p.entered_at < NOW() - (:staleDays || ' days')::interval)
          OR
          (p.last_contact_at IS NOT NULL AND p.last_contact_at < NOW() - (:staleDays || ' days')::interval)
        )`,
        { staleDays: f.staleDays },
      );
    }

    if (f.withOverdueTask === true) {
      qb.andWhere(`EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.pipeline_entry_id = p.id
          AND t.completed_at IS NULL
          AND t.due_at < NOW()
      )`);
    }
  }
}
