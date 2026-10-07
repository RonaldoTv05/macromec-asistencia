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
  ActividadDiaria
} from '../types'

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
  rechazarHorario: (practicanteId: string) => void

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
  enviarInformeQuincenal: (informe: Omit<InformeQuincenal, 'id' | 'estado'>) => void
  aceptarInformeQuincenal: (informeId: string, feedback: string) => void
  procesarInformeMonitor: (informeId: string, nuevoEstado: 'observado' | 'aprobado_y_firmado', feedback: string, archivoFirmado?: string) => void

  // ── Postulaciones (RF-13) ─────────────────────────────────────────
  postulaciones: Postulante[]
  addPostulacion: (postulante: Postulante) => void
  updatePostulacion: (id: string, data: Partial<Postulante>) => void
  removePostulacion: (id: string) => void

  // ── Registro Diario de Actividades ────────────────────────────────
  guardarRegistroDiario: (practicanteId: string, fecha: string, actividades: ActividadDiaria[], nombreAutor: string) => void

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
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
export const enviarCredencialesWhatsApp = async (celular: string, nombre: string, pass: string, rol: string) => {
  return new Promise((resolve) => setTimeout(resolve, 1500));
};

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
        // 1.5. Fallback defensivo con tipado estricto (sin any)
        if (carrera && !carrera.asignaciones) {
          const carrerasDefault = get().carreras || [];
          carrera = carrerasDefault.find((c: Carrera) => c.id === carreraId || c.nombre === carreraId);
        }

        if (!carrera || !carrera.asignaciones) return undefined;

        // 2. Normalizar el semestre entrante ('VI Semestre' -> 'S6')
        const normalizeSemestre = (s: string) => {
          if (!s) return '';
          const upper = s.toUpperCase();
          if (upper.includes('IV ') || upper === 'S4') return 'S4';
          if (upper.includes('VI ') || upper === 'S6') return 'S6';
          if (upper.includes('V ') || upper === 'S5') return 'S5';
          return s; // Fallback
        };
        const semNormalizado = normalizeSemestre(semestre);

        // 3. Encontrar la asignación que incluya este semestre normalizado
        const asignacion = carrera.asignaciones.find(a => a.semestres.includes(semNormalizado));
        if (!asignacion) return undefined;

        // 4. Devolver el especialista
        return especialistas.find(e => e.id === asignacion.especialistaId);
      },

      login: (dni: string, pass: string) => {
        const dSafe = dni.trim().replace(/<[^>]*>/g, '');
        const pSafe = pass.replace(/<[^>]*>/g, '');
        const errorSuspension = 'Su cuenta está suspendida por inactividad/retiro. Si crees que fue un error contáctese con el Admin (número: +51 979 134 594)';

        // 1. Gerencia
        const adminGerencia = get().usuariosSistema.find(
          (u) => u.rol === 'GERENCIA' && (u.username === dSafe || u.dni === dSafe) && u.password === pSafe
        );
        if (adminGerencia) {
          set({ usuarioActual: adminGerencia, rolActivo: adminGerencia.rol, tabActiva: 'hoy' } as any);
          return true;
        }

        // 2. Monitores (forzamos el tipado a any para evitar bloqueos)
        const monitor = get().monitores?.find(
          (m: any) => (m.dni === dSafe || m.correoGmail === dSafe) && m.password === pSafe
        ) as any;
        if (monitor) {
          if (monitor.estado === 'Suspendido') {
            return `Su cuenta está suspendida por: ${monitor.motivoSuspension || 'Motivo no especificado'}. Si cree que fue un error contáctese con el Admin (número: +51 979 134 594)`;
          }
          if (monitor.estado === 'Retirado') {
            return errorSuspension;
          }
          set({
            usuarioActual: {
              id: monitor.id,
              username: monitor.dni || monitor.correoGmail || '',
              nombre: monitor.nombre || '',
              rol: 'SUPERVISOR',
              email: monitor.correoGmail || '',
              dni: monitor.dni || '',
              tel: monitor.celular || '',
              carrera: monitor.area || '',
              avatarIniciales: monitor.nombre ? monitor.nombre.slice(0, 2).toUpperCase() : 'SU',
            } as any,
            rolActivo: 'SUPERVISOR' as any,
            tabActiva: 'hoy',
          });
          return true;
        }

        // 3. Practicantes
        const practicante = get().practicantes?.find(
          (p: any) => p.dni === dSafe && (p.password === pSafe || pSafe === p.dni)
        ) as any;
        if (practicante) {
          if (practicante.estadoLaboral === 'retirado' || practicante.estado === 'Retirado' || practicante.estado === 'Suspendido') {
            return errorSuspension;
          }
          set({
            usuarioActual: {
              id: practicante.id,
              username: practicante.dni || '',
              nombre: `${practicante.nombre || ''} ${practicante.apellido || ''}`,
              rol: 'PRACTICANTE',
              email: '',
              dni: practicante.dni || '',
              tel: practicante.celular || '',
              carrera: practicante.carrera || '',
              semestre: practicante.semestre || 'No definido',
              fechaNacimiento: practicante.fechaNacimiento || '',
              modalidadBase: practicante.modalidadBase || '',
              avatarIniciales: (practicante.nombre?.charAt(0) || '') + (practicante.apellido?.charAt(0) || ''),
            } as any,
            rolActivo: 'PRACTICANTE' as any,
            tabActiva: 'hoy',
          });
          return true;
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
        set((state) => ({
          usuariosSistema: [...state.usuariosSistema, usuario]
        }))
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
      addPracticante: (practicante) => set((state) => ({
        practicantes: [...state.practicantes, {
          ...practicante,
          documentos: practicante.documentos ?? {
            cartaPresentacion: null,
            evidenciaFormulario: null,
            cartaAceptacionFirmada: null,
            convenioFirmado: null,
            registroVinculacion: null,
          },
        }]
      })),
      getPracticante: (id) => get().practicantes.find((p) => p.id === id),

      practicanteSeleccionadoId: MOCK_PRACTICANTES[0].id,
      setPracticanteSeleccionadoId: (id) =>
        set({ practicanteSeleccionadoId: id }),

      asignarMonitor: (practicanteId, monitorId) => set((state) => ({
        practicantes: state.practicantes.map((p) =>
          p.id === practicanteId ? { ...p, monitorId } : p
        )
      })),

      removerMonitor: (practicanteId) => set((state) => ({
        practicantes: state.practicantes.map((p) =>
          p.id === practicanteId ? { ...p, monitorId: undefined as any } : p
        )
      })),

      cambiarEstadoSupervisor: (supervisorId, nuevoEstado, motivo) => {
        set((state) => {
          // 1. Cambiar estado del supervisor
          const monitoresActualizados = state.monitores?.map(m =>
            m.id === supervisorId ? { ...m, estado: nuevoEstado, motivoSuspension: motivo || '' } : m
          );

          // 2. CASCADA: Si es Suspendido, liberar a sus practicantes
          let practicantesActualizados = state.practicantes;
          if (nuevoEstado === 'Suspendido') {
            practicantesActualizados = state.practicantes?.map(p =>
              p.monitorId === supervisorId ? { ...p, monitorId: null as any } : p
            );
          }

          return { monitores: monitoresActualizados, practicantes: practicantesActualizados };
        });
      },

      // ── Horario ─────────────────────────────────────────────
      enviarHorario: (practicanteId, dias) => {
        const totalHoras = dias.reduce((s, d) => s + d.horasCalculadas, 0)
        const horario: HorarioSemanal = {
          id: `h-${practicanteId}-${Date.now()}`,
          semana: 38,
          anio: 2026,
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
                ? { ...p, horarioPendiente: undefined }
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
          return { extraHoursBalances: balances }
        })
      },

      aprobarHorario: (practicanteId) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId || !p.horarioPendiente) return p
            return {
              ...p,
              horarioActual: { ...p.horarioPendiente, estado: 'aprobado' },
              horarioPendiente: undefined,
            }
          }),
        }))
      },

      rechazarHorario: (practicanteId) => {
        // Usa la misma lógica de cancelación para revertir y deducir horas extras
        get().cancelarHorario(practicanteId)
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
                  modalidad: p.modalidadBase,
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
            return { ...p, historial: hist }
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
                  modalidad: p.modalidadBase,
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
            return { ...p, historial: hist }
          }),
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
            return {
              ...p,
              estadoLaboral: estado,
              retiro: estado === 'retirado' ? datos?.retiro : undefined,
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
          const nuevoInforme = {
            id: `inf-${Date.now()}`,
            practicanteId: state.usuarioActual?.id || 'p1',
            fechaInicio: payload.fechaInicio,
            fechaFin: payload.fechaFin,
            archivoPracticanteBase64: payload.archivoPracticanteBase64,
            mensajePracticante: payload.mensajePracticante || '',
            estado: 'en_revision' as const,
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
      procesarInformeMonitor: (informeId, nuevoEstado, feedback, archivoFirmado) => {
        set((state) => ({
          informesQuincenales: state.informesQuincenales.map(inf =>
            inf.id === informeId
              ? {
                ...inf,
                estado: nuevoEstado,
                feedbackMonitor: feedback,
                archivoFirmadoBase64: archivoFirmado
              }
              : inf
          )
        }))
      },

      // ── Registro Diario de Actividades ────────────────────────────────
      guardarRegistroDiario: (practicanteId, fecha, actividades, nombreAutor) => {
        set((state) => ({
          practicantes: state.practicantes.map(p => {
            if (p.id !== practicanteId) return p;

            const registros = p.registrosDiarios || {};
            const existeRegistro = !!registros[fecha];

            const nuevaVersion = {
              id: Date.now().toString(),
              fechaEdicion: new Date().toISOString(),
              autor: nombreAutor,
              accion: existeRegistro ? 'editado' : 'creado'
            } as const;

            const historialVersiones = existeRegistro
              ? [...(registros[fecha].historialVersiones || []), nuevaVersion]
              : [nuevaVersion];

            return {
              ...p,
              registrosDiarios: {
                ...registros,
                [fecha]: {
                  fecha,
                  actividades,
                  historialVersiones
                }
              }
            };
          })
        }))
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
                  modalidad: p.modalidadBase,
                  estado: estadoBorrador,
                  codigoHoja: estadoACodigo(estadoBorrador),
                  ...(datoObs ? { observacion: datoObs.observacion } : {}),
                  fuente: 'SUPERVISOR' as const,
                },
              ]
            }

            return { ...p, historial: nuevoHistorial }
          })

          return {
            practicantes: nuevosPracticantes,
            borradorDiario: {},
            mostrarAlertasFaltantes: false,
          }
        })
      },
      registrarIncidencia: (practicanteId, fecha, datos) => {
        set((state) => ({
          practicantes: state.practicantes.map((p) => {
            if (p.id !== practicanteId) return p
            const asistencia = p.asistencia || {}
            const actual = asistencia[fecha] || { estado: 'Pendiente', horasExtraManuales: 0, horasExtraHikvision: 0, faltaCubierta: false }

            const nuevoHistorial = p.historial.map(h =>
              h.fecha === fecha && datos.observacion !== undefined
                ? { ...h, observacion: datos.observacion }
                : h
            )

            return {
              ...p,
              historial: nuevoHistorial,
              asistencia: {
                ...asistencia,
                [fecha]: { ...actual, ...datos }
              }
            }
          })
        }))
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
              if (actual && actual.estado === 'Falta') {
                return {
                  ...p,
                  asistencia: {
                    ...asistencia,
                    [fecha]: { ...actual, faltaCubierta: true }
                  }
                }
              }
              return p
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
        semestres: state.semestres.map((s, idx) => idx === 0 ? { ...s, ...datos } : s)
      })),
      agregarFeriado: (fecha, motivo) => set((state) => ({
        semestres: state.semestres.map((s, idx) => {
          if (idx !== 0) return s;
          const nuevoFeriado = { id: `f-${Date.now()}`, fecha, motivo };
          return { ...s, feriados: [...s.feriados, nuevoFeriado] };
        })
      })),
      eliminarFeriado: (id) => set((state) => ({
        semestres: state.semestres.map((s, idx) => {
          if (idx !== 0) return s;
          return { ...s, feriados: s.feriados.filter(f => f.id !== id) };
        })
      })),
      updatePlantilla: (plantilla) => set((state) => ({ plantillaAceptacion: { ...state.plantillaAceptacion, ...plantilla } })),

      // ── Postulaciones ─────────────────────────────────────────
      postulaciones: [],
      addPostulacion: (postulante) => set((state) => ({ postulaciones: [...state.postulaciones, postulante] })),
      updatePostulacion: (id, data) => set((state) => ({ postulaciones: state.postulaciones.map(p => p.id === id ? { ...p, ...data } : p) })),
      removePostulacion: (id) => set((state) => ({ postulaciones: state.postulaciones.filter(p => p.id !== id) })),
    }),
    {
      name: 'macromec-v2-storage',
      merge: (persistedState: any, currentState) => {
        if (persistedState?.carreras?.length === 3) {
          persistedState.carreras = MOCK_CARRERAS;
        }
        // Limpiar cache si especialistas tiene el formato antiguo (propiedad 'nombre' en vez de 'nombres')
        if (persistedState?.especialistas && persistedState.especialistas.length > 0 && 'nombre' in persistedState.especialistas[0]) {
          persistedState.especialistas = MOCK_ESPECIALISTAS;
        }
        // Limpiar cache para forzar los feriados a objetos y datos SENATI
        if (persistedState?.semestres && persistedState.semestres.length > 0) {
          const first = persistedState.semestres[0];
          if (first.feriados && typeof first.feriados[0] === 'string') {
            persistedState.semestres = MOCK_SEMESTRES;
          }
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
