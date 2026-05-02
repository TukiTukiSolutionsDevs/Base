import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, IsNull, Repository } from 'typeorm';
import { TaskEntity } from '../domain/task.entity';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly repo: Repository<TaskEntity>,
  ) {}

  async findByIdAndOrganization(
    id: string,
    organization: string,
  ): Promise<TaskEntity | null> {
    return this.repo.findOne({ where: { id, organization } });
  }

  async insert(data: Partial<TaskEntity>): Promise<TaskEntity> {
    return this.repo.save(this.repo.create(data));
  }

  /** Tareas pendientes (completed_at IS NULL) del usuario con due_at <= until. */
  async findPendingForUserUntil(
    organization: string,
    userId: string,
    until: Date,
  ): Promise<TaskEntity[]> {
    return this.repo.find({
      where: {
        organization,
        userId,
        completedAt: IsNull(),
        dueAt: LessThanOrEqual(until),
      },
      order: { dueAt: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Tareas de un pipeline_entry. Pendientes primero (completed_at IS NULL ASC pone NULL al final
   * en Postgres por default → forzamos NULLS FIRST), después por due_at ASC.
   */
  async findByPipelineEntry(
    organization: string,
    pipelineEntryId: string,
  ): Promise<TaskEntity[]> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.organization = :org', { org: organization })
      .andWhere('t.pipeline_entry_id = :pid', { pid: pipelineEntryId })
      .orderBy('t.completed_at', 'ASC', 'NULLS FIRST')
      .addOrderBy('t.due_at', 'ASC')
      .addOrderBy('t.id', 'ASC')
      .getMany();
  }

  /** Próxima acción pendiente para un entry: la pendiente con due_at mínimo. */
  async findNextPendingForEntry(
    organization: string,
    pipelineEntryId: string,
  ): Promise<TaskEntity | null> {
    return this.repo.findOne({
      where: {
        organization,
        pipelineEntryId,
        completedAt: IsNull(),
      },
      order: { dueAt: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Próxima acción pendiente por entry, en bulk.
   * Usa DISTINCT ON para tomar la de menor due_at por pipeline_entry_id en una sola query.
   */
  async findNextPendingForEntries(
    organization: string,
    pipelineEntryIds: string[],
  ): Promise<TaskEntity[]> {
    if (pipelineEntryIds.length === 0) return [];
    return this.repo
      .createQueryBuilder('t')
      .distinctOn(['t.pipeline_entry_id'])
      .where('t.organization = :org', { org: organization })
      .andWhere('t.pipeline_entry_id IN (:...ids)', { ids: pipelineEntryIds })
      .andWhere('t.completed_at IS NULL')
      .orderBy('t.pipeline_entry_id', 'ASC')
      .addOrderBy('t.due_at', 'ASC')
      .addOrderBy('t.id', 'ASC')
      .getMany();
  }

  async updateScoped(
    organization: string,
    id: string,
    patch: Partial<TaskEntity>,
  ): Promise<TaskEntity> {
    await this.repo.update({ id, organization }, patch);
    const refreshed = await this.repo.findOne({ where: { id, organization } });
    if (!refreshed) {
      throw new Error(`task ${id} desapareció después del update (race?)`);
    }
    return refreshed;
  }

  async deleteScoped(organization: string, id: string): Promise<void> {
    await this.repo.delete({ id, organization });
  }
}
