import { useState } from 'react'
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Edit3,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
import type { EstadoLaboral, Practicante, SuspensionData, VacacionesData } from '../types'

// ── Sanitización ───────────────────────────────────────────────
function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// ── Badge de estado laboral ────────────────────────────────────
function BadgeEstado({ estado }: { estado: EstadoLaboral }) {
  if (estado === 'suspendido') {
    return (
      <span
        style={{
          background: '#e2e8f0',
          color: '#64748b',
          borderRadius: 9999,
          padding: '2px 10px',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        SUSPENDIDO
      </span>
    )
  }
  if (estado === 'vacaciones') {
    return (
      <span
        style={{
          background: '#fef9c3',
          color: '#854d0e',
          borderRadius: 9999,
          padding: '2px 10px',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        VACACIONES
      </span>
    )
  }
  return (
    <span
      style={{
        background: '#d1fae5',
        color: '#065f46',
        borderRadius: 9999,
        padding: '2px 10px',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      ACTIVO
    </span>
  )
}

// ── Tarjeta de colaborador ─────────────────────────────────────
function TarjetaColaborador({
  practicante,
  onEditarEstado,
}: {
  practicante: Practicante
  onEditarEstado: (p: Practicante) => void
}) {
  const isSuspendido = practicante.estadoLaboral === 'suspendido'
  const isVacaciones = practicante.estadoLaboral === 'vacaciones'

  return (
    <div
      style={{
        background: isSuspendido
          ? '#f8fafc'
          : isVacaciones
            ? '#fffbeb'
            : 'white',
        borderRadius: 14,
        border: isSuspendido
          ? '1px solid #e2e8f0'
          : isVacaciones
            ? '1px solid #fde68a'
            : '1px solid #e2e8f0',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: isSuspendido ? 0.7 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: isSuspendido
            ? '#e2e8f0'
            : isVacaciones
              ? 'linear-gradient(135deg,#fbbf24,#d97706)'
              : 'linear-gradient(135deg,#1E3A8A,#2563EB)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 700,
          color: isSuspendido ? '#94a3b8' : 'white',
          flexShrink: 0,
        }}
      >
        {practicante.nombre[0]}
        {practicante.apellido[0]}
      </div>

      {/* Datos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isSuspendido ? '#94a3b8' : '#1e293b',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {practicante.nombre} {practicante.apellido}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <BadgeEstado estado={practicante.estadoLaboral} />
          <span
            style={{
              fontSize: 10,
              color: '#94a3b8',
              textTransform: 'capitalize',
            }}
          >
            {practicante.modalidadBase}
          </span>
        </div>
        {/* Info de suspensión/vacaciones */}
        {isSuspendido && practicante.suspension && (
          <div
            style={{
              fontSize: 10,
              color: '#64748b',
              marginTop: 3,
              fontStyle: 'italic',
            }}
          >
            {practicante.suspension.vigencia === 'indefinido'
              ? 'Vigencia indefinida'
              : `${practicante.suspension.vigencia} días`}{' '}
            · {practicante.suspension.motivo.slice(0, 30)}…
          </div>
        )}
        {isVacaciones && practicante.vacaciones && (
          <div
            style={{
              fontSize: 10,
              color: '#92400e',
              marginTop: 3,
              fontStyle: 'italic',
            }}
          >
            {practicante.vacaciones.fechaInicio} →{' '}
            {practicante.vacaciones.fechaFin}
          </div>
        )}
      </div>

      {/* Botón editar */}
      <button
        id={`btn-editar-estado-${practicante.id}`}
        onClick={() => onEditarEstado(practicante)}
        style={{
          background: '#f1f5f9',
          border: 'none',
          borderRadius: 10,
          padding: '8px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: '#1E3A8A',
          flexShrink: 0,
        }}
      >
        <Edit3 size={13} />
        Editar
      </button>
    </div>
  )
}

// ── Modal de edición de estado laboral ────────────────────────

type EstadoFormType = 'activo' | 'suspendido' | 'vacaciones'

interface ModalEdicionState {
  open: boolean
  practicante: Practicante | null
}

function ModalEdicionEstado({
  state,
  onCerrar,
}: {
  state: ModalEdicionState
  onCerrar: () => void
}) {
  const setEstadoLaboral = useAppStore((s) => s.setEstadoLaboral)
  const p = state.practicante

  const [estadoSeleccionado, setEstadoSeleccionado] =
    useState<EstadoFormType>(
      (p?.estadoLaboral as EstadoFormType) ?? 'activo',
    )

  // Suspensión
  const [motivoSuspension, setMotivoSuspension] = useState(
    p?.suspension?.motivo ?? '',
  )
  const [vigenciaTipo, setVigenciaTipo] = useState<'dias' | 'indefinido'>(
    p?.suspension?.vigencia === 'indefinido' ? 'indefinido' : 'dias',
  )
  const [vigenciaDias, setVigenciaDias] = useState<number>(
    typeof p?.suspension?.vigencia === 'number'
      ? p.suspension.vigencia
      : 5,
  )

  // Vacaciones
  const [motivoVacaciones, setMotivoVacaciones] = useState(
    p?.vacaciones?.motivo ?? '',
  )
  const [fechaInicioVac, setFechaInicioVac] = useState(
    p?.vacaciones?.fechaInicio ?? new Date().toISOString().split('T')[0],
  )
  const [fechaFinVac, setFechaFinVac] = useState(
    p?.vacaciones?.fechaFin ?? '',
  )

  if (!p) return null

  const calcDias = () => {
    if (!fechaInicioVac || !fechaFinVac) return 0
    const ini = new Date(fechaInicioVac)
    const fin = new Date(fechaFinVac)
    const diff = Math.ceil(
      (fin.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24),
    )
    return Math.max(0, diff)
  }

  const handleGuardar = () => {
    if (estadoSeleccionado === 'suspendido') {
      if (!motivoSuspension.trim()) {
        toast.error('El motivo de suspensión es obligatorio')
        return
      }
      const suspension: SuspensionData = {
        motivo: sanitize(motivoSuspension),
        vigencia:
          vigenciaTipo === 'indefinido' ? 'indefinido' : vigenciaDias,
        fechaInicio: new Date().toISOString().split('T')[0],
      }
      setEstadoLaboral(p.id, 'suspendido', { suspension })
      toast.success(
        `🚫 ${p.nombre} ${p.apellido} suspendido — Motivo guardado`,
      )
    } else if (estadoSeleccionado === 'vacaciones') {
      if (!motivoVacaciones.trim() || !fechaFinVac) {
        toast.error('Completa todos los campos de vacaciones')
        return
      }
      const vacaciones: VacacionesData = {
        fechaInicio: fechaInicioVac,
        fechaFin: fechaFinVac,
        dias: calcDias(),
        motivo: sanitize(motivoVacaciones),
      }
      setEstadoLaboral(p.id, 'vacaciones', { vacaciones })
      toast.success(
        `🌴 ${p.nombre} ${p.apellido} en vacaciones — ${calcDias()} días`,
      )
    } else {
      setEstadoLaboral(p.id, 'activo')
      toast.success(`✅ ${p.nombre} ${p.apellido} restaurado como Activo`)
    }
    onCerrar()
  }

  const opciones: {
    value: EstadoFormType
    label: string
    emoji: string
    desc: string
    bg: string
    border: string
  }[] = [
    {
      value: 'activo',
      label: 'Activo',
      emoji: '✅',
      desc: 'Operatividad normal en el sistema',
      bg: '#f0fdf4',
      border: '#059669',
    },
    {
      value: 'suspendido',
      label: 'Suspender',
      emoji: '🚫',
      desc: 'Bloquea operatividad. Sus días cuentan como FALTA',
      bg: '#f8fafc',
      border: '#94a3b8',
    },
    {
      value: 'vacaciones',
      label: 'Vacaciones',
      emoji: '🌴',
      desc: 'Ausencia programada. Sus días cuentan como ASISTIÓ',
      bg: '#fffbeb',
      border: '#d97706',
    },
  ]

  return (
    <>
      {/* Overlay */}
      <div
        id="modal-estado-overlay"
        onClick={onCerrar}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div
        id="modal-estado-sheet"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '430px',
          zIndex: 101,
          background: 'white',
          borderRadius: '24px 24px 0 0',
          maxHeight: '88dvh',
          overflowY: 'auto',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Drag indicator */}
        <div style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 2 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              background: '#e2e8f0',
              display: 'inline-block',
            }}
          />
        </div>

        <div style={{ padding: '12px 20px' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                Editar Estado Laboral
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  marginTop: 1,
                }}
              >
                {p.nombre} {p.apellido}
              </div>
            </div>
            <button
              id="btn-cerrar-modal-estado"
              onClick={onCerrar}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <X size={17} />
            </button>
          </div>

          {/* Opciones de estado */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            {opciones.map((opt) => (
              <button
                key={opt.value}
                id={`opt-estado-${opt.value}`}
                onClick={() =>
                  setEstadoSeleccionado(opt.value)
                }
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border:
                    estadoSeleccionado === opt.value
                      ? `2px solid ${opt.border}`
                      : '1.5px solid #e2e8f0',
                  background:
                    estadoSeleccionado === opt.value
                      ? opt.bg
                      : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>
                  {opt.emoji}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#1e293b',
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      marginTop: 1,
                    }}
                  >
                    {opt.desc}
                  </div>
                </div>
                {estadoSeleccionado === opt.value && (
                  <CheckCircle2
                    size={18}
                    style={{
                      color: opt.border,
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Formulario extra: Suspensión */}
          {estadoSeleccionado === 'suspendido' && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: '14px',
                marginBottom: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Detalles de Suspensión
              </div>

              {/* Motivo obligatorio */}
              <div>
                <label
                  htmlFor="input-motivo-suspension"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Motivo *
                </label>
                <textarea
                  id="input-motivo-suspension"
                  value={motivoSuspension}
                  onChange={(e) =>
                    setMotivoSuspension(e.target.value)
                  }
                  placeholder="Describe el motivo de la suspensión…"
                  rows={3}
                  maxLength={300}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 13,
                    color: '#1e293b',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Vigencia */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Vigencia
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {(['dias', 'indefinido'] as const).map((t) => (
                    <button
                      key={t}
                      id={`vigencia-${t}`}
                      onClick={() => setVigenciaTipo(t)}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 10,
                        border:
                          vigenciaTipo === t
                            ? '2px solid #64748b'
                            : '1.5px solid #e2e8f0',
                        background:
                          vigenciaTipo === t ? '#f1f5f9' : 'white',
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          vigenciaTipo === t ? '#1e293b' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'dias' ? '📅 Días específicos' : '∞ Indefinido'}
                    </button>
                  ))}
                </div>

                {vigenciaTipo === 'dias' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <button
                      id="btn-vigencia-menos"
                      onClick={() =>
                        setVigenciaDias((v) => Math.max(1, v - 1))
                      }
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9999,
                        border: '1.5px solid #e2e8f0',
                        background: 'white',
                        fontSize: 18,
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: '#1e293b',
                      }}
                    >
                      −
                    </button>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: 20,
                        fontWeight: 800,
                        color: '#1e293b',
                      }}
                    >
                      {vigenciaDias}{' '}
                      <span
                        style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}
                      >
                        día{vigenciaDias !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      id="btn-vigencia-mas"
                      onClick={() =>
                        setVigenciaDias((v) => Math.min(365, v + 1))
                      }
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9999,
                        border: '1.5px solid #e2e8f0',
                        background: 'white',
                        fontSize: 18,
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: '#1e293b',
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulario extra: Vacaciones */}
          {estadoSeleccionado === 'vacaciones' && (
            <div
              style={{
                background: '#fffbeb',
                borderRadius: 12,
                padding: '14px',
                marginBottom: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                border: '1px solid #fde68a',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#92400e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Detalles de Vacaciones
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="input-fecha-ini-vac"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 6,
                    }}
                  >
                    <Calendar size={12} /> Inicio
                  </label>
                  <input
                    id="input-fecha-ini-vac"
                    type="date"
                    value={fechaInicioVac}
                    onChange={(e) =>
                      setFechaInicioVac(e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 10,
                      border: '1.5px solid #fde68a',
                      fontSize: 13,
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: 'white',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="input-fecha-fin-vac"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 6,
                    }}
                  >
                    <Calendar size={12} /> Fin
                  </label>
                  <input
                    id="input-fecha-fin-vac"
                    type="date"
                    value={fechaFinVac}
                    onChange={(e) =>
                      setFechaFinVac(e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 10,
                      border: '1.5px solid #fde68a',
                      fontSize: 13,
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: 'white',
                    }}
                  />
                </div>
              </div>

              {calcDias() > 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#92400e',
                  }}
                >
                  {calcDias()} día{calcDias() !== 1 ? 's' : ''} de vacaciones
                </div>
              )}

              <div>
                <label
                  htmlFor="input-motivo-vac"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Motivo descriptivo *
                </label>
                <input
                  id="input-motivo-vac"
                  type="text"
                  value={motivoVacaciones}
                  onChange={(e) =>
                    setMotivoVacaciones(e.target.value)
                  }
                  placeholder="Ej: Vacaciones anuales programadas…"
                  maxLength={150}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #fde68a',
                    fontSize: 13,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'white',
                  }}
                />
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="btn-cancelar-modal-estado"
              onClick={onCerrar}
              style={{
                flex: 1,
                padding: '13px 0',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-estado"
              onClick={handleGuardar}
              style={{
                flex: 2,
                padding: '13px 0',
                background:
                  'linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%)',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Guardar Estado
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================
// ADMIN MÓDULO — Gestión de Personal (solo GERENCIA)
// ============================================================

export default function AdminModuloScreen() {
  const practicantes = useAppStore((s) => s.practicantes)

  const [query, setQuery] = useState('')
  const [ordenAscendente, setOrdenAscendente] = useState(true)
  const [modalEdicion, setModalEdicion] = useState<ModalEdicionState>({
    open: false,
    practicante: null,
  })

  // Filtrar por nombre, apellido o DNI
  const filtrados = practicantes
    .filter((p) => {
      const texto = `${p.nombre} ${p.apellido} ${p.dni ?? ''}`.toLowerCase()
      return texto.includes(query.toLowerCase())
    })
    .sort((a, b) => {
      const nameA = `${a.nombre} ${a.apellido}`
      const nameB = `${b.nombre} ${b.apellido}`
      return ordenAscendente
        ? nameA.localeCompare(nameB, 'es')
        : nameB.localeCompare(nameA, 'es')
    })

  const totalActivos = practicantes.filter(
    (p) => p.estadoLaboral === 'activo',
  ).length
  const totalSuspendidos = practicantes.filter(
    (p) => p.estadoLaboral === 'suspendido',
  ).length
  const totalVacaciones = practicantes.filter(
    (p) => p.estadoLaboral === 'vacaciones',
  ).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}
      >
        ⚙️ Admin — Gestión de Personal
      </div>

      {/* Resumen rápido */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div
          style={{
            flex: 1,
            background: '#d1fae5',
            borderRadius: 12,
            padding: '10px 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#065f46',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Activos
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#059669',
              marginTop: 4,
            }}
          >
            {totalActivos}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: '#f1f5f9',
            borderRadius: 12,
            padding: '10px 12px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#64748b',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Suspendidos
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#64748b',
              marginTop: 4,
            }}
          >
            {totalSuspendidos}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: '#fefce8',
            borderRadius: 12,
            padding: '10px 12px',
            textAlign: 'center',
            border: '1px solid #fde68a',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#92400e',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Vacaciones
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#d97706',
              marginTop: 4,
            }}
          >
            {totalVacaciones}
          </div>
        </div>
      </div>

      {/* Buscador + Ordenar */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            id="input-buscar-admin"
            type="text"
            placeholder="Nombre, apellido o DNI…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 34px',
              borderRadius: 12,
              border: '1.5px solid #e2e8f0',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              background: 'white',
            }}
          />
        </div>
        <button
          id="btn-toggle-orden"
          onClick={() => setOrdenAscendente((v) => !v)}
          title={ordenAscendente ? 'Ordenar Z–A' : 'Ordenar A–Z'}
          style={{
            background: 'white',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            padding: '0 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 700,
            color: '#1E3A8A',
            flexShrink: 0,
          }}
        >
          <ArrowUpDown size={15} />
          {ordenAscendente ? 'A–Z' : 'Z–A'}
        </button>
      </div>

      {/* Contador de resultados */}
      <div
        style={{
          fontSize: 12,
          color: '#94a3b8',
          paddingLeft: 2,
        }}
      >
        {filtrados.length} colaborador{filtrados.length !== 1 ? 'es' : ''}{' '}
        encontrado{filtrados.length !== 1 ? 's' : ''}
      </div>

      {/* Lista de colaboradores */}
      {filtrados.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 0',
            color: '#94a3b8',
            fontSize: 13,
          }}
        >
          Sin resultados para "{query}"
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {filtrados.map((p) => (
            <TarjetaColaborador
              key={p.id}
              practicante={p}
              onEditarEstado={(pr) =>
                setModalEdicion({ open: true, practicante: pr })
              }
            />
          ))}
        </div>
      )}

      {/* Modal edición */}
      {modalEdicion.open && (
        <ModalEdicionEstado
          state={modalEdicion}
          onCerrar={() =>
            setModalEdicion({ open: false, practicante: null })
          }
        />
      )}
    </div>
  )
}
