import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InteractionEntity } from '../domain/interaction.entity';
import { InteractionType } from '../domain/interaction-type';
import { InteractionsRepository } from '../infrastructure/interactions.repository';
import { PipelineEntryEntity } from '../../pipeline/domain/pipeline-entry.entity';
import { PipelineStatus } from '../../pipeline/domain/pipeline-status';

/**
 * InteractionsService.
 *
 * Acoplamiento con pipeline:
 * - Crear interaction puede afectar al pipeline_entry padre (last_contact_at, status).
 * - Para garantizar consistencia (interaction creada ↔ pipeline actualizado), todo el
 *   flujo de `create` y `delete` corre dentro de una transacción TypeORM
 *   (`DataSource.transaction`). Manejo dentro del manager, sin tocar repos cross-module.
 *
 * Multi-tenancy: scope siempre por `orgId` (sale de `req.user.organization`).
 */
@Injectable()
export class InteractionsService {
  constructor(
    private readonly repo: InteractionsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea una interaction y propaga al pipeline_entry padre.
   *
   * Reglas:
   * - `occurredAt` default = NOW.
   * - pipeline_entries.last_contact_at = MAX(actual, occurredAt).
   * - Si `promoteToContacted` && status === IN_SIGHT → status = CONTACTED + lastStatusChangeAt = NOW.
   * - Todo en una sola transacción.
   */
  async create(
    orgId: string,
    userId: string,
    pipelineEntryId: string,
    type: InteractionType,
    summary: string,
    detail?: string,
    occurredAt?: Date,
    promoteToContacted?: boolean,
  ): Promise<InteractionEntity> {
    const occurred = occurredAt ?? new Date();

    return this.dataSource.transaction(async (manager) => {
      const pipelineRepo = manager.getRepository(PipelineEntryEntity);
      const interactionRepo = manager.getRepository(InteractionEntity);

      const entry = await pipelineRepo.findOne({
        where: { id: pipelineEntryId, organization: orgId },
      });
      if (!entry) {
        throw new NotFoundException(
          `Pipeline entry ${pipelineEntryId} no encontrado en la organización`,
        );
      }

      const interaction = await interactionRepo.save(
        interactionRepo.create({
          pipelineEntryId,
          organization: orgId,
          userId,
          type,
          summary,
          detail: detail ?? null,
          occurredAt: occurred,
        }),
      );

      // last_contact_at = MAX(actual, occurredAt)
      const newLastContact =
        !entry.lastContactAt || occurred > entry.lastContactAt ? occurred : entry.lastContactAt;

      const patch: Partial<PipelineEntryEntity> = { lastContactAt: newLastContact };
      if (promoteToContacted && entry.status === PipelineStatus.IN_SIGHT) {
        patch.status = PipelineStatus.CONTACTED;
        patch.lastStatusChangeAt = new Date();
      }

      await pipelineRepo.update({ id: pipelineEntryId, organization: orgId }, patch);

      return interaction;
    });
  }

  /** Listado scopeado por pipeline_entry. DESC por occurredAt. */
  listByPipelineEntry(orgId: string, pipelineEntryId: string): Promise<InteractionEntity[]> {
    return this.repo.findByPipelineEntry(orgId, pipelineEntryId);
  }

  /**
   * Borra una interaction y recalcula last_contact_at del parent.
   * Si no quedan interactions, last_contact_at = NULL.
   */
  async delete(orgId: string, id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const interactionRepo = manager.getRepository(InteractionEntity);
      const pipelineRepo = manager.getRepository(PipelineEntryEntity);

      const target = await interactionRepo.findOne({ where: { id, organization: orgId } });
      if (!target) {
        throw new NotFoundException(`Interaction ${id} no encontrada en la organización`);
      }

      const pipelineEntryId = target.pipelineEntryId;
      await interactionRepo.delete({ id, organization: orgId });

      // Recalcular last_contact_at del parent
      const latest = await interactionRepo.findOne({
        where: { organization: orgId, pipelineEntryId },
        order: { occurredAt: 'DESC', id: 'DESC' },
      });

      await pipelineRepo.update(
        { id: pipelineEntryId, organization: orgId },
        { lastContactAt: latest?.occurredAt ?? null },
      );
    });
  }
}
