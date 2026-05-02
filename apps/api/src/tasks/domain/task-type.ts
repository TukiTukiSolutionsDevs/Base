/**
 * Tipo de tarea / próxima acción.
 * Coincide parcialmente con InteractionType pero NO se reutiliza:
 * una task incluye RESEARCH (no es un canal de contacto) y excluye LINKEDIN
 * (LinkedIn es canal de comunicación, no una tarea per se).
 */
export enum TaskType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  RESEARCH = 'RESEARCH',
  OTHER = 'OTHER',
}

export const TASK_TYPES = Object.values(TaskType) as TaskType[];
