// ============================================================
// TIPOS GLOBALES — Sistema de Asistencia MACROMEC
// Refactorización v2 — Septiembre 2026
// ============================================================

// ── Roles del sistema (3 exactos) ───────────────────────────
export type Rol = 'PRACTICANTE' | 'SUPERVISOR' | 'GERENCIA'

// ── Modalidades de trabajo ───────────────────────────────────
export type Modalidad = 'presencial' | 'virtual' | 'libre'

// ── Estados de asistencia diaria ─────────────────────────────
export type EstadoAsistencia =
  | 'ASISTIO'
  | 'TARDANZA'
  | 'FALTA'
  | 'FALTA_CUBIERTA'
  | 'COMPENSADO'      // Antes: FALTA_CUBIERTA con comodín → ahora: Horas Extras
  | 'SEMINARIO'
  | 'CAMPO'
  | 'LIBRE'
  | 'PENDIENTE'

// ── Código de hoja de contraste ISAPI ────────────────────────
export type CodigoHoja =
  | 'P'   // Presente
  | 'T'   // Tardanza
  | 'F'   // Falta
  | 'F*'  // Falta cubierta (legacy)
  | 'HE'  // Compensado con Horas Extras
  | 'S'   // Seminario
  | 'C'   // Campo
  | 'L'   // Libre
  | '-'   // Pendiente

// ── Estado de horario semanal ────────────────────────────────
export type EstadoHorario =
  | 'borrador'
  | 'pendiente_aprobacion'
  | 'aprobado'
  | 'rechazado'

// ── Estado laboral del colaborador ───────────────────────────
export type EstadoLaboral = 'activo' | 'retirado'

// ── Día dentro del horario semanal ───────────────────────────
export interface DiaHorario {
  dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
  modalidad: Modalidad
  horaInicio: string  // "08:00"
  horaFin: string     // "17:00"
  horasCalculadas: number
}

// ── Horario semanal completo ──────────────────────────────────
export interface HorarioSemanal {
  id: string
  semana: number
  anio: number
  dias: DiaHorario[]
  totalHoras: number
  estado: EstadoHorario
  motivoRechazo?: string
  fechaEnvio?: string
}

// ── Registro de un día de asistencia ─────────────────────────
export interface RegistroDia {
  fecha: string           // "2026-09-15"
  modalidad: Modalidad
  horaIngreso?: string    // "08:04"
  horaSalida?: string
  estado: EstadoAsistencia
  codigoHoja: CodigoHoja
  fuente?: 'TERMINAL' | 'SUPERVISOR' | 'SISTEMA'
  motivoCampo?: string
  horasExtrasAplicadas?: boolean
}

// ── Semana de hoja física ────────────────────────────────────
export interface SemanaFisica {
  numero: number
  fechaInicio: string
  fechaFin: string
  firmada: boolean
  label: string
}

// ── Datos de retiro ──────────────────────────────────────────
export interface RetiroData {
  motivo: string
  fechaInicio: string
}



// ── Movimiento en el historial de Horas Extras ───────────────
export interface MovimientoHE {
  id: string
  tipo: 'acumulo' | 'deduccion'
  horas: number
  fecha: string           // fecha del movimiento
  fechaAsistencia?: string // fecha de la falta compensada
  descripcion: string
  supervisorNombre?: string
  balanceResultante: number
}

// ── Balance de Horas Extras por practicante ───────────────────
export interface ExtraHoursBalance {
  practicanteId: string
  horasDisponibles: number
  historial: MovimientoHE[]
}

// ── Practicante en el sistema ────────────────────────────────
export interface Practicante {
  id: string
  nombre: string
  apellido: string
  email: string
  dni?: string
  tel?: string
  carrera?: string
  modalidadBase: Modalidad
  horasSemanalesTarget: number
  historial: RegistroDia[]
  horarioActual?: HorarioSemanal
  horarioPendiente?: HorarioSemanal
  semanasHojaFisica: SemanaFisica[]
  entregaHojaFisica: boolean
  almuerzosConfirmados: string[] // fechas ISO
  estadoLaboral: EstadoLaboral
  retiro?: RetiroData
  fechaIngreso?: string
}

// ── Informes Quincenales ──────────────────────────────────────
export interface InformeQuincenal {
  id: string
  practicanteId: string
  documentos: string[]
  mensajePracticante: string
  estado: 'pendiente' | 'revisado'
  feedbackSupervisor?: string
}

// ── Usuario autenticado del sistema ──────────────────────────
export interface User {
  id: string
  username: string
  password: string        // Sólo para simulación local; no exponer en producción
  nombre: string          // Nombre completo
  rol: Rol
  email: string
  dni: string
  tel: string
  carrera: string         // Cargo / área
  avatarIniciales: string // Calculadas del nombre
}

// ── Toast de notificación ────────────────────────────────────
export interface ToastMessage {
  id: string
  tipo: 'exito' | 'error' | 'info' | 'advertencia'
  mensaje: string
}
