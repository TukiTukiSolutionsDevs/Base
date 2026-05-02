/* TUKI · Tipos compartidos espejo de los DTOs del backend NestJS. */

/* ---------- Pipeline ---------- */
export type PipelineStatus =
  | 'IN_SIGHT'
  | 'CONTACTED'
  | 'IN_CONVERSATION'
  | 'PROPOSAL'
  | 'WON'
  | 'LOST';

export interface PipelineEntry {
  id: string;
  companyRuc: string;
  companyName?: string;
  status: PipelineStatus;
  valueHypothesis: string | null;
  lostReason: string | null;
  enteredStageAt: string;
  daysInStage: number;
  lastInteractionAt: string | null;
  nextTask?: TaskItem | null;
  createdAt: string;
  updatedAt: string;
  /* Campos opcionales que el backend puede o no devolver, mantengo el JSX cómodo */
  company?: {
    ruc: string;
    razonSocial: string;
    sector?: string | null;
    ciudad?: string | null;
    empleados?: number | null;
  };
}

export interface CreatePipelineEntryPayload {
  companyRuc: string;
  valueHypothesis?: string;
}

export interface UpdatePipelineStatusPayload {
  status: PipelineStatus;
  lostReason?: string;
}

/* ---------- Interactions ---------- */
export type InteractionType = 'EMAIL' | 'CALL' | 'MEETING' | 'LINKEDIN' | 'OTHER';

export interface Interaction {
  id: string;
  pipelineEntryId: string;
  type: InteractionType;
  summary: string;
  detail: string | null;
  occurredAt: string;
  authorUsername?: string | null;
  createdAt: string;
}

export interface CreateInteractionPayload {
  type: InteractionType;
  summary: string;
  detail?: string;
  occurredAt?: string;
  promoteToContacted?: boolean;
}

/* ---------- Tasks ---------- */
export type TaskType = 'CALL' | 'EMAIL' | 'MEETING' | 'RESEARCH' | 'OTHER';

export interface TaskItem {
  id: string;
  description: string;
  dueAt: string;
  type: TaskType;
  completed: boolean;
  completedAt: string | null;
  pipelineEntryId: string | null;
  pipelineEntry?: PipelineEntry | null;
  createdAt: string;
  /* derivados que el backend puede traer */
  overdue?: boolean;
  overdueDays?: number;
  dueToday?: boolean;
}

export interface CreateTaskPayload {
  description: string;
  dueAt: string;
  type: TaskType;
  pipelineEntryId?: string;
}

export interface UpdateTaskPayload {
  description?: string;
  dueAt?: string;
  type?: TaskType;
  completed?: boolean;
}

/* ---------- Notes ---------- */
export interface Note {
  id: string;
  pipelineEntryId: string;
  body: string;
  authorUsername?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Contacts ---------- */
export interface Contact {
  id: string;
  pipelineEntryId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface CreateContactPayload {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  isPrimary?: boolean;
}

/* ---------- Today / Smart prompts ---------- */
export interface TodayAlertEntry {
  pipelineEntryId: string;
  companyName: string;
  companyRuc: string;
  daysSinceLastInteraction?: number;
  daysInStage?: number;
  status: PipelineStatus;
}

export interface TodayPipelineSnapshot {
  status: PipelineStatus;
  count: number;
}

export interface TodayRecentInteraction {
  id: string;
  type: InteractionType;
  summary: string;
  occurredAt: string;
  pipelineEntryId: string;
  companyName: string;
}

export interface TodayMeeting {
  taskId: string;
  description: string;
  dueAt: string;
  pipelineEntryId: string | null;
  companyName?: string | null;
}

export interface TodayAlerts {
  overdueFollowUps: TodayAlertEntry[];
  coldProposals: TodayAlertEntry[];
  staleEntries: TodayAlertEntry[];
  overdueTasks: TaskItem[];
  todayMeetings: TodayMeeting[];
  pipelineSnapshot: TodayPipelineSnapshot[];
  recentInteractions: TodayRecentInteraction[];
}

/* ---------- Pipeline stages metadata (UI) ---------- */
export interface StageMeta {
  id: PipelineStatus;
  label: string;
  description: string;
  /* legacy id para compatibilidad con el JSX original */
  legacyId: 'lead' | 'contacted' | 'talking' | 'proposal' | 'won' | 'lost';
}

export const PIPELINE_STAGES: ReadonlyArray<StageMeta> = [
  { id: 'IN_SIGHT',        legacyId: 'lead',      label: 'En la mira',     description: 'Identificada, sin contacto' },
  { id: 'CONTACTED',       legacyId: 'contacted', label: 'Contactada',     description: 'Primer outreach hecho' },
  { id: 'IN_CONVERSATION', legacyId: 'talking',   label: 'En conversación', description: 'Diálogo activo' },
  { id: 'PROPOSAL',        legacyId: 'proposal',  label: 'Propuesta',      description: 'Cotización enviada' },
  { id: 'WON',             legacyId: 'won',       label: 'Ganada',         description: 'Cuenta cerrada · ✓' },
  { id: 'LOST',            legacyId: 'lost',      label: 'Perdida',        description: 'Cuenta caída · ✗' },
];

export const STAGE_BY_ID: Record<PipelineStatus, StageMeta> = PIPELINE_STAGES.reduce(
  (acc, s) => { acc[s.id] = s; return acc; },
  {} as Record<PipelineStatus, StageMeta>,
);
