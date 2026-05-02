/**
 * Estados posibles de una empresa en el pipeline de prospección.
 * Mantenidos como string-enum para que el valor en DB sea legible
 * y para poder evolucionar con `ALTER TABLE ... CHECK` sin tocar
 * un tipo `enum` nativo de Postgres.
 */
export enum PipelineStatus {
  IN_SIGHT = 'IN_SIGHT',
  CONTACTED = 'CONTACTED',
  IN_CONVERSATION = 'IN_CONVERSATION',
  PROPOSAL = 'PROPOSAL',
  WON = 'WON',
  LOST = 'LOST',
}

export const PIPELINE_STATUSES = Object.values(PipelineStatus) as PipelineStatus[];
