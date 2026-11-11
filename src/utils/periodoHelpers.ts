import type { Monitor, PeriodoAcademico, Practicante } from '../types'

/**
 * Resuelve el periodo activo, el periodo seleccionado en la Máquina del Tiempo
 * y si la vista actual corresponde a un ciclo pasado en modo auditoría (solo lectura).
 */
export function getPeriodoContext(
  periodos: PeriodoAcademico[] = [],
  periodoVisualizacionId?: string,
) {
  const periodoActivo =
    periodos.find((p) => p.estado === 'activo') || periodos[0]
  const visualId = periodoVisualizacionId || periodoActivo?.id || ''
  const periodoVisualizado =
    periodos.find((p) => p.id === visualId) || periodoActivo
  const esPeriodoPasado = Boolean(
    periodoVisualizado &&
      ((periodoActivo && periodoVisualizado.id !== periodoActivo.id) ||
        periodoVisualizado.estado === 'cerrado'),
  )
  return {
    periodoActivo,
    periodoVisualizado,
    periodoVisualizacionId: periodoVisualizado?.id || visualId,
    esPeriodoPasado,
  }
}

/** Verifica si un registro de practicante pertenece estrictamente al periodo indicado. */
export function perteneceAPeriodo(
  p: Pick<Practicante, 'periodo_id' | 'periodoId'>,
  periodoId: string,
  fallbackPeriodoId = 'per-2026-02',
): boolean {
  const pPeriodo = p.periodo_id || p.periodoId || fallbackPeriodoId
  return pPeriodo === periodoId
}

/** Determina si el monitor/supervisor asignado se encuentra suspendido. */
export function esSupervisorSuspendido(
  monitor?: Pick<Monitor, 'estadoGlobal' | 'estado'> | null,
): boolean {
  if (!monitor) return false
  return monitor.estadoGlobal === 'SUSPENDIDO' || monitor.estado === 'Suspendido'
}

