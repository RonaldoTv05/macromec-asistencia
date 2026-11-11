import { sumarDosMeses } from '../utils/dateUtils';
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  EXTRA_HOURS_BALANCES,
  MOCK_PRACTICANTES,
  USUARIOS_SISTEMA,
  MOCK_MACROMEC_CONFIG,
  MOCK_CARRERAS,
  MOCK_ESPECIALISTAS,
  MOCK_SEMESTRES,
  MOCK_PLANTILLA,
  MOCK_MONITORES,
  MOCK_PERIODOS,
  MOCK_POSTULANTES,
} from '../data/mockData'
import type {
  DiaHorario,
  EstadoAsistencia,
  EstadoLaboral,
  ExtraHoursBalance,
  HorarioSemanal,
  InformeQuincenal,
  Practicante,
  Rol,
  RetiroData,
  User,
  MacromecConfig,
  Carrera,
  Especialista,
  Semestre,
  PlantillaAceptacion,
  SemestreConfig,
  Postulante,
  Monitor,
  DatosEmpresa,
  ActividadDiaria,
  RegistroActividadDiaria,
  VersionHistorial,
  EstadoHE,
  PeriodoAcademico,
  EstadoPeriodo,
  EstadoGlobalPracticante,
  EstadoGlobalMonitor,
  ModalidadBase,
  PerfilUsuarioLive,
  TipoUsuarioPerfil,
} from '../types'

// ============================================================
// HELPERS PUROS DE VALIDACIÓN DE HORAS EXTRAS (HE)
// ============================================================

/**
 * Determina si una fecha específica tiene Horas Extras propuestas por el supervisor
 * pendientes de validación/revisión por el Administrador.
 * Condición estricta: (horasExtrasPropuestas > 0) AND (heRevisadas === false)
 */
export function tieneHePendienteEnDia(
  p: Practicante,
  fecha: string,
  actividadesDiarias: RegistroActividadDiaria[] = []
): boolean {
  const asis = p.asistencia?.[fecha];
  const reg = p.registrosDiarios?.[fecha];
  const act = actividadesDiarias.find(
    (a) => a.id === `${p.id}_${fecha}` || (a.practicanteId === p.id && a.fecha === fecha)
  );

  // Si cualquiera de las capas registró explícitamente heRevisadas: true, la alerta ya fue cerrada
  if (asis?.heRevisadas === true || reg?.heRevisadas === true || act?.heRevisadas === true) {
    return false;
  }

  const horasExtrasPropuestas =
    act?.horasExtrasPropuestas ??
    asis?.horasExtrasPropuestas ??
    asis?.horasExtraSupervisor ??
    reg?.horasExtrasPropuestas ??
    reg?.horasExtras ??
    reg?.heSupervisor ??
    0;

  if (horasExtrasPropuestas <= 0) return false;

  const heRevisadas =
    asis?.heRevisadas ??
    reg?.heRevisadas ??
    act?.heRevisadas ??
    (asis?.hePendienteValidacion === false ? true : false);

  return horasExtrasPropuestas > 0 && heRevisadas === false;
}

export function tieneHePendienteGlobal(
  p: Practicante,
  actividadesDiarias: RegistroActividadDiaria[] = []
): boolean {
  const fechas = new Set<string>([
    ...Object.keys(p.asistencia || {}),
    ...Object.keys(p.registrosDiarios || {}),
    ...actividadesDiarias.filter((a) => a.practicanteId === p.id).map((a) => a.fecha),
  ]);
  for (const fecha of fechas) {
    if (tieneHePendienteEnDia(p, fecha, actividadesDiarias)) {
      return true;
    }
  }
  return false;
}

// ============================================================
// TIPOS DE TABS POR ROL
// ============================================================

export type Tab =
  | 'hoy'
  | 'horarios'
  | 'general'   // SUPERVISOR: matriz mensual interactiva
  | 'control'   // SUPERVISOR: contraste + almuerzos (legacy)
  | 'reportes'  // GERENCIA: consolidado semanal
  | 'admin'     // GERENCIA: gestión de personal

// ============================================================
// INTERFACE DEL STORE
// ============================================================

interface AppState {
  // ── Auth ─────────────────────────────────────────────────
  usuarioActual: any | null
  usuariosSistema: User[]
  login: (dni: string, pass: string) => boolean | string
  logout: () => void
  getUsuarioById: (id: string) => PerfilUsuarioLive | undefined
  actualizarMiPerfil: (
    id: string,
    tipoUsuario: TipoUsuarioPerfil,
    nuevosDatos: {
      nombres?: string
      nombre?: string
      apellido?: string
      correo?: string
      email?: string
      telefono?: string
      tel?: string
      celular?: string
      fechaNacimiento?: string
    },
  ) => void
  adminEditarUsuario: (
    id: string,
    tipoUsuario: TipoUsuarioPerfil,
    nuevosDatos: {
      nombres?: string
      nombre?: string
      apellido?: string
      dni?: string
      password?: string
      carrera?: string
      carreraId?: string
      modalidad?: ModalidadBase
      modalidadBase?: ModalidadBase
      telefono?: string
      tel?: string
      celular?: string
      correo?: string
      email?: string
      fechaNacimiento?: string
    },
  ) => void
  updatePerfil: (data: Partial<Omit<User, 'id' | 'username' | 'rol'>>) => void
  addUsuario: (usuario: User) => void
  generarCredenciales: (practicanteId: string) => void
  sincronizarHikvision: (payload: { dni: string, fecha: string, horaEntrada: string, horaSalida: string, turnoFin: string }) => void
  uploadDocumento: (practicanteId: string, docKey: string, fileName: string) => void

  // ── Rol activo (derivado de usuarioActual) ────────────────
  rolActivo: Rol | null

  // ── Tab activa ────────────────────────────────────────────
  tabActiva: Tab
  setTabActiva: (tab: Tab) => void

  // ── Practicantes ──────────────────────────────────────────
  practicantes: Practicante[]
  addPracticante: (practicante: Practicante) => void
  getPracticante: (id: string) => Practicante | undefined

  // Practicante seleccionado (para supervisor/admin)
  practicanteSeleccionadoId: string
  setPracticanteSeleccionadoId: (id: string) => void

  asignarMonitor: (practicanteId: string, monitorId: string) => void
  removerMonitor: (practicanteId: string) => void
  cambiarEstadoSupervisor: (supervisorId: string, nuevoEstado: 'Activo' | 'Suspendido', motivo?: string) => void

  // ── Horario semanal ───────────────────────────────────────
  // Guardar y enviar horario (practicante)
  enviarHorario: (practicanteId: string, dias: DiaHorario[]) => void

  // Cancelar envío pendiente (practicante vuelve a editar)
  cancelarHorario: (practicanteId: string) => void

  // Acumular horas extras por excedente declarado
  acumularHorasExtras: (
    practicanteId: string,
    horas: number,
    descripcion: string,
  ) => void

  // Aprobar / rechazar horario (supervisor)
  aprobarHorario: (practicanteId: string) => void
  rechazarHorario: (practicanteId: string, motivo: string) => void

  // ── Asistencia ────────────────────────────────────────────
  // Marcar asistencia virtual (supervisor)
  marcarAsistencia: (
    practicanteId: string,
    fecha: string,
    estado: EstadoAsistencia,
  ) => void
  marcarAsistenciaRapida: (
    practicanteId: string,
    fechaISO: string,
    estado: EstadoAsistencia,
  ) => void

  // Cambiar modalidad del día actual (presencial ↔ virtual)
  cambiarModalidadHoy: (
    practicanteId: string,
    modalidad: import('../types').Modalidad,
  ) => void

  // Registrar día de campo (supervisor)
  registrarCampo: (
    practicanteId: string,
    fecha: string,
    motivo: string,
  ) => void

  // ── Horas Extras ──────────────────────────────────────────
  extraHoursBalances: ExtraHoursBalance[]
  getExtraHoursBalance: (practicanteId: string) => ExtraHoursBalance | undefined

  // Actualizar asistencia de un día específico (wrapper semántico)
  actualizarAsistenciaDia: (
    practicanteId: string,
    fecha: string,
    nuevoEstado: EstadoAsistencia,
    motivo?: string,
  ) => void

  // Actualizar asistencia + modalidad del día (desde modal de General)
  actualizarAsistenciaDiaConModalidad: (
    practicanteId: string,
    fecha: string,
    nuevoEstado: EstadoAsistencia,
    modalidad: import('../types').Modalidad,
  ) => void

  // Compensar una falta con horas extras configurables (default 5h)
  compensarFaltaConHE: (
    practicanteId: string,
    fecha: string,
    horasACompensar?: number,
  ) => boolean

  // Compensar una falta con horas extras (deduce 6h) — LEGACY
  compensarConHorasExtras: (
    practicanteId: string,
    fecha: string,
    supervisorNombre: string,
  ) => boolean

  setEstadoLaboral: (
    practicanteId: string,
    estado: EstadoLaboral,
    datos?: { retiro?: RetiroData },
  ) => void

  // ── Hoja Física ───────────────────────────────────────────
  toggleEntregaHoja: (practicanteId: string) => void
  toggleSemanaFirmada: (practicanteId: string, semanaNumero: number) => void

  // ── Almuerzos ─────────────────────────────────────────────
  confirmarAlmuerzo: (practicanteId: string, fecha: string) => void

  // ── Informes Quincenales ──────────────────────────────────────────
  informesQuincenales: InformeQuincenal[]
  enviarInformeQuincenal: (informe: {
    practicanteId?: string;
    fechaInicio: string;
    fechaFin: string;
    archivoPracticanteBase64: string;
    nombreArchivo?: string;
    tipoMime?: string;
    mensajePracticante?: string;
  }) => void
  aceptarInformeQuincenal: (informeId: string, feedback: string) => void
  procesarInformeMonitor: (
    informeId: string,
    nuevoEstado: 'observado' | 'aprobado_y_firmado',
    feedback: string,
    archivoFirmado?: string,
    nombreArchivoFirmado?: string,
    tipoMimeFirmado?: string
  ) => void
  archivarInformeQuincenal: (informeId: string, archivado?: boolean) => void
  eliminarInformeQuincenal: (informeId: string) => void

  // ── Periodos Académicos (Motor ERP & Máquina del Tiempo) ────────
  periodos: PeriodoAcademico[]
  periodoVisualizacionId: string
  setPeriodoVisualizacionId: (id: string) => void
  getPeriodoActivo: () => PeriodoAcademico | undefined
  crearPeriodoBorrador: (payload: { nombre: string; fechaInicio: string; fechaFin: string; clonarRoles?: boolean }) => void
  lanzarNuevoPeriodo: (payload: {
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    promociones: Record<string, 'promover' | 'egresar' | 'retirado'>;
    supervisores?: Record<string, string>;
    clonarRoles?: boolean;
  }) => void
  cerrarPeriodo: (periodoId: string) => void

  // ── Postulaciones (RF-13) ─────────────────────────────────────────
  postulaciones: Postulante[]
  addPostulacion: (postulante: Postulante) => void
  updatePostulacion: (id: string, data: Partial<Postulante>) => void
  removePostulacion: (id: string) => void

  // ── Registro Diario de Actividades ────────────────────────────────
  actividadesDiarias: RegistroActividadDiaria[]
  getActividadesDia: (practicanteId: string, fecha: string) => RegistroActividadDiaria | undefined
  guardarRegistroDiario: (practicanteId: string, fecha: string, actividades: ActividadDiaria[], nombreAutor: string, horasExtras?: number) => void

  // ── Módulo de Asistencia, Incidencias y Hikvision ─────────────────
  borradorDiario: Record<string, import('../types').EstadoAsistencia>
  mostrarAlertasFaltantes: boolean
  marcarBorrador: (practicanteId: string, estado: import('../types').EstadoAsistencia) => void
  setMostrarAlertasFaltantes: (valor: boolean) => void
  confirmarLoteDiario: (
    fechaISO: string,
    observaciones: { id: string; observacion: string }[]
  ) => void
  registrarIncidencia: (practicanteId: string, fecha: string, datos: Partial<import('../types').RegistroAsistencia>) => void
  cubrirFaltaConComodin: (practicanteId: string, fecha: string) => void
  evaluarTardanzas: (practicanteId: string) => void

  // ── Configuración Institucional y Semestral ───────────────────
  datosEmpresa: DatosEmpresa
  actualizarDatosEmpresa: (nuevosDatos: Partial<DatosEmpresa>) => void

  macromecConfig: MacromecConfig
  carreras: Carrera[]
  especialistas: Especialista[]
  semestres: Semestre[]
  plantillaAceptacion: PlantillaAceptacion
  monitores: Monitor[]

  getEspecialistaAsignado: (carreraId: string, semestre: string) => Especialista | undefined

  updateMacromecConfig: (config: Partial<MacromecConfig>) => void
  addCarrera: (carrera: Carrera) => void
  updateCarrera: (id: string, data: Partial<Carrera>) => void
  addEspecialista: (especialista: Especialista) => void
  updateEspecialista: (id: string, data: Partial<Especialista>) => void
  deleteEspecialista: (id: string) => void
  addSemestre: (semestre: Semestre) => void
  updateSemestre: (id: string, semestre: Partial<Semestre>) => void
  updateSemestreCalendario: (datos: Partial<Semestre>) => void
  agregarFeriado: (fecha: string, motivo: string) => void
  eliminarFeriado: (id: string) => void
  updatePlantilla: (plantilla: Partial<PlantillaAceptacion>) => void
  isConvocatoriaAbierta: () => boolean
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
export const enviarCredencialesWhatsApp = async (celular: string, nombre: string, pass: string, rol: string) => {
  return new Promise((resolve) => setTimeout(resolve, 1500));
};

function sanitizeTextField(value?: string): string {
  return (value ?? '').replace(/<[^>]*>/g, '').trim();
}

function splitNombresCompleto(nombresCompleto: string): { nombre: string; apellido: string } {
  const clean = sanitizeTextField(nombresCompleto).replace(/\s+/g, ' ');
  if (!clean) return { nombre: '', apellido: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  if (parts.length === 2) return { nombre: parts[0], apellido: parts[1] };
  const mid = Math.ceil(parts.length / 2);
  return {
    nombre: parts.slice(0, mid).join(' '),
    apellido: parts.slice(mid).join(' '),
  };
}

function calcAvatarIniciales(nombres: string): string {
  const clean = sanitizeTextField(nombres).replace(/\s+/g, ' ');
  if (!clean) return 'US';
  return clean
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase();
}

export function normalizarTelefonoPeru(telefono?: string): string {
  const raw = (telefono || '').trim();
  const digits = raw.replace(/\D+/g, '');
  if (digits.startsWith('51') && digits.length > 9) {
    return digits.slice(2);
  }
  return digits || raw.replace(/\s+/g, '');
}

export function abrirWhatsAppCredenciales(usuario: {
  nombres: string
  dni: string
  password?: string
  telefono?: string
}) {
  const mensaje = `Hola ${usuario.nombres}, tus credenciales de acceso al Sistema MACROMEC han sido actualizadas.\n\n👤 Usuario: ${usuario.dni}\n🔑 Contraseña: ${usuario.password || usuario.dni}\n\nIngresa al sistema para continuar con tus actividades.`;
  const encodedMensaje = encodeURIComponent(mensaje);
  const telefonoLocal = normalizarTelefonoPeru(usuario.telefono);
  window.open(`https://wa.me/51${telefonoLocal}?text=${encodedMensaje}`, '_blank');
}

// ============================================================
// STORE (Preparación para NestJS & PostgreSQL)
// ============================================================
//
// 📌 ARQUITECTURA DE MIGRACIÓN:
// Las entidades `Carrera`, `Especialista` y la tabla pivote `AsignacionCarreraEspecialista`
// formarán una relación Many-to-Many o One-to-Many en NestJS usando TypeORM.
//
// Entity (NestJS):
// @Entity('asignaciones_especialistas')
// export class AsignacionEntity {
//    @PrimaryGeneratedColumn('uuid') id: string;
//    @ManyToOne(() => CarreraEntity, c => c.asignaciones) carrera: CarreraEntity;
//    @ManyToOne(() => EspecialistaEntity, e => e.asignaciones) especialista: EspecialistaEntity;
//    @Column('simple-array') semestres: string[];
// }
//
// DTOs (NestJS): CreateAsignacionDto y UpdateAsignacionDto
// validarán la inserción de arreglos de semestres permitidos (ej. `enum: ['S4','S5','S6']`).
// ============================================================

export const LOGIN_ALERT_SUSPENDIDO =
  'Su cuenta está suspendida por inactividad/retiro. Si crees que fue un error contáctese con el Admin (número: +51 979 134 594).'

export const LOGIN_ALERT_EGRESADO =
  '🎉 ¡Felicidades! Has concluido con éxito tus prácticas en este periodo. Tu expediente está archivado. Te deseamos éxito en tu futuro profesional.'

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Auth ───────────────────────────────────────────────
      usuarioActual: null,
      rolActivo: null,
      usuariosSistema: USUARIOS_SISTEMA,

      getEspecialistaAsignado: (carreraId: string, semestre: string) => {
        const { carreras, especialistas } = get();
        // 1. Buscar la carrera por ID o nombre
        let carrera = carreras.find(c => c.id === carreraId || c.nombre === carreraId);

        // 1.5. Fallback defensivo para Zustand Persist (Si el caché tiene la interfaz antigua sin asignaciones)
        if (carrera && !carrera.asignaciones) {
          const carrerasDefault = get().carreras || [];
          carrera = carrerasDefault.find((c: Carrera) => c.id === carreraId || c.nombre === carreraId);
        }

        if (!carrera || !carrera.asignaciones) return undefined;

        // 2. Normalizar el semestre entrante ('VI Semestre', 'S6', '6' -> 'S6')
        const normalizeSemestre = (s: string) => {
          if (!s) return 'S4';
          const upper = s.toUpperCase().trim();
          if (upper.includes('VI') || upper === 'S6' || upper === '6') return 'S6';
          if (upper.includes('IV') || upper === 'S4' || upper === '4') return 'S4';
          if (upper.includes('V') || upper === 'S5' || upper === '5') return 'S5';
          return upper;
        };
        const semNormalizado = normalizeSemestre(semestre);

        // 3. Encontrar la asignación que incluya este semestre normalizado
        const asignacion = carrera.asignaciones.find(a => a.semestres && a.semestres.includes(semNormalizado));
        if (!asignacion) return undefined;

        // 4. Devolver el especialista
        return especialistas.find(e => e.id === asignacion.especialistaId);
      },

      login: (dni: string, pass: string) => {
        const dSafe = dni.trim().replace(/<[^>]*>/g, '');
        const pSafe = pass.replace(/<[^>]*>/g, '');
        const periodoActivo = get().periodos.find((p) => p.estado === 'activo') || get().periodos[0];
        const periodoActivoId = periodoActivo?.id || 'per-2026-02';

        // 1. Gerencia / Admin
        const adminGerencia = get().usuariosSistema.find(
          (u: any) =>
            (u.rol === 'GERENCIA' || u.rol === 'ADMIN') &&
            (u.username === dSafe || u.dni === dSafe || u.correo === dSafe || u.email === dSafe) &&
            (u.password || u.dni) === pSafe
        ) as any;
        if (adminGerencia) {
          set({
            usuarioActual: {
              ...adminGerencia,
              correo: adminGerencia.correo || adminGerencia.email || '',
              telefono: adminGerencia.telefono || adminGerencia.tel || '',
              fechaNacimiento: adminGerencia.fechaNacimiento || '',
            },
            rolActivo: adminGerencia.rol,
            tabActiva: 'hoy',
            periodoVisualizacionId: periodoActivoId,
          } as any);
          return true;
        }

        // 2. Monitores (Supervisores)
        const monitor = get().monitores?.find(
          (m: any) =>
            (m.dni === dSafe || m.correoGmail === dSafe || m.correo === dSafe) &&
            (m.password || m.dni) === pSafe
        ) as any;
        if (monitor) {
          if (
            monitor.estadoGlobal === 'SUSPENDIDO' ||
            monitor.estado === 'Suspendido' ||
            monitor.estado === 'Retirado'
          ) {
            return LOGIN_ALERT_SUSPENDIDO;
          }
          const correoSup = monitor.correo || monitor.correoGmail || '';
          const telSup = monitor.telefono || monitor.celular || '';
          set({
            usuarioActual: {
              id: monitor.id,
              username: monitor.dni || correoSup || '',
              nombre: monitor.nombre || '',
              rol: 'SUPERVISOR',
              email: correoSup,
              correo: correoSup,
              dni: monitor.dni || '',
              tel: telSup,
              telefono: telSup,
              fechaNacimiento: monitor.fechaNacimiento || '',
              carrera: monitor.area || '',
              modalidadBase: monitor.modalidadBase || 'Presencial',
              avatarIniciales: monitor.nombre ? calcAvatarIniciales(monitor.nombre) : 'SU',
            } as any,
            rolActivo: 'SUPERVISOR' as any,
            tabActiva: 'hoy',
            periodoVisualizacionId: periodoActivoId,
          });
          return true;
        }

        // 3. Practicantes (validación estricta de password editable, estadoGlobal y periodo activo)
        const coincidencias = (get().practicantes || []).filter(
          (p: any) => p.dni === dSafe && (p.password || p.dni) === pSafe
        ) as any[];
        if (coincidencias.length > 0) {
          const activoEnCiclo = coincidencias.find(
            (p) =>
              (p.periodo_id || p.periodoId || periodoActivoId) === periodoActivoId &&
              (p.estadoGlobal || 'ACTIVO') === 'ACTIVO' &&
              p.estadoLaboral !== 'retirado' &&
              p.estado !== 'retirado'
          );

          if (activoEnCiclo) {
            const nombreCompleto = `${activoEnCiclo.nombre || ''} ${activoEnCiclo.apellido || ''}`.trim();
            const correoPrac = activoEnCiclo.correo || activoEnCiclo.email || '';
            const telPrac = activoEnCiclo.telefono || activoEnCiclo.celular || activoEnCiclo.tel || '';
            set({
              usuarioActual: {
                id: activoEnCiclo.id,
                username: activoEnCiclo.dni || '',
                nombre: nombreCompleto,
                rol: 'PRACTICANTE',
                email: correoPrac,
                correo: correoPrac,
                dni: activoEnCiclo.dni || '',
                tel: telPrac,
                telefono: telPrac,
                carrera: activoEnCiclo.carrera || '',
                semestre: activoEnCiclo.semestre || 'No definido',
                fechaNacimiento: activoEnCiclo.fechaNacimiento || '',
                modalidadBase: activoEnCiclo.modalidadBase || '',
                avatarIniciales: calcAvatarIniciales(nombreCompleto),
              } as any,
              rolActivo: 'PRACTICANTE' as any,
              tabActiva: 'hoy',
              periodoVisualizacionId: periodoActivoId,
            });
            return true;
          }

          const ultimoRegistro = coincidencias[coincidencias.length - 1];
          if (ultimoRegistro.estadoGlobal === 'EGRESADO') {
            return LOGIN_ALERT_EGRESADO;
          }
          return LOGIN_ALERT_SUSPENDIDO;
        }
        return false;
      },

      generarCredenciales: (practicanteId) => {
        const newPassword = Math.random().toString(36).slice(-6)
        set((state) => ({
          practicantes: state.practicantes.map((p) =>
            p.id === practicanteId ? { ...p, password: newPassword } : p
          )
        }))
      },

      sincronizarHikvision: (payload) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.dni !== payload.dni) return p
            let horasExtraHikvision = 0;
            const hSalida = new Date(`1970-01-01T${payload.horaSalida}:00`)
            const tFin = new Date(`1970-01-01T${payload.turnoFin}:00`)

            if (hSalida > tFin) {
              horasExtraHikvision = (hSalida.getTime() - tFin.getTime()) / (1000 * 60 * 60)
            }

            const asistenciaActual = p.asistencia || {}
            return {
              ...p,
              hikvisionSync: true,
              asistencia: {
                ...asistenciaActual,
                [payload.fecha]: {
                  ...(asistenciaActual[payload.fecha] || {
                    estado: 'Asistió',
                    horasExtraManuales: 0,
                    horasExtraHikvision: 0,
                    faltaCubierta: false
                  }),
                  estado: 'Asistió',
                  horasExtraHikvision: Number(horasExtraHikvision.toFixed(2))
                }
              }
            }
          })
        }))
      },

      uploadDocumento: (practicanteId, docKey, fileName) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            const docs = p.documentos ?? {
              cartaPresentacion: null,
              evidenciaFormulario: null,
              cartaAceptacionFirmada: null,
              convenioFirmado: null,
              registroVinculacion: null,
            }
            return { ...p, documentos: { ...docs, [docKey]: fileName } }
          })
        }))
      },

      logout: () => {
        set({
          usuarioActual: null,
          rolActivo: null,
          tabActiva: 'hoy',
        })
      },

      addUsuario: (usuario) => {
        set((state) => {
          const passFinal = usuario.password || usuario.dni;
          const correoFinal = usuario.correo || usuario.email || (usuario as any).correoGmail || '';
          const telFinal = usuario.telefono || usuario.tel || '';
          const usuarioNormalizado = {
            ...usuario,
            password: passFinal,
            correo: correoFinal,
            email: usuario.email || correoFinal,
            telefono: telFinal,
            tel: usuario.tel || telFinal,
            fechaNacimiento: usuario.fechaNacimiento || '',
          };
          const usuariosSistema = [...state.usuariosSistema, usuarioNormalizado];
          let monitores = state.monitores;
          if (usuario.rol === 'SUPERVISOR') {
            const supId = usuario.id;
            if (!monitores.some((m) => m.id === supId || (usuario.dni && m.dni === usuario.dni))) {
              monitores = [
                ...monitores,
                {
                  id: supId,
                  nombre: usuario.nombre,
                  area: (usuario as any).carrera || 'Supervisión',
                  dni: usuario.dni,
                  celular: telFinal,
                  telefono: telFinal,
                  rol: 'SUPERVISOR',
                  modalidadBase: 'Presencial' as ModalidadBase,
                  correoGmail: (usuario as any).correoGmail || correoFinal,
                  correo: correoFinal,
                  fechaNacimiento: usuario.fechaNacimiento || '',
                  password: passFinal,
                  estado: 'Activo' as const,
                  estadoGlobal: 'ACTIVO' as EstadoGlobalMonitor,
                },
              ];
            }
          }
          return { usuariosSistema, monitores };
        })
      },

      getUsuarioById: (id) => {
        const state = get();
        const prac = state.practicantes.find((p) => p.id === id);
        if (prac) {
          const nombres = `${prac.nombre || ''} ${prac.apellido || ''}`.trim();
          const correo = prac.correo || prac.email || '';
          const telefono = prac.telefono || prac.celular || prac.tel || '';
          return {
            id: prac.id,
            tipoUsuario: 'PRACTICANTE',
            nombres,
            nombre: prac.nombre,
            apellido: prac.apellido || '',
            dni: prac.dni || '',
            password: prac.password || prac.dni || '',
            correo,
            telefono,
            carrera: prac.carrera || '',
            carreraId: prac.carreraId || '',
            modalidad: prac.modalidadBase || 'Presencial',
            fechaNacimiento: prac.fechaNacimiento || '',
            avatarIniciales: calcAvatarIniciales(nombres),
          };
        }

        const mon = (state.monitores || []).find((m) => m.id === id);
        if (mon) {
          const correo = mon.correo || mon.correoGmail || '';
          const telefono = mon.telefono || mon.celular || '';
          return {
            id: mon.id,
            tipoUsuario: 'SUPERVISOR',
            nombres: mon.nombre || '',
            nombre: mon.nombre || '',
            dni: mon.dni || '',
            password: mon.password || mon.dni || '',
            correo,
            telefono,
            carrera: mon.area || 'Supervisión',
            modalidad: mon.modalidadBase || 'Presencial',
            fechaNacimiento: mon.fechaNacimiento || '',
            avatarIniciales: calcAvatarIniciales(mon.nombre || ''),
          };
        }

        const sys = state.usuariosSistema.find((u) => u.id === id);
        if (sys) {
          const tipoUsuario: TipoUsuarioPerfil =
            sys.rol === 'GERENCIA' ? 'GERENCIA' : sys.rol === 'SUPERVISOR' ? 'SUPERVISOR' : 'PRACTICANTE';
          return {
            id: sys.id,
            tipoUsuario,
            nombres: sys.nombre || '',
            nombre: sys.nombre || '',
            dni: sys.dni || '',
            password: sys.password || sys.dni || '',
            correo: sys.correo || sys.email || '',
            telefono: sys.telefono || sys.tel || '',
            carrera: sys.carrera || '',
            modalidad: 'Presencial',
            fechaNacimiento: sys.fechaNacimiento || '',
            avatarIniciales: sys.avatarIniciales || calcAvatarIniciales(sys.nombre || ''),
          };
        }

        return undefined;
      },

      actualizarMiPerfil: (id, tipoUsuario, nuevosDatos) => {
        set((state) => {
          // Whitelist estricta: jamás modifica dni ni password ni rol
          const rawNombres =
            nuevosDatos.nombres ??
            (nuevosDatos.nombre
              ? `${nuevosDatos.nombre} ${nuevosDatos.apellido || ''}`.trim()
              : undefined);
          const nombresClean = rawNombres !== undefined ? sanitizeTextField(rawNombres) : undefined;
          const correoClean =
            (nuevosDatos.correo ?? nuevosDatos.email) !== undefined
              ? sanitizeTextField(nuevosDatos.correo ?? nuevosDatos.email)
              : undefined;
          const telClean =
            (nuevosDatos.telefono ?? nuevosDatos.celular ?? nuevosDatos.tel) !== undefined
              ? sanitizeTextField(nuevosDatos.telefono ?? nuevosDatos.celular ?? nuevosDatos.tel)
              : undefined;
          const fechaClean =
            nuevosDatos.fechaNacimiento !== undefined
              ? sanitizeTextField(nuevosDatos.fechaNacimiento)
              : undefined;

          let practicantes = state.practicantes;
          let monitores = state.monitores;
          let usuariosSistema = state.usuariosSistema;
          let dniVinculado = '';

          if (tipoUsuario === 'PRACTICANTE' || practicantes.some((p) => p.id === id)) {
            const targetP =
              practicantes.find((p) => p.id === id) ||
              (state.usuarioActual?.dni
                ? practicantes.find((p) => p.dni === state.usuarioActual.dni)
                : undefined);
            dniVinculado = targetP?.dni || state.usuarioActual?.dni || '';
            const { nombre: splitNom, apellido: splitApe } =
              nombresClean !== undefined
                ? splitNombresCompleto(nombresClean)
                : { nombre: '', apellido: '' };

            practicantes = practicantes.map((p) => {
              if (p.id !== id && !(dniVinculado && p.dni === dniVinculado)) return p;
              return {
                ...p,
                ...(nombresClean !== undefined ? { nombre: splitNom, apellido: splitApe } : {}),
                ...(correoClean !== undefined ? { correo: correoClean, email: correoClean } : {}),
                ...(telClean !== undefined ? { telefono: telClean, celular: telClean, tel: telClean } : {}),
                ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
              };
            });
          }

          if (tipoUsuario === 'SUPERVISOR' || (monitores || []).some((m) => m.id === id)) {
            const targetM = (monitores || []).find((m) => m.id === id);
            if (!dniVinculado) dniVinculado = targetM?.dni || state.usuarioActual?.dni || '';
            monitores = (monitores || []).map((m) => {
              if (m.id !== id) return m;
              return {
                ...m,
                ...(nombresClean !== undefined ? { nombre: nombresClean } : {}),
                ...(correoClean !== undefined ? { correo: correoClean, correoGmail: correoClean } : {}),
                ...(telClean !== undefined ? { telefono: telClean, celular: telClean } : {}),
                ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
              };
            });
          }

          usuariosSistema = usuariosSistema.map((u) => {
            if (u.id !== id && !(dniVinculado && u.dni === dniVinculado)) return u;
            return {
              ...u,
              ...(nombresClean !== undefined
                ? { nombre: nombresClean, avatarIniciales: calcAvatarIniciales(nombresClean) }
                : {}),
              ...(correoClean !== undefined ? { correo: correoClean, email: correoClean } : {}),
              ...(telClean !== undefined ? { telefono: telClean, tel: telClean } : {}),
              ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
            };
          });

          let usuarioActual = state.usuarioActual;
          if (
            usuarioActual &&
            (usuarioActual.id === id || (dniVinculado && usuarioActual.dni === dniVinculado))
          ) {
            usuarioActual = {
              ...usuarioActual,
              ...(nombresClean !== undefined
                ? { nombre: nombresClean, avatarIniciales: calcAvatarIniciales(nombresClean) }
                : {}),
              ...(correoClean !== undefined ? { correo: correoClean, email: correoClean } : {}),
              ...(telClean !== undefined ? { telefono: telClean, tel: telClean } : {}),
              ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
            };
          }

          return { practicantes, monitores, usuariosSistema, usuarioActual };
        });
      },

      adminEditarUsuario: (id, tipoUsuario, nuevosDatos) => {
        set((state) => {
          const rawNombres =
            nuevosDatos.nombres ??
            (nuevosDatos.nombre
              ? `${nuevosDatos.nombre} ${nuevosDatos.apellido || ''}`.trim()
              : undefined);
          const nombresClean = rawNombres !== undefined ? sanitizeTextField(rawNombres) : undefined;
          const dniClean = nuevosDatos.dni !== undefined ? sanitizeTextField(nuevosDatos.dni) : undefined;
          const correoClean =
            (nuevosDatos.correo ?? nuevosDatos.email) !== undefined
              ? sanitizeTextField(nuevosDatos.correo ?? nuevosDatos.email)
              : undefined;
          const telClean =
            (nuevosDatos.telefono ?? nuevosDatos.celular ?? nuevosDatos.tel) !== undefined
              ? sanitizeTextField(nuevosDatos.telefono ?? nuevosDatos.celular ?? nuevosDatos.tel)
              : undefined;
          const carreraClean =
            nuevosDatos.carrera !== undefined ? sanitizeTextField(nuevosDatos.carrera) : undefined;
          const carreraIdClean =
            nuevosDatos.carreraId !== undefined ? sanitizeTextField(nuevosDatos.carreraId) : undefined;
          const modalidadClean = nuevosDatos.modalidad ?? nuevosDatos.modalidadBase;
          const fechaClean =
            nuevosDatos.fechaNacimiento !== undefined
              ? sanitizeTextField(nuevosDatos.fechaNacimiento)
              : undefined;

          let practicantes = state.practicantes;
          let monitores = state.monitores;
          let usuariosSistema = state.usuariosSistema;
          let oldDni = '';
          let finalDni = dniClean || '';
          let finalPass =
            nuevosDatos.password !== undefined ? sanitizeTextField(nuevosDatos.password) : undefined;

          if (tipoUsuario === 'PRACTICANTE') {
            const targetP = practicantes.find((p) => p.id === id);
            if (targetP) {
              oldDni = targetP.dni;
              finalDni = dniClean !== undefined ? dniClean : targetP.dni;
              const passResuelta =
                finalPass !== undefined ? (finalPass || finalDni) : (targetP.password || finalDni);
              finalPass = passResuelta;

              const { nombre: splitNom, apellido: splitApe } =
                nombresClean !== undefined
                  ? splitNombresCompleto(nombresClean)
                  : { nombre: targetP.nombre, apellido: targetP.apellido || '' };

              practicantes = practicantes.map((p) => {
                // La llave primaria inmutable es p.id; también sincroniza identidad/credenciales si existieran clones históricos del mismo DNI
                if (p.id === id) {
                  return {
                    ...p,
                    nombre: splitNom,
                    apellido: splitApe,
                    dni: finalDni,
                    password: passResuelta,
                    ...(carreraClean !== undefined ? { carrera: carreraClean } : {}),
                    ...(carreraIdClean !== undefined ? { carreraId: carreraIdClean } : {}),
                    ...(modalidadClean !== undefined ? { modalidadBase: modalidadClean } : {}),
                    ...(telClean !== undefined ? { telefono: telClean, celular: telClean, tel: telClean } : {}),
                    ...(correoClean !== undefined ? { correo: correoClean, email: correoClean } : {}),
                    ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
                  };
                }
                if (oldDni && p.dni === oldDni) {
                  return {
                    ...p,
                    nombre: splitNom,
                    apellido: splitApe,
                    dni: finalDni,
                    password: passResuelta,
                    ...(telClean !== undefined ? { telefono: telClean, celular: telClean, tel: telClean } : {}),
                    ...(correoClean !== undefined ? { correo: correoClean, email: correoClean } : {}),
                    ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
                  };
                }
                return p;
              });
            }
          } else if (tipoUsuario === 'SUPERVISOR') {
            const targetM = (monitores || []).find((m) => m.id === id);
            if (targetM) {
              oldDni = targetM.dni || '';
              finalDni = dniClean !== undefined ? dniClean : oldDni;
              const passResuelta =
                finalPass !== undefined ? (finalPass || finalDni) : (targetM.password || finalDni);
              finalPass = passResuelta;

              monitores = (monitores || []).map((m) => {
                if (m.id !== id) return m;
                return {
                  ...m,
                  ...(nombresClean !== undefined ? { nombre: nombresClean } : {}),
                  dni: finalDni,
                  password: passResuelta,
                  ...(carreraClean !== undefined ? { area: carreraClean } : {}),
                  ...(modalidadClean !== undefined ? { modalidadBase: modalidadClean } : {}),
                  ...(telClean !== undefined ? { telefono: telClean, celular: telClean } : {}),
                  ...(correoClean !== undefined ? { correo: correoClean, correoGmail: correoClean } : {}),
                  ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
                };
              });
            }
          } else {
            const targetU = usuariosSistema.find((u) => u.id === id);
            if (targetU) {
              oldDni = targetU.dni;
              finalDni = dniClean !== undefined ? dniClean : oldDni;
              finalPass =
                finalPass !== undefined ? (finalPass || finalDni) : (targetU.password || finalDni);
            }
          }

          // Mantener sincronizada la tabla usuariosSistema usando id o dni previo (sin mutar id)
          usuariosSistema = usuariosSistema.map((u) => {
            if (u.id !== id && !(oldDni && u.dni === oldDni)) return u;
            return {
              ...u,
              ...(nombresClean !== undefined
                ? { nombre: nombresClean, avatarIniciales: calcAvatarIniciales(nombresClean) }
                : {}),
              ...(finalDni ? { dni: finalDni } : {}),
              ...(finalPass !== undefined ? { password: finalPass } : {}),
              ...(carreraClean !== undefined ? { carrera: carreraClean } : {}),
              ...(telClean !== undefined ? { telefono: telClean, tel: telClean } : {}),
              ...(correoClean !== undefined ? { correo: correoClean, email: correoClean } : {}),
              ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
            };
          });

          let usuarioActual = state.usuarioActual;
          if (
            usuarioActual &&
            (usuarioActual.id === id || (oldDni && usuarioActual.dni === oldDni))
          ) {
            usuarioActual = {
              ...usuarioActual,
              ...(nombresClean !== undefined
                ? { nombre: nombresClean, avatarIniciales: calcAvatarIniciales(nombresClean) }
                : {}),
              ...(finalDni ? { dni: finalDni, username: finalDni } : {}),
              ...(carreraClean !== undefined ? { carrera: carreraClean } : {}),
              ...(modalidadClean !== undefined ? { modalidadBase: modalidadClean } : {}),
              ...(telClean !== undefined ? { telefono: telClean, tel: telClean } : {}),
              ...(correoClean !== undefined ? { correo: correoClean, email: correoClean } : {}),
              ...(fechaClean !== undefined ? { fechaNacimiento: fechaClean } : {}),
            };
          }

          return { practicantes, monitores, usuariosSistema, usuarioActual };
        });
      },

      updatePerfil: (data) => {
        set((state) => {
          if (!state.usuarioActual) return state
          const sanitized = Object.fromEntries(
            Object.entries(data).map(([k, v]) => [
              k,
              typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim() : v,
            ]),
          )
          return {
            usuarioActual: { ...state.usuarioActual, ...sanitized },
          }
        })
      },

      // ── Tabs ────────────────────────────────────────────────
      tabActiva: 'hoy',
      setTabActiva: (tab) => set({ tabActiva: tab }),

      // ── Practicantes ────────────────────────────────────────
      practicantes: MOCK_PRACTICANTES,
      addPracticante: (practicante) => set((state) => {
        const periodoActivoId = state.periodos.find((per) => per.estado === 'activo')?.id || state.periodos[0]?.id || 'per-2026-02';
        const periodoVinculado = practicante.periodo_id || practicante.periodoId || periodoActivoId;
        const nuevoPracticante: Practicante = {
          ...practicante,
          periodo_id: periodoVinculado,
          periodoId: periodoVinculado,
          supervisorId: practicante.supervisorId || practicante.monitorId,
          password: practicante.password || practicante.dni,
          correo: practicante.correo || practicante.email,
          telefono: practicante.telefono || practicante.celular || practicante.tel,
          estadoGlobal: practicante.estadoGlobal || (practicante.estadoLaboral === 'retirado' ? 'RETIRADO' : 'ACTIVO'),
          documentos: practicante.documentos ?? {
            cartaPresentacion: null,
            evidenciaFormulario: null,
            cartaAceptacionFirmada: null,
            convenioFirmado: null,
            registroVinculacion: null,
          },
        };
        return {
          practicantes: [...state.practicantes, nuevoPracticante],
        };
      }),
      getPracticante: (id) => get().practicantes.find((p) => p.id === id),

      practicanteSeleccionadoId: MOCK_PRACTICANTES[0].id,
      setPracticanteSeleccionadoId: (id) =>
        set({ practicanteSeleccionadoId: id }),

      asignarMonitor: (practicanteId, monitorId) => set((state) => ({
        practicantes: state.practicantes.map((p) =>
          p.id === practicanteId ? { ...p, monitorId, supervisorId: monitorId } : p
        )
      })),

      removerMonitor: (practicanteId) => set((state) => ({
        practicantes: state.practicantes.map((p) =>
          p.id === practicanteId ? { ...p, monitorId: undefined as any, supervisorId: undefined } : p
        )
      })),

      cambiarEstadoSupervisor: (supervisorId, nuevoEstado, motivo) => {
        set((state) => {
          const estadoGlobalMonitor: EstadoGlobalMonitor =
            nuevoEstado === 'Suspendido' ? 'SUSPENDIDO' : 'ACTIVO';
          // Cambiar estado del supervisor conservando los practicantes vinculados
          // para que la UI muestre "Supervisor Suspendido - Requiere Reasignación"
          const monitoresActualizados = state.monitores?.map((m) =>
            m.id === supervisorId
              ? {
                  ...m,
                  estado: nuevoEstado,
                  estadoGlobal: estadoGlobalMonitor,
                  motivoSuspension: nuevoEstado === 'Suspendido' ? (motivo || '') : '',
                }
              : m
          );

          return { monitores: monitoresActualizados };
        });
      },

      // ── Horario ─────────────────────────────────────────────
      enviarHorario: (practicanteId, dias) => {
        const totalHoras = dias.reduce((s, d) => s + (d.horas || d.horasCalculadas || 0), 0)
        const horario: HorarioSemanal = {
          id: `h-${practicanteId}-${Date.now()}`,
          semana: (() => {
            const currentDate = new Date();
            const startDate = new Date(currentDate.getFullYear(), 0, 1);
            const days = Math.floor((currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
            return Math.ceil(days / 7);
          })(),
          anio: new Date().getFullYear(),
          dias,
          totalHoras,
          estado: 'pendiente_aprobacion',
          fechaEnvio: new Date().toISOString(),
        }
        set((state) => ({
          practicantes: state.practicantes.map((p) =>
            p.id === practicanteId
              ? { ...p, horarioPendiente: horario }
              : p,
          ),
        }))
      },

      cancelarHorario: (practicanteId) => {
        const practicante = get().practicantes.find((p) => p.id === practicanteId)
        if (!practicante || !practicante.horarioPendiente) return

        const excedente = Math.max(0, practicante.horarioPendiente.totalHoras - 30)

        set((state) => {
          let nuevasHorasExtras = state.extraHoursBalances

          // Si hay excedente, revertirlo del balance histórico
          if (excedente > 0) {
            nuevasHorasExtras = state.extraHoursBalances.map((b) => {
              if (b.practicanteId !== practicanteId) return b
              const nuevoBalance = b.horasDisponibles - excedente
              const movReverso = {
                id: `he-rev-${practicanteId}-${Date.now()}`,
                tipo: 'deduccion' as const,
                horas: excedente,
                fecha: new Date().toISOString().split('T')[0],
                descripcion: 'Reverso por cancelación de envío Sem. 38',
                balanceResultante: nuevoBalance,
              }
              return {
                ...b,
                horasDisponibles: nuevoBalance,
                historial: [...b.historial, movReverso],
              }
            })
          }

          return {
            extraHoursBalances: nuevasHorasExtras,
            practicantes: state.practicantes.map((p) =>
              p.id === practicanteId
                ? { ...p, horarioPendiente: undefined, saldoHorasExtras: Math.max(0, (p.saldoHorasExtras ?? 0) - excedente) }
                : p,
            ),
          }
        })
      },

      acumularHorasExtras: (practicanteId, horas, descripcion) => {
        set((state) => {
          const balances = state.extraHoursBalances.map((b) => {
            if (b.practicanteId !== practicanteId) return b
            const nuevo = b.horasDisponibles + horas
            const mov = {
              id: `he-${practicanteId}-${Date.now()}`,
              tipo: 'acumulo' as const,
              horas,
              fecha: new Date().toISOString().split('T')[0],
              descripcion,
              balanceResultante: nuevo,
            }
            return {
              ...b,
              horasDisponibles: nuevo,
              historial: [...b.historial, mov],
            }
          })
          const practicantes = state.practicantes.map((p) =>
            p.id === practicanteId
              ? { ...p, saldoHorasExtras: (p.saldoHorasExtras ?? 0) + horas }
              : p
          )
          return { extraHoursBalances: balances, practicantes }
        })
      },

      aprobarHorario: (practicanteId) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId || !p.horarioPendiente) return p
            return {
              ...p,
              horarioAprobado: { ...p.horarioPendiente, estado: 'Aprobado' },
              horarioVigente: { ...p.horarioPendiente, estado: 'Aprobado' },
              horarioActual: { ...p.horarioPendiente, estado: 'aprobado' }, // Legacy compatibility
              horarioPendiente: undefined,
            }
          }),
        }))
      },

      rechazarHorario: (practicanteId, motivo) => {
        set((state) => {
          const practicante = state.practicantes.find(p => p.id === practicanteId)
          if (practicante) {
            console.log(`[API WhatsApp Mock] Enviando a ${practicante.tel || practicante.celular || 'Sin número'}: Hola ${practicante.nombre}, tu solicitud de horario ha sido denegada. Motivo: ${motivo}`)
          }
          return {
            practicantes: state.practicantes.map((p) => {
              if (p.id !== practicanteId || !p.horarioPendiente) return p
              return {
                ...p,
                horarioPendiente: {
                  ...p.horarioPendiente,
                  estado: 'Rechazado',
                  motivoRechazo: motivo,
                }
              }
            })
          }
        })
      },

      // ── Asistencia ──────────────────────────────────────────
      marcarAsistencia: (practicanteId, fecha, estado) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            const existe = p.historial.some((d) => d.fecha === fecha)
            const hist = existe
              ? p.historial.map((d) =>
                d.fecha === fecha
                  ? {
                    ...d,
                    estado,
                    codigoHoja: estadoACodigo(estado),
                    fuente: 'SUPERVISOR' as const,
                  }
                  : d,
              )
              : [
                ...p.historial,
                {
                  fecha,
                  modalidad: (p.modalidadBase?.toLowerCase() || 'presencial') as import('../types').Modalidad,
                  horaIngreso:
                    estado === 'ASISTIO'
                      ? '08:05'
                      : estado === 'TARDANZA'
                        ? '08:30'
                        : undefined,
                  estado,
                  codigoHoja: estadoACodigo(estado),
                  fuente: 'SUPERVISOR' as const,
                },
              ]
            const estadoMap: Record<import('../types').EstadoAsistencia, 'Asistió' | 'Tardanza' | 'Falta' | 'Campo' | 'Pendiente' | 'Libre'> = {
              ASISTIO: 'Asistió',
              TARDANZA: 'Tardanza',
              FALTA: 'Falta',
              FALTA_CUBIERTA: 'Falta',
              COMPENSADO: 'Asistió',
              SEMINARIO: 'Asistió',
              CAMPO: 'Campo',
              LIBRE: 'Libre',
              PENDIENTE: 'Pendiente',
            }
            const asistenciaActual = p.asistencia || {}
            const regAsist = asistenciaActual[fecha] || { horasExtraManuales: 0, horasExtraHikvision: 0, faltaCubierta: false }
            return {
              ...p,
              historial: hist,
              asistencia: {
                ...asistenciaActual,
                [fecha]: {
                  ...regAsist,
                  estado: estadoMap[estado] || 'Pendiente'
                }
              }
            }
          }),
        }))
      },

      marcarAsistenciaRapida: (practicanteId, fechaISO, estado) => {
        get().marcarAsistencia(practicanteId, fechaISO, estado)
      },

      cambiarModalidadHoy: (practicanteId, modalidad) => {
        const fechaHoy = '2026-09-18'
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            const existe = p.historial.some((d) => d.fecha === fechaHoy)
            const hist = existe
              ? p.historial.map((d) =>
                d.fecha === fechaHoy ? { ...d, modalidad } : d,
              )
              : [
                ...p.historial,
                {
                  fecha: fechaHoy,
                  modalidad,
                  estado: 'PENDIENTE' as EstadoAsistencia,
                  codigoHoja: '-' as const,
                  fuente: 'SUPERVISOR' as const,
                },
              ]
            return { ...p, historial: hist }
          }),
        }))
      },

      registrarCampo: (practicanteId, fecha, motivo) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            const existe = p.historial.some((d) => d.fecha === fecha)
            const hist = existe
              ? p.historial.map((d) =>
                d.fecha === fecha
                  ? {
                    ...d,
                    estado: 'CAMPO' as EstadoAsistencia,
                    codigoHoja: 'C' as const,
                    motivoCampo: motivo,
                    fuente: 'SUPERVISOR' as const,
                  }
                  : d,
              )
              : [
                ...p.historial,
                {
                  fecha,
                  modalidad: (p.modalidadBase?.toLowerCase() || 'presencial') as import('../types').Modalidad,
                  estado: 'CAMPO' as EstadoAsistencia,
                  codigoHoja: 'C' as const,
                  motivoCampo: motivo,
                  fuente: 'SUPERVISOR' as const,
                },
              ]
            return { ...p, historial: hist }
          }),
        }))
      },

      // ── Horas Extras ────────────────────────────────────────
      extraHoursBalances: EXTRA_HOURS_BALANCES,

      getExtraHoursBalance: (practicanteId) =>
        get().extraHoursBalances.find(
          (b) => b.practicanteId === practicanteId,
        ),

      compensarConHorasExtras: (practicanteId, fecha, supervisorNombre) => {
        const balance = get().extraHoursBalances.find(
          (b) => b.practicanteId === practicanteId,
        )
        if (!balance || balance.horasDisponibles < 6) return false

        const nuevoBalance = balance.horasDisponibles - 6
        const movimiento = {
          id: `he-${practicanteId}-${Date.now()}`,
          tipo: 'deduccion' as const,
          horas: 6,
          fecha: new Date().toISOString().split('T')[0],
          fechaAsistencia: fecha,
          descripcion: `Compensación de falta — ${fecha}`,
          supervisorNombre,
          balanceResultante: nuevoBalance,
        }

        set((state) => ({
          // Actualizar historial de horas extras
          extraHoursBalances: state.extraHoursBalances.map((b) =>
            b.practicanteId === practicanteId
              ? {
                ...b,
                horasDisponibles: nuevoBalance,
                historial: [...b.historial, movimiento],
              }
              : b,
          ),
          // Cambiar estado de FALTA → COMPENSADO en historial de asistencia
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            return {
              ...p,
              saldoHorasExtras: nuevoBalance,
              historial: p.historial.map((d) =>
                d.fecha === fecha && d.estado === 'FALTA'
                  ? {
                    ...d,
                    estado: 'COMPENSADO' as EstadoAsistencia,
                    codigoHoja: 'HE' as const,
                    horasExtrasAplicadas: true,
                  }
                  : d,
              ),
            }
          }),
        }))
        return true
      },

      actualizarAsistenciaDia: (practicanteId, fecha, nuevoEstado, _motivo) => {
        // Wrapper semántico — delega en marcarAsistencia para upsert reactivo
        get().marcarAsistencia(practicanteId, fecha, nuevoEstado)
      },

      actualizarAsistenciaDiaConModalidad: (practicanteId, fecha, nuevoEstado, modalidad) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            const existe = p.historial.some((d) => d.fecha === fecha)
            const hist = existe
              ? p.historial.map((d) =>
                d.fecha === fecha
                  ? {
                    ...d,
                    estado: nuevoEstado,
                    modalidad,
                    codigoHoja: estadoACodigo(nuevoEstado),
                    fuente: 'SUPERVISOR' as const,
                    horaIngreso:
                      nuevoEstado === 'ASISTIO' ? (d.horaIngreso ?? '08:05')
                        : nuevoEstado === 'TARDANZA' ? (d.horaIngreso ?? '08:30')
                          : undefined,
                  }
                  : d,
              )
              : [
                ...p.historial,
                {
                  fecha,
                  modalidad,
                  horaIngreso:
                    nuevoEstado === 'ASISTIO' ? '08:05'
                      : nuevoEstado === 'TARDANZA' ? '08:30'
                        : undefined,
                  estado: nuevoEstado,
                  codigoHoja: estadoACodigo(nuevoEstado),
                  fuente: 'SUPERVISOR' as const,
                },
              ]
            const estadoMap: Record<import('../types').EstadoAsistencia, 'Asistió' | 'Tardanza' | 'Falta' | 'Campo' | 'Pendiente' | 'Libre'> = {
              ASISTIO: 'Asistió',
              TARDANZA: 'Tardanza',
              FALTA: 'Falta',
              FALTA_CUBIERTA: 'Falta',
              COMPENSADO: 'Asistió',
              SEMINARIO: 'Asistió',
              CAMPO: 'Campo',
              LIBRE: 'Libre',
              PENDIENTE: 'Pendiente',
            }
            const asistenciaActual = p.asistencia || {}
            const regAsist = asistenciaActual[fecha] || { horasExtraManuales: 0, horasExtraHikvision: 0, faltaCubierta: false }
            return {
              ...p,
              historial: hist,
              asistencia: {
                ...asistenciaActual,
                [fecha]: {
                  ...regAsist,
                  estado: estadoMap[nuevoEstado] || 'Pendiente'
                }
              }
            }
          }),
          borradorDiario: {
            ...state.borradorDiario,
            [practicanteId]: nuevoEstado,
          }
        }))
      },

      compensarFaltaConHE: (practicanteId, fecha, horasACompensar = 5) => {
        const balance = get().extraHoursBalances.find(
          (b) => b.practicanteId === practicanteId,
        )
        if (!balance || balance.horasDisponibles < horasACompensar) return false

        const nuevoBalance = balance.horasDisponibles - horasACompensar
        const movimiento = {
          id: `he-comp-${practicanteId}-${Date.now()}`,
          tipo: 'deduccion' as const,
          horas: horasACompensar,
          fecha: new Date().toISOString().split('T')[0],
          fechaAsistencia: fecha,
          descripcion: `Compensación de falta con HE — ${fecha}`,
          balanceResultante: nuevoBalance,
        }

        set((state) => ({
          extraHoursBalances: state.extraHoursBalances.map((b) =>
            b.practicanteId === practicanteId
              ? {
                ...b,
                horasDisponibles: nuevoBalance,
                historial: [...b.historial, movimiento],
              }
              : b,
          ),
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            return {
              ...p,
              historial: p.historial.map((d) =>
                d.fecha === fecha &&
                  (d.estado === 'FALTA' || d.estado === 'TARDANZA')
                  ? {
                    ...d,
                    estado: 'COMPENSADO' as EstadoAsistencia,
                    codigoHoja: 'HE' as const,
                    horasExtrasAplicadas: true,
                  }
                  : d,
              ),
            }
          }),
        }))
        return true
      },

      // ── Estado laboral ──────────────────────────────────────
      setEstadoLaboral: (practicanteId, estado, datos) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            const esRetiro = estado === 'retirado'
            const estadoGlobal: EstadoGlobalPracticante = esRetiro ? 'RETIRADO' : 'ACTIVO'
            return {
              ...p,
              estadoGlobal,
              estadoLaboral: estado,
              estado: estado,
              motivoRetiro: esRetiro
                ? (datos?.retiro?.motivo || p.motivoRetiro || 'Retiro sin motivo especificado')
                : undefined,
              fechaRetiro: esRetiro
                ? (datos?.retiro?.fechaInicio || p.fechaRetiro || new Date().toISOString().split('T')[0])
                : undefined,
              retiro: esRetiro ? datos?.retiro : undefined,
            }
          }),
        }))
      },

      // ── Hoja Física ─────────────────────────────────────────
      toggleEntregaHoja: (practicanteId) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) =>
            p.id === practicanteId
              ? { ...p, entregaHojaFisica: !p.entregaHojaFisica }
              : p,
          ),
        }))
      },

      toggleSemanaFirmada: (practicanteId, semanaNumero) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            return {
              ...p,
              semanasHojaFisica: p.semanasHojaFisica.map((s) =>
                s.numero === semanaNumero
                  ? { ...s, firmada: !s.firmada }
                  : s,
              ),
            }
          }),
        }))
      },

      // ── Almuerzos ───────────────────────────────────────────
      confirmarAlmuerzo: (practicanteId, fecha) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            const arr = p.almuerzosConfirmados
              ? p.almuerzosConfirmados
              : []
            return { ...p, almuerzosConfirmados: [...arr, fecha] }
          }),
        }))
      },

      // ── Informes Quincenales ──────────────────────────────────────────
      informesQuincenales: [
        {
          id: 'inf-1',
          practicanteId: 'p1',
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-15',
          archivoPracticanteBase64: 'informe_quincenal_1.pdf',
          mensajePracticante: 'Mantenimiento preventivo, inventario de taller.',
          estado: 'en_revision'
        },
        {
          id: 'inf-2',
          practicanteId: 'p2',
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-15',
          archivoPracticanteBase64: 'actividades_sep.pdf',
          mensajePracticante: 'Configuración de red, soporte técnico.',
          estado: 'observado',
          feedbackMonitor: 'Falta detalle en soporte técnico.'
        }
      ],
      enviarInformeQuincenal: (payload) => {
        set((state) => {
          const nuevoInforme: import('../types').InformeQuincenal = {
            id: `inf-${Date.now()}`,
            practicanteId: payload.practicanteId || state.usuarioActual?.id || 'p1',
            fechaInicio: payload.fechaInicio,
            fechaFin: payload.fechaFin,
            archivoPracticanteBase64: payload.archivoPracticanteBase64,
            nombreArchivo: payload.nombreArchivo || 'documento_senati.pdf',
            tipoMime: payload.tipoMime || 'application/pdf',
            mensajePracticante: payload.mensajePracticante || '',
            estado: 'en_revision',
            archivado: false,
          };
          return { informesQuincenales: [nuevoInforme, ...state.informesQuincenales] };
        })
      },
      aceptarInformeQuincenal: (informeId, feedback) => {
        set((state) => ({
          informesQuincenales: state.informesQuincenales.map(inf =>
            inf.id === informeId
              ? { ...inf, estado: 'aprobado_y_firmado', feedbackMonitor: feedback }
              : inf
          )
        }))
      },
      procesarInformeMonitor: (informeId, nuevoEstado, feedback, archivoFirmado, nombreArchivoFirmado, tipoMimeFirmado) => {
        set((state) => ({
          informesQuincenales: state.informesQuincenales.map(inf =>
            inf.id === informeId
              ? {
                ...inf,
                estado: nuevoEstado,
                feedbackMonitor: feedback,
                archivoFirmadoBase64: archivoFirmado ? archivoFirmado : undefined,
                nombreArchivoFirmado: archivoFirmado ? (nombreArchivoFirmado || 'documento_firmado.pdf') : undefined,
                tipoMimeFirmado: archivoFirmado ? (tipoMimeFirmado || 'application/pdf') : undefined,
              }
              : inf
          )
        }))
      },
      archivarInformeQuincenal: (informeId, archivado = true) => {
        set((state) => ({
          informesQuincenales: state.informesQuincenales.map(inf =>
            inf.id === informeId ? { ...inf, archivado } : inf
          )
        }))
      },
      eliminarInformeQuincenal: (informeId) => {
        set((state) => ({
          informesQuincenales: state.informesQuincenales.filter(inf => inf.id !== informeId)
        }))
      },

      // ── Registro Diario de Actividades ────────────────────────────────
      actividadesDiarias: [],
      getActividadesDia: (practicanteId, fecha) => {
        const compositeId = `${practicanteId}_${fecha}`;
        return get().actividadesDiarias.find(
          (a) => a.id === compositeId || (a.practicanteId === practicanteId && a.fecha === fecha)
        );
      },
      guardarRegistroDiario: (practicanteId, fecha, actividades, nombreAutor, horasExtras) => {
        set((state) => {
          const compositeId = `${practicanteId}_${fecha}`;
          const pTarget = state.practicantes.find((p) => p.id === practicanteId);
          const existeEnCol = state.actividadesDiarias.find(
            (a) => a.id === compositeId || (a.practicanteId === practicanteId && a.fecha === fecha)
          );
          const regDiarioPrev = pTarget?.registrosDiarios?.[fecha];
          const regAsistPrev = pTarget?.asistencia?.[fecha];
          const existeEnPracticante = !!regDiarioPrev;

          const nuevaVersion: VersionHistorial = {
            id: Date.now().toString(),
            fechaEdicion: new Date().toISOString(),
            autor: nombreAutor,
            accion: existeEnCol || existeEnPracticante ? 'editado' : 'creado',
          };

          const historialVersiones = existeEnCol?.historialVersiones
            ? [...existeEnCol.historialVersiones, nuevaVersion]
            : regDiarioPrev?.historialVersiones
              ? [...regDiarioPrev.historialVersiones, nuevaVersion]
              : [nuevaVersion];

          const prevPropuestas =
            existeEnCol?.horasExtrasPropuestas ??
            regDiarioPrev?.horasExtrasPropuestas ??
            regDiarioPrev?.horasExtras ??
            regAsistPrev?.horasExtrasPropuestas ??
            regAsistPrev?.horasExtraSupervisor ??
            0;

          const prevAprobadas =
            existeEnCol?.horasExtrasAprobadas ??
            regDiarioPrev?.horasExtrasAprobadas ??
            regAsistPrev?.horasExtrasAprobadas ??
            regAsistPrev?.horasExtraManuales;

          const prevRevisadas =
            existeEnCol?.heRevisadas ??
            regDiarioPrev?.heRevisadas ??
            regAsistPrev?.heRevisadas;

          const prevEstadoHE: EstadoHE | undefined =
            existeEnCol?.estadoHE ??
            regDiarioPrev?.estadoHE ??
            regAsistPrev?.estadoHE;

          const heFinal = horasExtras !== undefined ? horasExtras : prevPropuestas;
          const tieneHE = heFinal > 0;

          let heRevisadasFinal: boolean;
          let estadoHEFinal: EstadoHE;

          if (horasExtras === undefined) {
            // El practicante guarda actividades sin modificar propuesta/validación de HE
            heRevisadasFinal = prevRevisadas ?? (tieneHE ? false : true);
            estadoHEFinal = prevEstadoHE ?? (tieneHE ? 'pendiente' : 'aprobado');
          } else if (tieneHE) {
            // Si ya fue revisada con el mismo monto exacto, conservar revisión; si es nueva o cambió, marcar pendiente
            const yaRevisadoMismoValor = prevRevisadas === true && heFinal === prevPropuestas;
            heRevisadasFinal = yaRevisadoMismoValor ? true : false;
            estadoHEFinal = yaRevisadoMismoValor ? (prevEstadoHE ?? 'aprobado') : 'pendiente';
          } else {
            heRevisadasFinal = true;
            estadoHEFinal = 'aprobado';
          }

          const pendienteFinal = heFinal > 0 && heRevisadasFinal === false;

          const registroActualizado: RegistroActividadDiaria = {
            id: compositeId,
            practicanteId,
            fecha,
            actividades,
            horasExtrasPropuestas: heFinal,
            horasExtrasAprobadas: prevAprobadas,
            heRevisadas: heRevisadasFinal,
            estadoHE: estadoHEFinal,
            historialVersiones,
            nombreAutor,
          };

          const nuevasActividadesDiarias = state.actividadesDiarias.some(
            (a) => a.id === compositeId || (a.practicanteId === practicanteId && a.fecha === fecha)
          )
            ? state.actividadesDiarias.map((a) =>
                a.id === compositeId || (a.practicanteId === practicanteId && a.fecha === fecha)
                  ? registroActualizado
                  : a
              )
            : [...state.actividadesDiarias, registroActualizado];

          const nuevosPracticantes = state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p;

            const registros = p.registrosDiarios || {};
            const asistenciaActual = p.asistencia || {};
            const regAsist = asistenciaActual[fecha] || {
              estado: 'Pendiente',
              horasExtraManuales: 0,
              horasExtraHikvision: 0,
              faltaCubierta: false,
            };

            const nuevaAsistencia = {
              ...asistenciaActual,
              [fecha]: {
                ...regAsist,
                horasExtraSupervisor: heFinal,
                horasExtrasPropuestas: heFinal,
                heRevisadas: heRevisadasFinal,
                estadoHE: estadoHEFinal,
                hePendienteValidacion: pendienteFinal,
              },
            };

            const nuevosRegistros = {
              ...registros,
              [fecha]: {
                fecha,
                actividades,
                historialVersiones,
                horasExtras: heFinal,
                heSupervisor: heFinal,
                horasExtrasPropuestas: heFinal,
                horasExtrasAprobadas: prevAprobadas,
                heRevisadas: heRevisadasFinal,
                estadoHE: estadoHEFinal,
                hePendienteValidacion: pendienteFinal,
              },
            };

            const pActualizado: Practicante = {
              ...p,
              registrosDiarios: nuevosRegistros,
              asistencia: nuevaAsistencia,
            };

            return {
              ...pActualizado,
              hePendienteValidacion: tieneHePendienteGlobal(pActualizado, nuevasActividadesDiarias),
            };
          });

          return {
            actividadesDiarias: nuevasActividadesDiarias,
            practicantes: nuevosPracticantes,
          };
        });
      },

      // ── Módulo de Asistencia, Incidencias y Hikvision ─────────────────
      borradorDiario: {},
      mostrarAlertasFaltantes: false,
      marcarBorrador: (practicanteId, estado) => {
        set((state) => ({
          borradorDiario: {
            ...state.borradorDiario,
            [practicanteId]: estado
          }
        }))
      },
      setMostrarAlertasFaltantes: (valor) => {
        set({ mostrarAlertasFaltantes: valor })
      },
      confirmarLoteDiario: (fechaISO, observaciones) => {
        set((state) => {
          const nuevosPracticantes = state.practicantes.map((p) => {
            const estadoBorrador = state.borradorDiario[p.id]
            const datoObs = observaciones.find((o) => o.id === p.id)

            if (!estadoBorrador && !datoObs) return p

            const existe = p.historial.some((h) => h.fecha === fechaISO)
            let nuevoHistorial = p.historial

            if (existe) {
              nuevoHistorial = p.historial.map((h) =>
                h.fecha === fechaISO
                  ? {
                    ...h,
                    ...(estadoBorrador ? { estado: estadoBorrador, codigoHoja: estadoACodigo(estadoBorrador) } : {}),
                    ...(datoObs ? { observacion: datoObs.observacion } : {}),
                    fuente: 'SUPERVISOR' as const,
                  }
                  : h
              )
            } else if (estadoBorrador) {
              nuevoHistorial = [
                ...p.historial,
                {
                  fecha: fechaISO,
                  modalidad: (p.modalidadBase?.toLowerCase() || 'presencial') as import('../types').Modalidad,
                  estado: estadoBorrador,
                  codigoHoja: estadoACodigo(estadoBorrador),
                  ...(datoObs ? { observacion: datoObs.observacion } : {}),
                  fuente: 'SUPERVISOR' as const,
                },
              ]
            }

            const asistenciaActual = p.asistencia || {}
            let nuevaAsistencia = asistenciaActual
            if (estadoBorrador) {
              const regAsist = asistenciaActual[fechaISO] || { horasExtraManuales: 0, horasExtraHikvision: 0, faltaCubierta: false }
              const estadoMap: Record<import('../types').EstadoAsistencia, 'Asistió' | 'Tardanza' | 'Falta' | 'Campo' | 'Pendiente' | 'Libre'> = {
                ASISTIO: 'Asistió',
                TARDANZA: 'Tardanza',
                FALTA: 'Falta',
                FALTA_CUBIERTA: 'Falta',
                COMPENSADO: 'Asistió',
                SEMINARIO: 'Asistió',
                CAMPO: 'Campo',
                LIBRE: 'Libre',
                PENDIENTE: 'Pendiente',
              }
              nuevaAsistencia = {
                ...asistenciaActual,
                [fechaISO]: {
                  ...regAsist,
                  estado: estadoMap[estadoBorrador] || 'Pendiente',
                  ...(datoObs ? { observacion: datoObs.observacion } : {})
                }
              }
            }
            return { ...p, historial: nuevoHistorial, asistencia: nuevaAsistencia }
          })

          return {
            practicantes: nuevosPracticantes,
            borradorDiario: {},
            mostrarAlertasFaltantes: false,
          }
        })
      },
      registrarIncidencia: (practicanteId, fecha, datos) => {
        set((state) => {
          const compositeId = `${practicanteId}_${fecha}`;
          let nuevasHorasBalances = state.extraHoursBalances;
          const pExistente = state.practicantes.find(p => p.id === practicanteId);
          const saldoPrevio =
            pExistente?.asistencia?.[fecha]?.horasExtrasAprobadas ??
            pExistente?.asistencia?.[fecha]?.horasExtraManuales ??
            0;
          const nuevoSaldoHE = datos.horasExtrasAprobadas ?? datos.horasExtraManuales;

          if (nuevoSaldoHE !== undefined && nuevoSaldoHE !== saldoPrevio) {
            const diferencia = nuevoSaldoHE - saldoPrevio;
            if (diferencia !== 0) {
              nuevasHorasBalances = state.extraHoursBalances.map((b) => {
                if (b.practicanteId !== practicanteId) return b;
                const nuevo = Math.max(0, b.horasDisponibles + diferencia);
                const mov = {
                  id: `he-oficial-${Date.now()}`,
                  tipo: (diferencia > 0 ? 'acumulo' : 'deduccion') as 'acumulo' | 'deduccion',
                  horas: Math.abs(diferencia),
                  fecha: new Date().toISOString().split('T')[0],
                  fechaAsistencia: fecha,
                  descripcion: `HE validadas por Gerencia (${fecha})`,
                  balanceResultante: nuevo,
                };
                return {
                  ...b,
                  horasDisponibles: nuevo,
                  historial: [...b.historial, mov],
                };
              });
            }
          }

          const actDiariaPrev = state.actividadesDiarias.find(
            (a) => a.id === compositeId || (a.practicanteId === practicanteId && a.fecha === fecha)
          );
          const asisPrev = pExistente?.asistencia?.[fecha];
          const regDiarioPrev = pExistente?.registrosDiarios?.[fecha];

          // REQUERIMIENTO 3: Preservar horasExtrasPropuestas por el supervisor
          const propuestasPreservadas =
            asisPrev?.horasExtrasPropuestas ??
            asisPrev?.horasExtraSupervisor ??
            actDiariaPrev?.horasExtrasPropuestas ??
            regDiarioPrev?.horasExtrasPropuestas ??
            regDiarioPrev?.horasExtras ??
            regDiarioPrev?.heSupervisor ??
            0;

          const aprobadasFinal =
            datos.horasExtrasAprobadas ??
            datos.horasExtraManuales ??
            asisPrev?.horasExtrasAprobadas ??
            asisPrev?.horasExtraManuales ??
            0;

          const estadoHEFinal: EstadoHE =
            datos.estadoHE ??
            (propuestasPreservadas > 0 && aprobadasFinal === 0 ? 'rechazado' : 'aprobado');

          const nuevasActividadesDiarias = state.actividadesDiarias.map((a) => {
            if (a.id === compositeId || (a.practicanteId === practicanteId && a.fecha === fecha)) {
              return {
                ...a,
                horasExtrasPropuestas: a.horasExtrasPropuestas ?? propuestasPreservadas,
                horasExtrasAprobadas: aprobadasFinal,
                heRevisadas: true,
                estadoHE: estadoHEFinal,
              };
            }
            return a;
          });

          const nuevosPracticantes = state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p;
            const asistencia = p.asistencia || {};
            const actual = asistencia[fecha] || { estado: 'Pendiente', horasExtraManuales: 0, horasExtraHikvision: 0, faltaCubierta: false };

            const nuevoHistorial = p.historial.map(h =>
              h.fecha === fecha && datos.observacion !== undefined
                ? { ...h, observacion: datos.observacion }
                : h
            );

            const nuevaAsistenciaFecha = {
              ...actual,
              ...datos,
              horasExtraManuales: aprobadasFinal,
              horasExtrasAprobadas: aprobadasFinal,
              horasExtraSupervisor: propuestasPreservadas,
              horasExtrasPropuestas: propuestasPreservadas,
              heRevisadas: true,
              estadoHE: estadoHEFinal,
              hePendienteValidacion: false,
            };

            const nuevaAsistencia = {
              ...asistencia,
              [fecha]: nuevaAsistenciaFecha,
            };

            const balancePracticante = nuevasHorasBalances.find(b => b.practicanteId === practicanteId);

            const registros = p.registrosDiarios || {};
            const regDiarioFecha = registros[fecha];
            const nuevosRegistros = regDiarioFecha
              ? {
                  ...registros,
                  [fecha]: {
                    ...regDiarioFecha,
                    horasExtras: regDiarioFecha.horasExtras ?? propuestasPreservadas,
                    heSupervisor: regDiarioFecha.heSupervisor ?? propuestasPreservadas,
                    horasExtrasPropuestas: regDiarioFecha.horasExtrasPropuestas ?? regDiarioFecha.horasExtras ?? propuestasPreservadas,
                    horasExtrasAprobadas: aprobadasFinal,
                    heRevisadas: true,
                    estadoHE: estadoHEFinal,
                    hePendienteValidacion: false,
                  },
                }
              : registros;

            const pActualizado: Practicante = {
              ...p,
              saldoHorasExtras: balancePracticante ? balancePracticante.horasDisponibles : p.saldoHorasExtras,
              historial: nuevoHistorial,
              asistencia: nuevaAsistencia,
              registrosDiarios: nuevosRegistros,
            };

            return {
              ...pActualizado,
              hePendienteValidacion: tieneHePendienteGlobal(pActualizado, nuevasActividadesDiarias),
            };
          });

          return {
            practicantes: nuevosPracticantes,
            extraHoursBalances: nuevasHorasBalances,
            actividadesDiarias: nuevasActividadesDiarias,
          };
        });
      },
      cubrirFaltaConComodin: (practicanteId, fecha) => {
        set((state) => {
          let horasExtraTotales = 0
          const balance = state.extraHoursBalances.find(b => b.practicanteId === practicanteId)
          if (balance) {
            horasExtraTotales = balance.horasDisponibles
          }

          if (horasExtraTotales < 6) {
            return state // No hay horas suficientes
          }

          return {
            extraHoursBalances: state.extraHoursBalances.map(b => {
              if (b.practicanteId !== practicanteId) return b
              return {
                ...b,
                horasDisponibles: b.horasDisponibles - 6,
                historial: [...b.historial, {
                  id: `he-comodin-${Date.now()}`,
                  tipo: 'deduccion',
                  horas: 6,
                  fecha: new Date().toISOString().split('T')[0],
                  descripcion: `Falta cubierta con comodín (${fecha})`,
                  balanceResultante: b.horasDisponibles - 6
                }]
              }
            }),
            practicantes: state.practicantes.map(p => {
              if (p.id !== practicanteId) return p
              const asistencia = p.asistencia || {}
              const actual = asistencia[fecha]
              const nuevoSaldo = Math.max(0, (p.saldoHorasExtras ?? horasExtraTotales) - 6)
              if (actual && actual.estado === 'Falta') {
                return {
                  ...p,
                  saldoHorasExtras: nuevoSaldo,
                  asistencia: {
                    ...asistencia,
                    [fecha]: { ...actual, faltaCubierta: true }
                  }
                }
              }
              return { ...p, saldoHorasExtras: nuevoSaldo }
            })
          }
        })
      },
      evaluarTardanzas: (practicanteId) => {
        set((state) => ({
          practicantes: state.practicantes.map(p => {
            if (p.id !== practicanteId) return p

            const hoy = new Date()
            const mesActual = hoy.getMonth()
            const añoActual = hoy.getFullYear()

            let tardanzasCount = 0
            if (p.asistencia) {
              Object.entries(p.asistencia).forEach(([fecha, reg]) => {
                const d = new Date(fecha)
                if (d.getMonth() === mesActual && d.getFullYear() === añoActual && reg.estado === 'Tardanza') {
                  tardanzasCount++
                }
              })
            }

            if (tardanzasCount > 0 && tardanzasCount % 3 === 0) {
              const fechaHoyStr = hoy.toISOString().split('T')[0]
              const asistencia = p.asistencia || {}
              return {
                ...p,
                asistencia: {
                  ...asistencia,
                  [fechaHoyStr]: {
                    ...(asistencia[fechaHoyStr] || { horasExtraManuales: 0, horasExtraHikvision: 0, faltaCubierta: false }),
                    estado: 'Falta',
                    observacion: 'Falta generada por acumular 3 tardanzas'
                  }
                }
              }
            }
            return p
          })
        }))
      },

      // ── Configuración Institucional y Semestral ───────────────────
      datosEmpresa: {
        ruc: '20569033561',
        razonSocial: 'MACROMEC J&S S.A.C.',
        correo: 'contacto@macromec.com.pe',
        telefono: '999888777',
        direccion: 'JR. VISTA ALEGRE NRO. 1381',
        departamento: 'JUNIN',
        provincia: 'HUANCAYO',
        distrito: 'SICAYA'
      },
      actualizarDatosEmpresa: (nuevosDatos) => set((state) => ({
        datosEmpresa: { ...state.datosEmpresa, ...nuevosDatos }
      })),

      macromecConfig: MOCK_MACROMEC_CONFIG,
      carreras: MOCK_CARRERAS,
      especialistas: MOCK_ESPECIALISTAS,
      semestres: MOCK_SEMESTRES,
      plantillaAceptacion: MOCK_PLANTILLA,
      monitores: MOCK_MONITORES,

      updateMacromecConfig: (config) => set((state) => ({ macromecConfig: { ...state.macromecConfig, ...config } })),
      addCarrera: (carrera) => set((state) => ({ carreras: [...state.carreras, carrera] })),
      updateCarrera: (id, data) => set((state) => ({ carreras: state.carreras.map(c => c.id === id ? { ...c, ...data } : c) })),
      addEspecialista: (especialista) => set((state) => ({ especialistas: [...state.especialistas, especialista] })),
      updateEspecialista: (id, data) => set((state) => ({ especialistas: state.especialistas.map(e => e.id === id ? { ...e, ...data } : e) })),
      deleteEspecialista: (id) => set((state) => {
        return {
          especialistas: state.especialistas.filter(e => e.id !== id),
        }
      }),
      addSemestre: (semestre) => set((state) => ({ semestres: [...state.semestres, semestre] })),
      updateSemestre: (id, data) => set((state) => ({ semestres: state.semestres.map(s => s.id === id ? { ...s, ...data } : s) })),
      updateSemestreCalendario: (datos) => set((state) => ({
        semestres: state.semestres.map((s, idx) => idx === 0 ? { ...s, ...datos } : s),
        periodos: state.periodos.map(p => {
          if (p.estado === 'activo') {
            return {
              ...p,
              fechaInicioConvenio: datos.fechaInicioConvenio ?? p.fechaInicioConvenio,
              fechaFinConvenio: datos.fechaFinConvenio ?? p.fechaFinConvenio,
            };
          }
          return p;
        })
      })),
      agregarFeriado: (fecha, motivo) => set((state) => {
        const nuevoFeriado = { id: `f-${Date.now()}`, fecha, motivo };
        return {
          periodos: state.periodos.map(p => {
            if (p.estado === 'activo') {
              const feriados = p.feriados || [];
              return { ...p, feriados: [...feriados, nuevoFeriado] };
            }
            return p;
          }),
          semestres: state.semestres.map((s, idx) => {
            if (idx !== 0) return s;
            return { ...s, feriados: [...(s.feriados || []), nuevoFeriado] };
          })
        };
      }),
      eliminarFeriado: (id) => set((state) => ({
        periodos: state.periodos.map(p => {
          if (p.estado === 'activo') {
            return { ...p, feriados: (p.feriados || []).filter(f => f.id !== id) };
          }
          return p;
        }),
        semestres: state.semestres.map((s, idx) => {
          if (idx !== 0) return s;
          return { ...s, feriados: (s.feriados || []).filter(f => f.id !== id) };
        })
      })),
      updatePlantilla: (plantilla) => set((state) => ({ plantillaAceptacion: { ...state.plantillaAceptacion, ...plantilla } })),
      isConvocatoriaAbierta: () => {
        const sem = get().semestres[0];
        if (!sem) return false;
        if (sem.forzarCierrePostulacion) return false;
        if (sem.limitePostulantes && sem.limitePostulantes > 0) {
          if ((get().postulaciones?.length || 0) >= sem.limitePostulantes) return false;
        }
        const hoy = new Date().toISOString().split('T')[0];
        if (sem.fechaInicioPostulacion && hoy < sem.fechaInicioPostulacion) return false;
        if (sem.fechaFinPostulacion && hoy > sem.fechaFinPostulacion) return false;
        return true;
      },

      // ── Periodos Académicos (Motor ERP & Máquina del Tiempo) ───────
      periodos: MOCK_PERIODOS,
      periodoVisualizacionId:
        MOCK_PERIODOS.find((p) => p.estado === 'activo')?.id ||
        MOCK_PERIODOS[0]?.id ||
        'per-2026-02',
      setPeriodoVisualizacionId: (id) => set({ periodoVisualizacionId: id }),
      getPeriodoActivo: () => {
        return get().periodos.find(p => p.estado === 'activo') || get().periodos[0];
      },
      crearPeriodoBorrador: (payload) => {
        const borradorId = `per-${payload.nombre.toLowerCase().replace(/\s+/g, '-')}-draft`;
        const nuevoBorrador: PeriodoAcademico = {
          id: borradorId,
          nombre: payload.nombre,
          fechaInicio: payload.fechaInicio,
          fechaFin: payload.fechaFin,
          estado: 'borrador',
          clonarRoles: payload.clonarRoles ?? true,
        };
        set(state => ({
          periodos: [...state.periodos.filter(p => p.id !== borradorId), nuevoBorrador]
        }));
      },
      lanzarNuevoPeriodo: (payload) => {
        const nuevoPeriodoId = `per-${payload.nombre.toLowerCase().replace(/\s+/g, '-')}`;
        set(state => {
          const periodoPrevio =
            state.periodos.find((p) => p.estado === 'activo') || state.periodos[0];
          const periodoPrevioId = periodoPrevio?.id || 'per-2026-02';

          // 1. Cerrar periodos anteriores activos y eliminar borrador homónimo si existía
          const draftId = `${nuevoPeriodoId}-draft`;
          const periodosActualizados: PeriodoAcademico[] = state.periodos
            .filter((p) => p.id !== draftId)
            .map((p) =>
              p.estado === 'activo' ? { ...p, estado: 'cerrado' as const } : p
            );

          // 2. Agregar o activar nuevo periodo
          const existeIdx = periodosActualizados.findIndex(p => p.id === nuevoPeriodoId);
          const nuevoObj: PeriodoAcademico = {
            id: nuevoPeriodoId,
            nombre: payload.nombre,
            fechaInicio: payload.fechaInicio,
            fechaFin: payload.fechaFin,
            estado: 'activo',
            clonarRoles: payload.clonarRoles ?? true,
            fechaInicioConvenio: payload.fechaInicio,
            fechaFinConvenio: sumarDosMeses(payload.fechaInicio),
            feriados: [],
          };
          if (existeIdx >= 0) {
            periodosActualizados[existeIdx] = {
              ...periodosActualizados[existeIdx],
              ...nuevoObj,
            };
          } else {
            periodosActualizados.push(nuevoObj);
          }

          // 3. Transición relacional de practicantes:
          // - Periodos ya cerrados: se conservan intactos.
          // - Egresar / De Baja (o ya Retirados): permanecen archivados en periodoPrevioId.
          // - Promover: el registro previo se conserva intacto en periodoPrevioId y se clona un nuevo registro limpio para nuevoPeriodoId.
          const existingIds = new Set(state.practicantes.map((pr) => pr.id));
          const practicantesActualizados: Practicante[] = [];
          const nuevosBalances: ExtraHoursBalance[] = [];

          state.practicantes.forEach((p) => {
            const periodOfP = p.periodo_id || p.periodoId || periodoPrevioId;

            // Conservar intactos practicantes de ciclos anteriores cerrados o ya pertenecientes al destino
            if (periodOfP !== periodoPrevioId || periodOfP === nuevoPeriodoId) {
              practicantesActualizados.push({
                ...p,
                periodo_id: periodOfP,
                periodoId: periodOfP,
                estadoGlobal: p.estadoGlobal || (p.estadoLaboral === 'retirado' ? 'RETIRADO' : 'ACTIVO'),
              });
              return;
            }

            // Alumnos que ya estaban retirados en el ciclo previo se archivan sin clonarse al nuevo ciclo
            if (
              p.estadoGlobal === 'RETIRADO' ||
              p.estadoGlobal === 'EGRESADO' ||
              p.estadoGlobal === 'BAJA' ||
              p.estadoLaboral === 'retirado' ||
              p.estado === 'retirado'
            ) {
              const estadoArchivado: EstadoGlobalPracticante =
                p.estadoGlobal && p.estadoGlobal !== 'ACTIVO'
                  ? p.estadoGlobal
                  : 'RETIRADO';
              practicantesActualizados.push({
                ...p,
                periodo_id: periodoPrevioId,
                periodoId: periodoPrevioId,
                estadoGlobal: estadoArchivado,
                estadoLaboral: 'retirado',
                estado: 'retirado',
              });
              return;
            }

            const accion =
              payload.promociones[p.id] ||
              (p.semestre === 'S6' ? 'egresar' : 'promover');

            if (accion === 'egresar' || accion === 'retirado') {
              const estadoCierre: EstadoGlobalPracticante =
                accion === 'egresar' ? 'EGRESADO' : 'BAJA';
              practicantesActualizados.push({
                ...p,
                periodo_id: periodoPrevioId,
                periodoId: periodoPrevioId,
                estadoGlobal: estadoCierre,
                estadoLaboral: 'retirado',
                estado: 'retirado',
                motivoRetiro:
                  accion === 'egresar'
                    ? 'Egresado al cierre del periodo'
                    : 'Dado de baja al cierre del periodo',
                fechaRetiro: p.fechaRetiro || payload.fechaInicio,
              });
              return;
            }

            // Caso 'promover':
            // A) Mantener registro histórico del ciclo cerrado intacto en periodoPrevioId
            practicantesActualizados.push({
              ...p,
              periodo_id: periodoPrevioId,
              periodoId: periodoPrevioId,
              estadoGlobal: p.estadoGlobal || 'ACTIVO',
            });

            // B) Clonar nuevo registro en nuevoPeriodoId con transaccional en cero
            const baseId = p.id.replace(/__per-.*$/, '');
            let nuevoId = `${baseId}__${nuevoPeriodoId}`;
            while (existingIds.has(nuevoId)) {
              nuevoId = `${baseId}__${nuevoPeriodoId}_${Math.random().toString(36).slice(2, 6)}`;
            }
            existingIds.add(nuevoId);

            const nuevoSemestre =
              p.semestre === 'S4'
                ? 'S5'
                : p.semestre === 'S5'
                ? 'S6'
                : p.semestre;
            const supervisorAsignado = payload.supervisores?.[p.id] || p.monitorId;

            const nuevoPromovido: Practicante = {
              id: nuevoId,
              periodo_id: nuevoPeriodoId,
              periodoId: nuevoPeriodoId,
              nombre: p.nombre,
              apellido: p.apellido,
              email: p.email,
              correo: p.correo || p.email,
              fechaNacimiento: p.fechaNacimiento,
              dni: p.dni,
              tel: p.tel,
              celular: p.celular,
              telefono: p.telefono || p.celular || p.tel,
              password: p.password || p.dni,
              carrera: p.carrera,
              carreraId: p.carreraId,
              semestre: nuevoSemestre,
              monitorId: supervisorAsignado,
              supervisorId: supervisorAsignado,
              modalidadBase: p.modalidadBase,
              horasSemanalesTarget: p.horasSemanalesTarget,
              fechaIngreso: payload.fechaInicio,
              hikvisionSync: false,
              estadoGlobal: 'ACTIVO',
              estadoLaboral: 'activo',
              estado: 'activo',
              motivoRetiro: undefined,
              fechaRetiro: undefined,
              retiro: undefined,
              // Datos transaccionales iniciados en cero/vacíos para el nuevo periodo
              historial: [],
              asistencia: {},
              registrosDiarios: {},
              horarioAprobado: undefined,
              horarioVigente: undefined,
              horarioActual: undefined,
              horarioPendiente: undefined,
              semanasHojaFisica: [],
              entregaHojaFisica: false,
              almuerzosConfirmados: [],
              saldoHorasExtras: 0,
              hePendienteValidacion: false,
              documentos: {
                cartaPresentacion: null,
                evidenciaFormulario: null,
                cartaAceptacionFirmada: null,
                convenioFirmado: null,
                registroVinculacion: null,
                peaArchivo: null,
                peaArchivos: [],
              },
            };

            practicantesActualizados.push(nuevoPromovido);
            nuevosBalances.push({
              practicanteId: nuevoId,
              horasDisponibles: 0,
              historial: [],
            });
          });

          // 4. Conservar balances existentes intactos y añadir balances en 0 para los promovidos
          const existingBalanceIds = new Set(state.extraHoursBalances.map((b) => b.practicanteId));
          const balancesActualizados = [
            ...state.extraHoursBalances,
            ...nuevosBalances.filter((b) => !existingBalanceIds.has(b.practicanteId)),
          ];

          return {
            periodos: periodosActualizados,
            practicantes: practicantesActualizados,
            extraHoursBalances: balancesActualizados,
            periodoVisualizacionId: nuevoPeriodoId,
          };
        });
      },
      cerrarPeriodo: (periodoId) => {
        set(state => ({
          periodos: state.periodos.map(p =>
            p.id === periodoId ? { ...p, estado: 'cerrado' as const } : p
          )
        }));
      },

      // ── Postulaciones ─────────────────────────────────────────
      postulaciones: MOCK_POSTULANTES,
      addPostulacion: (postulante) => set((state) => ({ postulaciones: [...state.postulaciones, postulante] })),
      updatePostulacion: (id, data) => set((state) => ({ postulaciones: state.postulaciones.map(p => p.id === id ? { ...p, ...data } : p) })),
      removePostulacion: (id) => set((state) => ({ postulaciones: state.postulaciones.filter(p => p.id !== id) })),
    }),
    {
      name: 'macromec-v2-storage',
      merge: (persistedState: any, currentState) => {
        // Limpiar informes observados que hayan heredado documento
        if (persistedState?.informesQuincenales && Array.isArray(persistedState.informesQuincenales)) {
          persistedState.informesQuincenales = persistedState.informesQuincenales.map((inf: any) => {
            if (inf.estado === 'observado' && inf.archivoFirmadoBase64 === inf.archivoPracticanteBase64) {
              return { ...inf, archivoFirmadoBase64: undefined, nombreArchivoFirmado: undefined, tipoMimeFirmado: undefined };
            }
            return inf;
          });
        }
        if (persistedState?.carreras?.length === 3) {
          persistedState.carreras = MOCK_CARRERAS;
        }
        // Asegurar que las carreras tengan la propiedad 'peas'
        if (persistedState?.carreras && Array.isArray(persistedState.carreras)) {
          persistedState.carreras = persistedState.carreras.map((c: any) => {
            if (!c.peas || c.peas.length === 0) {
              const mock = MOCK_CARRERAS.find(mc => mc.id === c.id);
              if (mock?.peas) {
                c.peas = mock.peas;
              } else if (c.peaArchivos) {
                c.peas = c.peaArchivos;
              }
            }
            return c;
          });
        }
        // Limpiar cache si especialistas tiene el formato antiguo (propiedad 'nombre' en vez de 'nombres')
        if (persistedState?.especialistas && persistedState.especialistas.length > 0 && 'nombre' in persistedState.especialistas[0]) {
          persistedState.especialistas = MOCK_ESPECIALISTAS;
        }
        if (persistedState?.periodos && Array.isArray(persistedState.periodos)) {
          persistedState.periodos = persistedState.periodos.map((p: any) => {
            if (p.estado === 'activo') {
              return {
                ...p,
                fechaInicioConvenio: p.fechaInicioConvenio || p.fechaInicio || '2026-08-03',
                fechaFinConvenio: p.fechaFinConvenio || sumarDosMeses(p.fechaInicio || '2026-08-03'),
                feriados: (p.feriados && p.feriados.length > 0) ? p.feriados : [
                  { id: 'f-1', fecha: '2026-08-30', motivo: 'Santa Rosa de Lima' },
                  { id: 'f-2', fecha: '2026-10-08', motivo: 'Combate de Angamos' },
                  { id: 'f-3', fecha: '2026-11-01', motivo: 'Día de Todos los Santos' },
                  { id: 'f-4', fecha: '2026-12-08', motivo: 'Inmaculada Concepción' },
                ],
              };
            }
            return p;
          });
        }
        // Limpiar cache para forzar los feriados a objetos y datos SENATI
        if (persistedState?.semestres && persistedState.semestres.length > 0) {
          const first = persistedState.semestres[0];
          if (first.forzarCierrePostulacion === undefined) first.forzarCierrePostulacion = false;
          if (first.limitePostulantes === undefined) first.limitePostulantes = 0;
          if (first.feriados && typeof first.feriados[0] === 'string') {
            persistedState.semestres = MOCK_SEMESTRES;
          }
        }
        // Actualizar automáticamente la plantilla legacy básica al nuevo formato institucional A4
        if (
          !persistedState?.plantillaAceptacion?.contenidoHTML ||
          persistedState.plantillaAceptacion.contenidoHTML.includes(
            'nos complace informarle que ha sido aceptado(a)...'
          )
        ) {
          persistedState.plantillaAceptacion = MOCK_PLANTILLA;
        }
        // Limpiar horas extras ficticias heredadas del mock inicial
        if (persistedState?.extraHoursBalances) {
          const tieneFicticias = persistedState.extraHoursBalances.some((b: any) =>
            b.historial?.some((h: any) =>
              h.descripcion?.includes('semana de cierre agosto') ||
              h.descripcion?.includes('apoyo especial')
            )
          );
          if (tieneFicticias) {
            persistedState.extraHoursBalances = EXTRA_HOURS_BALANCES;
          }
        }

        // Asegurar sincronización de horarioVigente, normalización de semestres, heRevisadas y poblar actividadesDiarias
        if (persistedState?.practicantes) {
          const resetearHE = !persistedState?.extraHoursBalances || persistedState.extraHoursBalances.every((b: any) => (b.horasDisponibles || 0) === 0 && (!b.historial || b.historial.length === 0));
          const actsList: any[] = Array.isArray(persistedState.actividadesDiarias) ? [...persistedState.actividadesDiarias] : [];
          const actsMap = new Map<string, any>();
          actsList.forEach((a: any) => {
            const key = a.id || `${a.practicanteId}_${a.fecha}`;
            actsMap.set(key, { ...a, id: key });
          });

          persistedState.practicantes = persistedState.practicantes.map((p: any) => {
            const horario = p.horarioVigente || p.horarioAprobado || p.horarioActual;

            // Normalización de semestre para consistencia S4, S5, S6
            let sem = p.semestre;
            if (sem) {
              const s = String(sem).toUpperCase().trim();
              if (s === 'S4' || s.includes('IV')) sem = 'S4';
              else if (s === 'S6' || s.includes('VI')) sem = 'S6';
              else if (s === 'S5' || s.includes('V')) sem = 'S5';
            }

            const asistenciaOrig = p.asistencia || {};
            const registrosOrig = p.registrosDiarios || {};
            const todasFechas = new Set<string>([
              ...Object.keys(asistenciaOrig),
              ...Object.keys(registrosOrig),
              ...Array.from(actsMap.values()).filter((a: any) => a.practicanteId === p.id).map((a: any) => a.fecha),
            ]);

            const asistenciaSync: Record<string, any> = { ...asistenciaOrig };
            const registrosSync: Record<string, any> = { ...registrosOrig };

            todasFechas.forEach((fecha) => {
              const key = `${p.id}_${fecha}`;
              const asis = asistenciaOrig[fecha];
              const reg = registrosOrig[fecha];
              const act = actsMap.get(key);

              const propuestas =
                act?.horasExtrasPropuestas ??
                asis?.horasExtrasPropuestas ??
                asis?.horasExtraSupervisor ??
                reg?.horasExtrasPropuestas ??
                reg?.horasExtras ??
                reg?.heSupervisor ??
                0;

              const aprobadas =
                asis?.horasExtrasAprobadas ??
                reg?.horasExtrasAprobadas ??
                act?.horasExtrasAprobadas ??
                asis?.horasExtraManuales;

              // Si cualquiera ya marcó heRevisadas === true o si asis.hePendienteValidacion es false (revisado previo) -> true
              let heRevisadas: boolean;
              if (asis?.heRevisadas === true || reg?.heRevisadas === true || act?.heRevisadas === true) {
                heRevisadas = true;
              } else if (asis && asis.hePendienteValidacion === false) {
                heRevisadas = true;
              } else if (propuestas > 0 && (asis?.heRevisadas === false || reg?.heRevisadas === false || act?.heRevisadas === false || asis?.hePendienteValidacion === true || reg?.hePendienteValidacion === true)) {
                heRevisadas = false;
              } else {
                heRevisadas = propuestas <= 0;
              }

              const pendiente = propuestas > 0 && heRevisadas === false;
              const estadoHE: EstadoHE =
                asis?.estadoHE ??
                reg?.estadoHE ??
                act?.estadoHE ??
                (pendiente ? 'pendiente' : (propuestas > 0 && (aprobadas ?? 0) === 0 ? 'rechazado' : 'aprobado'));

              if (asis) {
                asistenciaSync[fecha] = {
                  ...asis,
                  horasExtraSupervisor: propuestas,
                  horasExtrasPropuestas: propuestas,
                  ...(aprobadas !== undefined ? { horasExtrasAprobadas: aprobadas } : {}),
                  heRevisadas,
                  estadoHE,
                  hePendienteValidacion: pendiente,
                };
              }

              if (reg) {
                registrosSync[fecha] = {
                  ...reg,
                  horasExtras: reg.horasExtras ?? propuestas,
                  heSupervisor: reg.heSupervisor ?? propuestas,
                  horasExtrasPropuestas: propuestas,
                  ...(aprobadas !== undefined ? { horasExtrasAprobadas: aprobadas } : {}),
                  heRevisadas,
                  estadoHE,
                  hePendienteValidacion: pendiente,
                };
              }

              if (act) {
                actsMap.set(key, {
                  ...act,
                  horasExtrasPropuestas: act.horasExtrasPropuestas ?? propuestas,
                  ...(aprobadas !== undefined ? { horasExtrasAprobadas: aprobadas } : {}),
                  heRevisadas,
                  estadoHE,
                });
              } else if (reg) {
                actsMap.set(key, {
                  id: key,
                  practicanteId: p.id,
                  fecha,
                  actividades: reg.actividades || [],
                  horasExtrasPropuestas: propuestas,
                  ...(aprobadas !== undefined ? { horasExtrasAprobadas: aprobadas } : {}),
                  heRevisadas,
                  estadoHE,
                  historialVersiones: reg.historialVersiones,
                  nombreAutor: reg.historialVersiones?.[reg.historialVersiones.length - 1]?.autor,
                });
              }
            });

            const pIdPeriod = p.periodo_id || p.periodoId || 'per-2026-02';
            const derivedEstadoGlobal: EstadoGlobalPracticante =
              p.estadoGlobal ||
              (p.motivoRetiro?.toLowerCase().includes('egresad')
                ? 'EGRESADO'
                : p.motivoRetiro?.toLowerCase().includes('baja')
                ? 'BAJA'
                : String(p.estadoLaboral || '').toLowerCase() === 'retirado' ||
                    String(p.estado || '').toLowerCase() === 'retirado' ||
                    !!p.retiro
                ? 'RETIRADO'
                : 'ACTIVO');

            const pNormalized: any = {
              ...p,
              semestre: sem || p.semestre,
              periodo_id: pIdPeriod,
              periodoId: pIdPeriod,
              estadoGlobal: derivedEstadoGlobal,
              motivoRetiro: p.motivoRetiro || p.retiro?.motivo,
              password: p.password || p.dni,
              correo: p.correo || p.email || '',
              telefono: p.telefono || p.celular || p.tel || '',
              supervisorId: p.supervisorId || p.monitorId,
              asistencia: asistenciaSync,
              registrosDiarios: registrosSync,
              saldoHorasExtras: resetearHE ? 0 : (p.saldoHorasExtras ?? 0),
              horarioVigente: p.horarioVigente || (horario ? { ...horario, estado: horario.estado || 'Aprobado' } : undefined),
              horarioAprobado: p.horarioAprobado || (horario ? { ...horario, estado: horario.estado || 'Aprobado' } : undefined),
            };

            const actsArrayTmp = Array.from(actsMap.values());
            pNormalized.hePendienteValidacion = tieneHePendienteGlobal(pNormalized, actsArrayTmp);
            return pNormalized;
          });

          persistedState.actividadesDiarias = Array.from(actsMap.values());
        }

        if (persistedState?.monitores && Array.isArray(persistedState.monitores)) {
          persistedState.monitores = persistedState.monitores.map((m: any) => {
            const mockMatch = MOCK_MONITORES.find((mm) => mm.id === m.id);
            return {
              ...m,
              correo: m.correo || m.correoGmail || '',
              telefono: m.telefono || m.celular || '',
              fechaNacimiento: m.fechaNacimiento || mockMatch?.fechaNacimiento || '',
              password: m.password || m.dni || '',
              modalidadBase: m.modalidadBase || 'Presencial',
              estado: m.estado || 'Activo',
              estadoGlobal:
                m.estadoGlobal ||
                (m.estado === 'Suspendido' ? 'SUSPENDIDO' : 'ACTIVO'),
            };
          });
        }

        const periodosDisponibles: PeriodoAcademico[] =
          (persistedState?.periodos && persistedState.periodos.length > 0)
            ? persistedState.periodos
            : currentState.periodos;
        const periodoActivoMerge =
          periodosDisponibles.find((p) => p.estado === 'activo') || periodosDisponibles[0];
        if (
          !persistedState?.periodoVisualizacionId ||
          !periodosDisponibles.some((p) => p.id === persistedState.periodoVisualizacionId)
        ) {
          persistedState.periodoVisualizacionId =
            periodoActivoMerge?.id || 'per-2026-02';
        }

        return { ...currentState, ...persistedState }
      },
      partialize: (state) => ({
        tabActiva: state.tabActiva,
        practicantes: state.practicantes,
        practicanteSeleccionadoId: state.practicanteSeleccionadoId,
        extraHoursBalances: state.extraHoursBalances,
        informesQuincenales: state.informesQuincenales,
        usuariosSistema: state.usuariosSistema,
        macromecConfig: state.macromecConfig,
        carreras: state.carreras,
        especialistas: state.especialistas,
        semestres: state.semestres,
        plantillaAceptacion: state.plantillaAceptacion,
        monitores: state.monitores,
        postulaciones: state.postulaciones,
        periodos: state.periodos,
        periodoVisualizacionId: state.periodoVisualizacionId,
        actividadesDiarias: state.actividadesDiarias,
      }),
    },
  ),
)

// ── Helper: estado → código hoja ────────────────────────────
function estadoACodigo(
  estado: EstadoAsistencia,
): import('../types').CodigoHoja {
  const map: Record<EstadoAsistencia, import('../types').CodigoHoja> = {
    ASISTIO: 'P',
    TARDANZA: 'T',
    FALTA: 'F',
    FALTA_CUBIERTA: 'F*',
    COMPENSADO: 'HE',
    SEMINARIO: 'S',
    CAMPO: 'C',
    LIBRE: 'L',
    PENDIENTE: '-',
  }
  return map[estado]
}
