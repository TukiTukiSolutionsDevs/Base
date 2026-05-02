import { Injectable } from '@nestjs/common';
import { InteractionEntity } from '../../interactions/domain/interaction.entity';
import { PipelineEntryEntity } from '../../pipeline/domain/pipeline-entry.entity';
import { TaskEntity } from '../../tasks/domain/task.entity';
import { ALERT_THRESHOLDS } from '../domain/alert-thresholds';
import { TodayRepository } from '../infrastructure/today.repository';
import {
  AlertBlockDto,
  InteractionSummaryDto,
  PipelineEntrySummaryDto,
  TaskSummaryDto,
  TodayAlertsDto,
} from './dto/today-alerts.dto';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const SAMPLE_LIMIT = 5;
const RECENT_INTERACTIONS_LIMIT = 5;

/**
 * Motor de "smart prompts" para la home.
 * Agrega múltiples queries en paralelo y arma el DTO que el frontend pinta.
 */
@Injectable()
export class TodayService {
  constructor(private readonly repo: TodayRepository) {}

  async getAlertsSummary(
    organization: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<TodayAlertsDto> {
    const [
      overdueFollowUpsRaw,
      coldProposalsRaw,
      staleEntriesRaw,
      overdueTasksRaw,
      todayMeetingsRaw,
      pipelineSnapshot,
      recentInteractionsRaw,
    ] = await Promise.all([
      this.repo.findOverdueFollowUps(organization, ALERT_THRESHOLDS.followUpOverdueDays),
      this.repo.findColdProposals(organization, ALERT_THRESHOLDS.proposalColdDays),
      this.repo.findStaleEntries(organization, ALERT_THRESHOLDS.stalenessDays),
      this.repo.findOverdueTasks(organization, userId),
      this.repo.findTodayMeetings(organization, userId),
      this.repo.pipelineSnapshot(organization),
      this.repo.recentInteractions(organization, RECENT_INTERACTIONS_LIMIT),
    ]);

    return {
      overdueFollowUps: this.buildContactBlock(overdueFollowUpsRaw, now),
      coldProposals: this.buildContactBlock(coldProposalsRaw, now),
      staleEntries: this.buildStaleBlock(staleEntriesRaw, now),
      overdueTasks: this.buildTaskBlock(overdueTasksRaw, now),
      todayMeetings: this.buildTaskBlock(todayMeetingsRaw, now),
      pipelineSnapshot,
      recentInteractions: recentInteractionsRaw.map(toInteractionSummary),
    };
  }

  // ----- Helpers de mapeo (mantenidos privados, fáciles de testear vía servicio) -----

  private buildContactBlock(
    entries: PipelineEntryEntity[],
    now: Date,
  ): AlertBlockDto<PipelineEntrySummaryDto> {
    return {
      count: entries.length,
      entries: entries.slice(0, SAMPLE_LIMIT).map((e) => ({
        ...toPipelineSummary(e),
        daysSinceContact: daysBetween(e.lastContactAt ?? e.enteredAt, now),
      })),
    };
  }

  private buildStaleBlock(
    entries: PipelineEntryEntity[],
    now: Date,
  ): AlertBlockDto<PipelineEntrySummaryDto> {
    return {
      count: entries.length,
      entries: entries.slice(0, SAMPLE_LIMIT).map((e) => ({
        ...toPipelineSummary(e),
        daysInStatus: daysBetween(e.lastStatusChangeAt, now),
      })),
    };
  }

  private buildTaskBlock(
    tasks: TaskEntity[],
    now: Date,
  ): AlertBlockDto<TaskSummaryDto> {
    return {
      count: tasks.length,
      entries: tasks.slice(0, SAMPLE_LIMIT).map((t) => ({
        id: t.id,
        pipelineEntryId: t.pipelineEntryId,
        description: t.description,
        type: t.type,
        dueAt: t.dueAt,
        daysOverdue: daysBetween(t.dueAt, now),
      })),
    };
  }
}

function toPipelineSummary(e: PipelineEntryEntity): PipelineEntrySummaryDto {
  return {
    id: e.id,
    companyRuc: e.companyRuc,
    status: e.status,
    enteredAt: e.enteredAt,
    lastContactAt: e.lastContactAt,
    lastStatusChangeAt: e.lastStatusChangeAt,
  };
}

function toInteractionSummary(i: InteractionEntity): InteractionSummaryDto {
  return {
    id: i.id,
    pipelineEntryId: i.pipelineEntryId,
    type: i.type,
    summary: i.summary,
    occurredAt: i.occurredAt,
  };
}

/** Días enteros entre dos fechas (positivo si `from` es anterior a `to`). */
function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}
