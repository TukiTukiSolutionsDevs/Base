import { InteractionType } from '../../../interactions/domain/interaction-type';
import { PipelineStatus } from '../../../pipeline/domain/pipeline-status';
import { TaskType } from '../../../tasks/domain/task-type';

/** Resumen plano de un PipelineEntry — solo lo que necesita la home, sin joins externos. */
export class PipelineEntrySummaryDto {
  id!: string;
  companyRuc!: string;
  status!: PipelineStatus;
  enteredAt!: Date;
  lastContactAt!: Date | null;
  lastStatusChangeAt!: Date;
  /** Días desde el último contacto (o desde enteredAt si nunca hubo contacto). */
  daysSinceContact?: number;
  /** Días desde el último cambio de status (para alertas de estancamiento). */
  daysInStatus?: number;
}

export class TaskSummaryDto {
  id!: string;
  pipelineEntryId!: string | null;
  description!: string;
  type!: TaskType;
  dueAt!: Date;
  /** Días desde la fecha de vencimiento. Negativo si futuro, positivo si vencida. */
  daysOverdue!: number;
}

export class InteractionSummaryDto {
  id!: string;
  pipelineEntryId!: string;
  type!: InteractionType;
  summary!: string;
  occurredAt!: Date;
}

export class PipelineSnapshotItemDto {
  status!: PipelineStatus;
  count!: number;
}

/** Bloque de alerta con conteo + muestra de items para mostrar en la card. */
export class AlertBlockDto<T> {
  count!: number;
  entries!: T[];
}

export class TodayAlertsDto {
  /** Empresas en CONTACTED hace +7d sin nueva interacción. */
  overdueFollowUps!: AlertBlockDto<PipelineEntrySummaryDto>;
  /** Empresas en PROPOSAL hace +14d sin nueva interacción. */
  coldProposals!: AlertBlockDto<PipelineEntrySummaryDto>;
  /** Empresas en estado activo (no WON/LOST) sin movimiento +30d. */
  staleEntries!: AlertBlockDto<PipelineEntrySummaryDto>;
  /** Tareas vencidas del usuario (dueAt < NOW, sin completar). */
  overdueTasks!: AlertBlockDto<TaskSummaryDto>;
  /** Reuniones agendadas para hoy. */
  todayMeetings!: AlertBlockDto<TaskSummaryDto>;
  /** Conteo por estado del pipeline (los 6 estados, incluso si count=0). */
  pipelineSnapshot!: PipelineSnapshotItemDto[];
  /** Últimas N interacciones de la org. */
  recentInteractions!: InteractionSummaryDto[];
}
