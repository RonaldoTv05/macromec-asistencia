import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  EXTRA_HOURS_BALANCES,
  MOCK_PRACTICANTES,
  USUARIOS_SISTEMA,
} from '../data/mockData'
import type {
  DiaHorario,
  EstadoAsistencia,
  EstadoLaboral,
  ExtraHoursBalance,
  HorarioSemanal,
  Practicante,
  Rol,
  SuspensionData,
  User,
  VacacionesData,
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
  usuarioActual: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  updatePerfil: (data: Partial<Omit<User, 'id' | 'username' | 'rol'>>) => void

  // ── Rol activo (derivado de usuarioActual) ────────────────
  rolActivo: Rol | null

  // ── Tab activa ────────────────────────────────────────────
  tabActiva: Tab
  setTabActiva: (tab: Tab) => void

  // ── Practicantes ──────────────────────────────────────────
  practicantes: Practicante[]
  getPracticante: (id: string) => Practicante | undefined

  // Practicante seleccionado (para supervisor/admin)
  practicanteSeleccionadoId: string
  setPracticanteSeleccionadoId: (id: string) => void

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

  // ── Estado laboral ────────────────────────────────────────
  setEstadoLaboral: (
    practicanteId: string,
    estado: EstadoLaboral,
    datos?: { suspension?: SuspensionData; vacaciones?: VacacionesData },
  ) => void

  // ── Hoja Física ───────────────────────────────────────────
  toggleEntregaHoja: (practicanteId: string) => void
  toggleSemanaFirmada: (practicanteId: string, semanaNumero: number) => void

  // ── Almuerzos ─────────────────────────────────────────────
  confirmarAlmuerzo: (practicanteId: string, fecha: string) => void
}

// ============================================================
// STORE
// ============================================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Auth ───────────────────────────────────────────────
      usuarioActual: null,
      rolActivo: null,

      login: (username, password) => {
        // Sanitizar inputs básicos
        const uSafe = username.trim().replace(/<[^>]*>/g, '')
        const pSafe = password.replace(/<[^>]*>/g, '')

        const usuario = USUARIOS_SISTEMA.find(
          (u) => u.username === uSafe && u.password === pSafe,
        )
        if (!usuario) return false

        set({
          usuarioActual: usuario,
          rolActivo: usuario.rol,
          tabActiva: 'hoy',
        })
        return true
      },

      logout: () => {
        set({
          usuarioActual: null,
          rolActivo: null,
          tabActiva: 'hoy',
        })
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
      getPracticante: (id) => get().practicantes.find((p) => p.id === id),

      practicanteSeleccionadoId: MOCK_PRACTICANTES[0].id,
      setPracticanteSeleccionadoId: (id) =>
        set({ practicanteSeleccionadoId: id }),

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

      marcarAsistenciaRapida: (practicanteId, estado) => {
        const fechaHoy = '2026-09-18' // Mock
        get().marcarAsistencia(practicanteId, fechaHoy, estado)
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
              suspension:
                estado === 'suspendido' ? datos?.suspension : undefined,
              vacaciones:
                estado === 'vacaciones' ? datos?.vacaciones : undefined,
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
            const arr = Array.isArray(p.almuerzosConfirmados)
              ? p.almuerzosConfirmados
              : []
            return { ...p, almuerzosConfirmados: [...arr, fecha] }
          }),
        }))
      },
    }),
    {
      name: 'macromec-v2-storage',
      partialize: (state) => ({
        tabActiva: state.tabActiva,
        practicantes: state.practicantes,
        practicanteSeleccionadoId: state.practicanteSeleccionadoId,
        extraHoursBalances: state.extraHoursBalances,
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
