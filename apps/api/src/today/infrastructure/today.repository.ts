import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionEntity } from '../../interactions/domain/interaction.entity';
import { PipelineEntryEntity } from '../../pipeline/domain/pipeline-entry.entity';
import { PipelineStatus } from '../../pipeline/domain/pipeline-status';
import { TaskEntity } from '../../tasks/domain/task.entity';
import { TaskType } from '../../tasks/domain/task-type';

/** Filas crudas de queries especializadas para la home. */
export interface PipelineSnapshotRow {
  status: PipelineStatus;
  count: number;
}

/**
 * Queries cross-module orientadas al dashboard de "Hoy".
 * Centralizamos acá para no contaminar los repos canónicos de cada módulo.
 * TODO scope por organization es OBLIGATORIO en cada método.
 */
@Injectable()
export class TodayRepository {
  constructor(
    @InjectRepository(PipelineEntryEntity)
    private readonly pipeRepo: Repository<PipelineEntryEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(InteractionEntity)
    private readonly interactionRepo: Repository<InteractionEntity>,
  ) {}

  /**
   * CONTACTED entries cuyo último contacto (o enteredAt si nunca hubo) es más viejo que `days`.
   */
  async findOverdueFollowUps(
    organization: string,
    days: number,
  ): Promise<PipelineEntryEntity[]> {
    return this.pipeRepo
      .createQueryBuilder('p')
      .where('p.organization = :organization', { organization })
      .andWhere('p.status = :status', { status: PipelineStatus.CONTACTED })
      .andWhere(
        `(
          (p.last_contact_at IS NULL AND p.entered_at < NOW() - (:days || ' days')::interval)
          OR
          (p.last_contact_at IS NOT NULL AND p.last_contact_at < NOW() - (:days || ' days')::interval)
        )`,
        { days },
      )
      .orderBy('COALESCE(p.last_contact_at, p.entered_at)', 'ASC')
      .getMany();
  }

  /**
   * PROPOSAL entries cuyo último contacto (o lastStatusChangeAt si nunca hubo) es más viejo que `days`.
   */
  async findColdProposals(
    organization: string,
    days: number,
  ): Promise<PipelineEntryEntity[]> {
    return this.pipeRepo
      .createQueryBuilder('p')
      .where('p.organization = :organization', { organization })
      .andWhere('p.status = :status', { status: PipelineStatus.PROPOSAL })
      .andWhere(
        `(
          (p.last_contact_at IS NULL AND p.last_status_change_at < NOW() - (:days || ' days')::interval)
          OR
          (p.last_contact_at IS NOT NULL AND p.last_contact_at < NOW() - (:days || ' days')::interval)
        )`,
        { days },
      )
      .orderBy('COALESCE(p.last_contact_at, p.last_status_change_at)', 'ASC')
      .getMany();
  }

  /**
   * Entries en cualquier estado activo (no WON, no LOST) cuyo lastStatusChangeAt es más viejo que `days`.
   */
  async findStaleEntries(
    organization: string,
    days: number,
  ): Promise<PipelineEntryEntity[]> {
    return this.pipeRepo
      .createQueryBuilder('p')
      .where('p.organization = :organization', { organization })
      .andWhere('p.status NOT IN (:...terminal)', {
        terminal: [PipelineStatus.WON, PipelineStatus.LOST],
      })
      .andWhere(
        `p.last_status_change_at < NOW() - (:days || ' days')::interval`,
        { days },
      )
      .orderBy('p.last_status_change_at', 'ASC')
      .getMany();
  }

  /**
   * Tareas vencidas (dueAt < NOW, sin completar) del usuario en la org.
   */
  async findOverdueTasks(
    organization: string,
    userId: string,
  ): Promise<TaskEntity[]> {
    return this.taskRepo
      .createQueryBuilder('t')
      .where('t.organization = :organization', { organization })
      .andWhere('t.user_id = :userId', { userId })
      .andWhere('t.completed_at IS NULL')
      .andWhere('t.due_at < NOW()')
      .orderBy('t.due_at', 'ASC')
      .getMany();
  }

  /**
   * Reuniones (TaskType.MEETING) del usuario que vencen HOY (00:00 ≤ dueAt ≤ 23:59:59).
   */
  async findTodayMeetings(
    organization: string,
    userId: string,
  ): Promise<TaskEntity[]> {
    return this.taskRepo
      .createQueryBuilder('t')
      .where('t.organization = :organization', { organization })
      .andWhere('t.user_id = :userId', { userId })
      .andWhere('t.type = :type', { type: TaskType.MEETING })
      .andWhere('t.completed_at IS NULL')
      .andWhere('t.due_at >= date_trunc(\'day\', NOW())')
      .andWhere('t.due_at < date_trunc(\'day\', NOW()) + INTERVAL \'1 day\'')
      .orderBy('t.due_at', 'ASC')
      .getMany();
  }

  /**
   * Conteo por estado del pipeline. Devuelve siempre los 6 (incluso con count=0).
   */
  async pipelineSnapshot(organization: string): Promise<PipelineSnapshotRow[]> {
    const rows = await this.pipeRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('p.organization = :organization', { organization })
      .groupBy('p.status')
      .getRawMany<{ status: PipelineStatus; count: string }>();

    const byStatus = new Map<PipelineStatus, number>();
    for (const r of rows) byStatus.set(r.status, Number(r.count));

    const ALL: PipelineStatus[] = [
      PipelineStatus.IN_SIGHT,
      PipelineStatus.CONTACTED,
      PipelineStatus.IN_CONVERSATION,
      PipelineStatus.PROPOSAL,
      PipelineStatus.WON,
      PipelineStatus.LOST,
    ];
    return ALL.map((status) => ({ status, count: byStatus.get(status) ?? 0 }));
  }

  /**
   * Últimas N interacciones de la organización (cualquier user, cualquier empresa).
   */
  async recentInteractions(
    organization: string,
    limit: number,
  ): Promise<InteractionEntity[]> {
    return this.interactionRepo
      .createQueryBuilder('i')
      .where('i.organization = :organization', { organization })
      .orderBy('i.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }
}
