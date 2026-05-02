/**
 * Canales por los que se contactó a una empresa en pipeline.
 * Mantenido como varchar + CHECK en DB para poder ALTER sin migrar tipo.
 */
export enum InteractionType {
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  MEETING = 'MEETING',
  LINKEDIN = 'LINKEDIN',
  OTHER = 'OTHER',
}

export const INTERACTION_TYPES = Object.values(InteractionType) as InteractionType[];
