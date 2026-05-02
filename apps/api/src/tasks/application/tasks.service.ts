import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskEntity } from '../domain/task.entity';
import { TaskType } from '../domain/task-type';
import { TasksRepository } from '../infrastructure/tasks.repository';

/**
 * Patch permitido para `update`. Excluye:
 * - id, organization, userId, pipelineEntryId → claves de scoping/identidad.
 * - createdAt, updatedAt → manejados por TypeORM.
 * - completedAt → se setea via `complete()`.
 */
export interface TaskUpdatePatch {
  description?: string;
  dueAt?: Date;
  type?: TaskType;
}

const ALLOWED_UPDATE_FIELDS = ['description', 'dueAt', 'type'] as const;

@Injectable()
export class TasksService {
  constructor(private readonly repo: TasksRepository) {}

  async create(
    orgId: string,
    userId: string,
    description: string,
    dueAt: Date,
    type: TaskType,
    pipelineEntryId?: string,
  ): Promise<TaskEntity> {
    return this.repo.insert({
      organization: orgId,
      userId,
      description,
      dueAt,
      type,
      pipelineEntryId: pipelineEntryId ?? null,
      completedAt: null,
    });
  }

  /**
   * Listado "para hoy": pendientes del usuario con dueAt <= fin del día actual.
   * Incluye overdue (dueAt < hoy) por construcción.
   */
  listForToday(orgId: string, userId: string): Promise<TaskEntity[]> {
    const now = new Date();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    return this.repo.findPendingForUserUntil(orgId, userId, endOfToday);
  }

  /** Tareas asociadas a un pipeline_entry. Pendientes primero, después por dueAt. */
  listByPipelineEntry(orgId: string, pipelineEntryId: string): Promise<TaskEntity[]> {
    return this.repo.findByPipelineEntry(orgId, pipelineEntryId);
  }

  /** Próxima acción pendiente del entry — null si no hay nada pendiente. */
  getNextActionForEntry(orgId: string, pipelineEntryId: string): Promise<TaskEntity | null> {
    return this.repo.findNextPendingForEntry(orgId, pipelineEntryId);
  }

  async complete(orgId: string, id: string): Promise<TaskEntity> {
    const existing = await this.repo.findByIdAndOrganization(id, orgId);
    if (!existing) throw new NotFoundException(`Task ${id} no encontrada`);
    return this.repo.updateScoped(orgId, id, { completedAt: new Date() });
  }

  /**
   * Update parcial (description / dueAt / type).
   * Filtra silenciosamente campos no permitidos (defensa en profundidad — el controller
   * debería validar, pero el service no confía).
   */
  async update(
    orgId: string,
    id: string,
    partial: TaskUpdatePatch,
  ): Promise<TaskEntity> {
    const existing = await this.repo.findByIdAndOrganization(id, orgId);
    if (!existing) throw new NotFoundException(`Task ${id} no encontrada`);

    const sanitized: TaskUpdatePatch = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (partial[key] !== undefined) {
        // Cast necesario porque TS no puede inferir que partial[key] tiene el tipo correcto
        // para sanitized[key]. La lista ALLOWED_UPDATE_FIELDS es la fuente de verdad.
        (sanitized[key] as unknown) = partial[key];
      }
    }

    return this.repo.updateScoped(orgId, id, sanitized);
  }

  async delete(orgId: string, id: string): Promise<void> {
    const existing = await this.repo.findByIdAndOrganization(id, orgId);
    if (!existing) throw new NotFoundException(`Task ${id} no encontrada`);
    await this.repo.deleteScoped(orgId, id);
  }
}
