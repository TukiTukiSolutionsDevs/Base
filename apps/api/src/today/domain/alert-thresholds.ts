/**
 * Umbrales de tiempo (en días) que disparan cada tipo de alerta en la home.
 * Si en el futuro hay que hacerlas configurables por org, mover a tabla `org_settings`.
 */
export const ALERT_THRESHOLDS = {
  /** Contactada → sin nueva interacción en N días → "Mandar follow-up". */
  followUpOverdueDays: 7,

  /** Propuesta → sin nueva interacción en N días → "Hacer seguimiento". */
  proposalColdDays: 14,

  /** Status no terminal → sin cambio de estado en N días → "¿Está pausada?". */
  stalenessDays: 30,
} as const;

export type AlertThresholds = typeof ALERT_THRESHOLDS;
