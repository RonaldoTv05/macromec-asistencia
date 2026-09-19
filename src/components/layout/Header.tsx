import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import PerfilModal from './PerfilModal'

// ── Badge de rol ─────────────────────────────────────────────
const ROL_BADGE: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  PRACTICANTE: {
    label: 'Practicante',
    bg: 'rgba(37,99,235,0.2)',
    color: '#93c5fd',
  },
  SUPERVISOR: {
    label: 'Supervisor',
    bg: 'rgba(5,150,105,0.2)',
    color: '#6ee7b7',
  },
  GERENCIA: {
    label: 'Gerencia',
    bg: 'rgba(124,58,237,0.2)',
    color: '#c4b5fd',
  },
}

// ── Formateador de fecha en español ──────────────────────────
function formatFechaHoy(): string {
  const ahora = new Date()
  const dias = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ]
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]
  const diaSemana = dias[ahora.getDay()]
  const dia = ahora.getDate()
  const mes = meses[ahora.getMonth()]
  const anio = ahora.getFullYear()
  return `${diaSemana}, ${dia} de ${mes} ${anio}`
}

// ============================================================
// HEADER SUPERIOR DINÁMICO
// ============================================================

export default function Header() {
  const usuario = useAppStore((s) => s.usuarioActual)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [fechaHoy, setFechaHoy] = useState(formatFechaHoy)

  // Actualizar fecha a medianoche (por si la app queda abierta)
  useEffect(() => {
    const ahora = new Date()
    const msMedianoche =
      new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() + 1,
      ).getTime() - ahora.getTime()

    const timer = setTimeout(() => {
      setFechaHoy(formatFechaHoy())
    }, msMedianoche)

    return () => clearTimeout(timer)
  }, [fechaHoy])

  if (!usuario) return null

  const badge = ROL_BADGE[usuario.rol] ?? ROL_BADGE.PRACTICANTE
  const primerNombre = usuario.nombre.split(' ')[0]

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '430px',
          zIndex: 50,
          background: 'rgba(15,23,42,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingTop: 'max(59px, env(safe-area-inset-top))',
          borderBottom: '1px solid rgba(30,58,138,0.4)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px 8px',
            gap: 12,
          }}
        >
          {/* Logo + saludo + fecha */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Logo M */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                fontWeight: 900,
                color: 'white',
                flexShrink: 0,
              }}
            >
              M
            </div>

            {/* Saludo + fecha */}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#64748b',
                  letterSpacing: '0.3px',
                  marginBottom: 1,
                }}
              >
                MACROMEC · Sistema de Asistencia
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 130,
                  }}
                >
                  Hola, {primerNombre}
                </span>
                {/* Badge de rol */}
                <span
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    borderRadius: 9999,
                    padding: '2px 9px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    border: `1px solid ${badge.color}30`,
                  }}
                >
                  {badge.label}
                </span>
              </div>
              {/* Fecha actual en tiempo real */}
              <div
                style={{
                  fontSize: 10,
                  color: '#475569',
                  marginTop: 2,
                  fontWeight: 500,
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                📅 {fechaHoy}
              </div>
            </div>
          </div>

          {/* Botón de perfil (Avatar circular) */}
          <button
            id="btn-abrir-perfil"
            onClick={() => setModalAbierto(true)}
            aria-label="Abrir perfil de usuario"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, #1E3A8A 0%, #3b82f6 100%)',
              border: '2px solid rgba(59,130,246,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '0.5px',
              flexShrink: 0,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              boxShadow: '0 2px 12px rgba(37,99,235,0.35)',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                'scale(0.93)'
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                'scale(1)'
            }}
          >
            {usuario.avatarIniciales}
          </button>
        </div>
      </header>

      {/* Modal de perfil */}
      <PerfilModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
      />
    </>
  )
}
