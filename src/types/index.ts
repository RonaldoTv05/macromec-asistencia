// ============================================================
// TIPOS GLOBALES — Sistema de Asistencia MACROMEC
// Refactorización v2 — Septiembre 2026
// ============================================================

// ── Roles del sistema (3 exactos) ───────────────────────────
export type Rol = 'PRACTICANTE' | 'SUPERVISOR' | 'GERENCIA'

// ── Modalidades de trabajo ───────────────────────────────────
export type Modalidad = 'presencial' | 'virtual' | 'semipresencial' | 'libre'

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
  observacion?: string
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

// ── Registro de Actividades Diarias y Auditoría ──────────────
export interface ActividadDiaria {
  id: string
  descripcion: string
  tipo: 'Macromec' | 'SENATI'
  horas: number
}

export interface VersionHistorial {
  id: string
  fechaEdicion: string
  autor: string
  accion: 'creado' | 'editado'
}

export interface RegistroDiario {
  fecha: string
  actividades: ActividadDiaria[]
  historialVersiones: VersionHistorial[]
}

// ── Módulo de Asistencia, Incidencias y Hikvision ────────────
export interface RegistroAsistencia {
  estado: 'Asistió' | 'Tardanza' | 'Falta' | 'Campo' | 'Pendiente';
  observacion?: string
  horasExtraManuales: number
  horasExtraHikvision: number
  faltaCubierta: boolean
}

// ── Practicante en el sistema ────────────────────────────────
export interface Practicante {
  id: string
  nombre: string
  apellido: string
  email: string
  fechaNacimiento?: string
  dni?: string
  tel?: string
  carrera?: string
  carreraId: string;
  semestre?: string
  monitorId: string;
  modalidadBase: Modalidad
  horasSemanalesTarget: number
  historial: RegistroDia[]
  horarioActual?: HorarioSemanal
  horarioPendiente?: HorarioSemanal
  semanasHojaFisica: SemanaFisica[]
  registrosDiarios?: Record<string, RegistroDiario>
  asistencia?: Record<string, RegistroAsistencia>
  entregaHojaFisica: boolean
  almuerzosConfirmados: string[] // fechas ISO
  estadoLaboral: EstadoLaboral
  retiro?: RetiroData
  fechaIngreso?: string
  password?: string
  hikvisionSync?: boolean
  fotoHikvision?: string
  documentos?: {
    cartaPresentacion: string | null
    evidenciaFormulario: string | null
    cartaAceptacionFirmada: string | null
    convenioFirmado: string | null
    registroVinculacion: string | null
  }
}

// ── Informes Quincenales ──────────────────────────────────────
export interface InformeQuincenal {
  id: string;
  practicanteId: string;
  fechaInicio: string; // ISO YYYY-MM-DD
  fechaFin: string; // ISO YYYY-MM-DD
  archivoPracticanteBase64: string;
  mensajePracticante?: string;
  estado: 'en_revision' | 'observado' | 'aprobado_y_firmado';
  feedbackMonitor?: string;
  archivoFirmadoBase64?: string; // Para simular la subida del PDF/IMG
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

// ── Configuración Institucional y Semestral ───────────────────
export interface MacromecConfig {
  id: string
  ruc: string
  nombreComercial: string
  correo: string
  telefono: string
  direccion: string
  fotoFachadaBase64: string
  fotoMapaBase64: string
}

export interface SemestreConfig {
  idConfig: string
  especialistaId: string
  semestres: string[]
  peaArchivo: string | null
}

export interface Carrera {
  id: string;
  nombre: string;
  especialistaNombre: string;
  configuraciones?: any[];
}

export interface Monitor {
  id: string;
  nombre: string;
  area: string;
}

export interface Especialista {
  id: string
  nombres: string
  apellidos: string
  dni: string
  correo: string
  celular: string
}

export interface Feriado {
  id: string
  fecha: string
  motivo: string
}

export interface Postulante {
  id: string
  nombres: string
  apellidos: string
  dni: string
  celular: string
  correo: string
  carreraId: string
  semestre: string
  fechaPostulacion: string
  estado: 'pendiente' | 'entrevistado'
  observaciones: string
}

export interface Semestre {
  id: string
  nombre: string
  fechaInicioPostulacion: string
  fechaFinPostulacion: string
  fechaInicioConvenio: string
  fechaFinConvenio: string
  fechaInicioPracticas: string
  fechaFinPracticas: string
  linkPostulacion: string
  feriados: Feriado[]
}

export interface PlantillaAceptacion {
  id: string
  contenidoHTML: string
}
