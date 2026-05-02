import { TaskType } from '../../../tasks/domain/task-type';
import { PipelineStatus } from '../../domain/pipeline-status';

/**
 * Vista enriquecida de un PipelineEntry tal como la consume el frontend.
 *
 * Combina el entity (`pipeline_entries`) con joins de `companies` (para nombre)
 * y `tasks` (próxima acción pendiente), y renombra/deriva campos:
 *  - `lastContactAt` → `lastInteractionAt`
 *  - `lastStatusChangeAt` → `enteredStageAt`
 *  - `daysInStage` derivado en runtime.
 */
export interface PipelineEntryDto {
  id: string;
  companyRuc: string;
  companyName: string | null;
  organization: string;
  userId: string;
  status: PipelineStatus;
  valueHypothesis: string | null;
  lostReason: string | null;
  enteredAt: Date;
  enteredStageAt: Date;
  daysInStage: number;
  lastInteractionAt: Date | null;
  nextTask: NextTaskDto | null;
  company: CompanyMiniDto | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NextTaskDto {
  id: string;
  pipelineEntryId: string | null;
  description: string;
  dueAt: Date;
  type: TaskType;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  overdue: boolean;
  overdueDays: number;
  dueToday: boolean;
}

export interface CompanyMiniDto {
  ruc: string;
  razonSocial: string;
  sector: string | null;
  ciudad: string | null;
  empleados: number | null;
}
