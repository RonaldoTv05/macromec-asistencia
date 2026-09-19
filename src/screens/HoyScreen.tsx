import { useState } from 'react'
import type { Modalidad } from '../types'
import {
  AlertTriangle,
  Award,
  BarChart2,
  CheckCircle2,
  Clock,
  Clipboard,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import {
  HORAS_SEMANA_ACTUAL,
  KPI_ALMUERZOS_HOY,
  REPORTE_GERENCIA,
  SEMANA_ANTERIOR_LABEL,
  HORAS_SEMANA_ANTERIOR,
} from '../data/mockData'
import { toast } from 'sonner'

// ── Sub-componentes comunes ────────────────────────────────────

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: 'white',
        borderRadius: 16,
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {children}
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div
      style={{
        background: color,
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: 'rgba(255,255,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {icon}
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: 'white',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ============================================================
// ============================================================
// DASHBOARD PRACTICANTE
// ============================================================

function obtenerHistorialSemanaActual(historialUsuario: import('../types').RegistroDia[], fechaStr: string) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fechaActual = new Date(y, m - 1, d)
  
  const diaSemana = fechaActual.getDay() // 0=Dom, 1=Lun, ..., 6=Sab
  const diffToMonday = diaSemana === 0 ? 6 : diaSemana - 1
  
  const fechaLunes = new Date(y, m - 1, d - diffToMonday)
  
  const diasSemanales: import('../types').RegistroDia[] = []
  
  const iterDate = new Date(fechaLunes.getTime())
  
  while (iterDate <= fechaActual) {
    const currentDow = iterDate.getDay()
    // Excluir fines de semana del listado
    if (currentDow !== 0 && currentDow !== 6) {
      const iy = iterDate.getFullYear()
      const im = String(iterDate.getMonth() + 1).padStart(2, '0')
      const id = String(iterDate.getDate()).padStart(2, '0')
      const dateStr = `${iy}-${im}-${id}`
      
      const registroExistente = historialUsuario.find(h => h.fecha === dateStr)
      if (registroExistente) {
        diasSemanales.push(registroExistente)
      } else {
        diasSemanales.push({
          fecha: dateStr,
          modalidad: 'presencial',
          estado: 'PENDIENTE',
          codigoHoja: '-',
          fuente: 'TERMINAL'
        })
      }
    }
    iterDate.setDate(iterDate.getDate() + 1)
  }
  
  return diasSemanales
}

function DashboardPracticante() {
  const usuario = useAppStore((s) => s.usuarioActual)
  const practicantes = useAppStore((s) => s.practicantes)
  const extraHoursBalances = useAppStore((s) => s.extraHoursBalances)

  const p = practicantes[0]
  const balance = extraHoursBalances[0]
  const horasExtra = balance?.horasDisponibles ?? 0

  const [modalFirmaAbierto, setModalFirmaAbierto] = useState(false)

  const pct = Math.round((HORAS_SEMANA_ACTUAL / 30) * 100)

  if (!p || !usuario) return null

  // Hoy para determinar estado del día actual (Viernes 18)
  const fechaHoy = '2026-09-18' // Mock

  // Generar historial cronológico dinámico hasta "hoy"
  const SEMANA_ACTUAL = obtenerHistorialSemanaActual(p.historial, fechaHoy)

  // Datos semana de firma pendiente (semana 3)
  const semanaFirma = p.semanasHojaFisica.find((s) => !s.firmada)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Tarjeta de perfil del día ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {usuario.avatarIniciales}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: '#0f172a',
                marginBottom: 2,
              }}
            >
              {usuario.nombre}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {p.carrera} ·{' '}
              <span
                style={{
                  fontWeight: 600,
                  color: '#1E3A8A',
                  textTransform: 'capitalize',
                }}
              >
                {p.modalidadBase}
              </span>
            </div>
          </div>
        </div>

        {/* Badges de estado */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Estado de hoy */}
          {(() => {
            const hoyActual = SEMANA_ACTUAL.find((d) => d.fecha === fechaHoy)
            if (hoyActual?.estado === 'ASISTIO') {
              return (
                <span
                  style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    borderRadius: 9999,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCircle2 size={13} />
                  ASISTIÓ — {hoyActual.horaIngreso}
                </span>
              )
            }
            return (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  borderRadius: 9999,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ⏳ Sin registro hoy
              </span>
            )
          })()}

          {/* Almuerzo confirmado */}
          {p.almuerzosConfirmados.includes(fechaHoy) && (
            <span
              style={{
                background: '#eff6ff',
                color: '#1e40af',
                borderRadius: 9999,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              🍽️ Almuerzo confirmado
            </span>
          )}

          {/* Badge horas extras */}
          {horasExtra > 0 && (
            <span
              style={{
                background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                color: 'white',
                borderRadius: 9999,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Zap size={12} />
              +{horasExtra}h extras disponibles
            </span>
          )}
        </div>
      </Card>

      {/* ── Progreso semanal con comparativo ── */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            Horas Semanales — Sem. 38
          </span>
          <span
            style={{
              fontSize: 12,
              color: pct >= 100 ? '#059669' : '#2563EB',
              fontWeight: 700,
            }}
          >
            {HORAS_SEMANA_ACTUAL} / 30 hrs
          </span>
        </div>

        {/* Barra de progreso */}
        <div
          style={{
            height: 10,
            background: '#e2e8f0',
            borderRadius: 9999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(pct, 100)}%`,
              background:
                pct >= 100
                  ? '#059669'
                  : 'linear-gradient(90deg, #1E3A8A 0%, #2563EB 100%)',
              borderRadius: 9999,
              transition: 'width 0.8s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {pct}% completado esta semana
          </span>
        </div>

        {/* Comparativo semana anterior */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <TrendingUp size={14} style={{ color: '#059669', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#065f46', fontWeight: 600 }}>
            {SEMANA_ANTERIOR_LABEL}: {HORAS_SEMANA_ANTERIOR}h completadas — ✓ Meta alcanzada
          </span>
        </div>

        {/* Alerta firma pendiente */}
        {semanaFirma && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle
              size={15}
              style={{ color: '#d97706', flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 12,
                  color: '#92400e',
                  fontWeight: 600,
                }}
              >
                Falta firmar {semanaFirma.label}
              </span>
            </div>
            <button
              id="btn-ir-firma"
              onClick={() => setModalFirmaAbierto(true)}
              style={{
                background: '#d97706',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Ir a firmar
            </button>
          </div>
        )}
      </Card>

      {/* ── Historial Reciente ── */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          color: '#0f172a',
          paddingLeft: 2,
        }}
      >
        Historial Reciente — Semana Actual
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {SEMANA_ACTUAL.map((d) => (
          <div
            key={d.fecha}
            style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              flexShrink: 0,
              background: estadoBg(d.estado),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: estadoColor(d.estado),
            }}
          >
            {d.codigoHoja}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}
            >
              {formatFecha(d.fecha)}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {d.horaIngreso
                ? `Ingreso: ${d.horaIngreso}`
                : 'Sin registro de ingreso'}
            </div>
          </div>
          <span
            style={{
              borderRadius: 9999,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 700,
              background: estadoBg(d.estado),
              color: estadoColor(d.estado),
            }}
          >
            {d.estado === 'ASISTIO'
              ? 'ASISTIÓ'
              : d.estado.replace(/_/g, ' ')}
          </span>
        </div>
      ))}
      </div>

      {/* ── Modal: Detalle firma pendiente ── */}
      {modalFirmaAbierto && semanaFirma && (
        <ModalFirmaPendiente
          semana={semanaFirma}
          historial={p.historial.filter(
            (d) =>
              d.fecha >= semanaFirma.fechaInicio &&
              d.fecha <= semanaFirma.fechaFin,
          )}
          onCerrar={() => setModalFirmaAbierto(false)}
        />
      )}
    </div>
  )
}

// ── Modal: Detalle de firma pendiente ────────────────────────

import type { SemanaFisica, RegistroDia } from '../types'

function ModalFirmaPendiente({
  semana,
  historial,
  onCerrar,
}: {
  semana: SemanaFisica
  historial: RegistroDia[]
  onCerrar: () => void
}) {
  return (
    <>
      {/* Overlay */}
      <div
        id="modal-firma-overlay"
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
        id="modal-firma-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de firma pendiente"
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
          maxHeight: '85dvh',
          overflowY: 'auto',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Drag indicator */}
        <div
          style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 4 }}
        >
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

        <div style={{ padding: '12px 20px 4px' }}>
          {/* Encabezado */}
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
                Firma Pendiente
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                {semana.label}
              </div>
            </div>
            <button
              id="btn-cerrar-modal-firma"
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
                fontSize: 18,
              }}
            >
              ×
            </button>
          </div>

          {/* Alerta informativa */}
          <div
            style={{
              background: '#fef9c3',
              border: '1px solid #fde68a',
              borderRadius: 12,
              padding: '12px 14px',
              marginTop: 14,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertTriangle
              size={18}
              style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }}
            />
            <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
              Acércate a la oficina con el{' '}
              <strong>Supervisor Ronaldo Torres</strong> para registrar
              tu firma física en la hoja de asistencia.
            </div>
          </div>

          {/* Días de la semana */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 10,
            }}
          >
            Días de la semana
          </div>

          {historial.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 13,
                padding: '12px 0',
              }}
            >
              No hay registros para esta semana
            </div>
          ) : (
            historial.map((d) => (
              <div
                key={d.fecha}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    flexShrink: 0,
                    background: estadoBg(d.estado),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: estadoColor(d.estado),
                  }}
                >
                  {d.codigoHoja}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1e293b',
                    }}
                  >
                    {formatFecha(d.fecha)}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {d.horaIngreso
                      ? `Ingreso: ${d.horaIngreso}`
                      : 'Sin registro'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 9999,
                    padding: '3px 10px',
                    background: estadoBg(d.estado),
                    color: estadoColor(d.estado),
                  }}
                >
                  {d.estado.replace(/_/g, ' ')}
                </span>
              </div>
            ))
          )}

          {/* CTA */}
          <button
            id="btn-entendido-firma"
            onClick={onCerrar}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '13px 0',
              background:
                'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              border: 'none',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Entendido — Iré a firmar
          </button>
        </div>
      </div>
    </>
  )
}


// ============================================================
// DASHBOARD SUPERVISOR (fusión Monitor + Administración)
// ============================================================
function DashboardSupervisor() {
  const practicantes = useAppStore((s) => s.practicantes)
  const usuario = useAppStore((s) => s.usuarioActual)
  const marcarAsistenciaRapida = useAppStore((s) => s.marcarAsistenciaRapida)
  const cambiarModalidadHoy = useAppStore((s) => s.cambiarModalidadHoy)

  const FECHA_HOY = '2026-09-18'

  // ── KPI: Solicitudes (reactivo desde store) ────────────────
  const pendientes = practicantes.filter(
    (p) => p.horarioPendiente?.estado === 'pendiente_aprobacion',
  )

  // ── KPI: Presentes Hoy = Asistió + Campo + Tardanza (activos) ──
  const presentesHoy = practicantes.filter(
    (p) =>
      p.estadoLaboral === 'activo' &&
      p.historial.some(
        (d) =>
          d.fecha === FECHA_HOY &&
          ['ASISTIO', 'CAMPO', 'TARDANZA'].includes(d.estado),
      ),
  ).length

  // ── Almuerzos: REGLA ESTRICTA — Presencial + ASISTIO únicamente ──
  const almuerzosHoy = practicantes.filter((p) => {
    if (p.estadoLaboral !== 'activo') return false
    const reg = p.historial.find((d) => d.fecha === FECHA_HOY)
    return reg?.modalidad === 'presencial' && reg?.estado === 'ASISTIO'
  })

  const handleCopiarWhatsApp = async () => {
    const fechaStr = new Date(2026, 8, 18).toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const lista = almuerzosHoy.map((p) => `• ${p.nombre} ${p.apellido} ✓`).join('\n')
    const msg = `🍽️ *MACROMEC — Almuerzos del día*\n📅 ${fechaStr}\n\n*Total almuerzos confirmados:* ${almuerzosHoy.length}\n\n*Lista de personas con almuerzo:*\n${lista}\n\n_Mensaje generado automáticamente_`
    try {
      await navigator.clipboard.writeText(msg)
      toast.success('📋 Mensaje copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar.')
    }
  }

  const handleMarcar = (id: string, estado: import('../types').EstadoAsistencia) => {
    marcarAsistenciaRapida(id, estado)
    toast.success(`Asistencia marcada: ${estado.replace(/_/g, ' ')}`)
  }

  const handleToggleModalidad = (id: string, modalidadActual: Modalidad) => {
    const nueva: Modalidad = modalidadActual === 'presencial' ? 'virtual' : 'presencial'
    cambiarModalidadHoy(id, nueva)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Título */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
        Panel del Supervisor
        {usuario && (
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>
            — {usuario.nombre}
          </span>
        )}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <KpiCard
          label="Solicitudes"
          value={pendientes.length}
          icon={<Clock size={14} />}
          color="linear-gradient(135deg,#1E3A8A,#2563EB)"
        />
        <KpiCard
          label="Presentes Hoy"
          value={presentesHoy}
          icon={<CheckCircle2 size={14} />}
          color="linear-gradient(135deg,#065f46,#059669)"
        />
        <KpiCard
          label="Almuerzos Hoy"
          value={almuerzosHoy.length}
          icon={<Users size={14} />}
          color="linear-gradient(135deg,#92400e,#d97706)"
        />
      </div>

      {/* ── Asistencia de Hoy ── */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 12 }}>
          Asistencia de Hoy (Viernes 18 Sep)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {practicantes.map((p) => {
            const reg = p.historial.find((h) => h.fecha === FECHA_HOY)
            const estadoActual = reg?.estado
            // Modalidad activa hoy: si ya hay registro usa esa modalidad, si no usa modalidadBase
            const modalidadHoy: Modalidad = (reg?.modalidad as Modalidad) ?? p.modalidadBase
            const esVirtual = modalidadHoy === 'virtual'

            // ── Estado laboral bloqueado ──────────────────────
            if (p.estadoLaboral === 'suspendido') {
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 12,
                  background: '#f8fafc', border: '1px solid #e2e8f0', opacity: 0.7,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#64748b' }}>
                      {p.nombre} {p.apellido}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {p.suspension?.motivo ?? 'Sin motivo registrado'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, background: '#e2e8f0',
                    color: '#64748b', padding: '4px 10px', borderRadius: 20,
                  }}>
                    SUSPENDIDO
                  </span>
                </div>
              )
            }

            if (p.estadoLaboral === 'vacaciones') {
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 12,
                  background: '#fff7ed', border: '1px solid #fed7aa', opacity: 0.8,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#9a3412' }}>
                      {p.nombre} {p.apellido}
                    </div>
                    <div style={{ fontSize: 10, color: '#ea580c', marginTop: 2 }}>
                      Regresa: {p.vacaciones?.fechaFin ?? '—'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, background: '#fed7aa',
                    color: '#9a3412', padding: '4px 10px', borderRadius: 20,
                  }}>
                    VACACIONES
                  </span>
                </div>
              )
            }

            // ── Practicante ACTIVO ────────────────────────────
            return (
              <div key={p.id} style={{
                display: 'flex', flexDirection: 'column', padding: '10px 12px',
                background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
              }}>
                {/* Fila nombre + toggle modalidad */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {p.nombre} {p.apellido}
                    </div>
                    {almuerzosHoy.some((a) => a.id === p.id) && (
                      <div style={{ fontSize: 10, color: '#059669', fontWeight: 700, marginTop: 2 }}>
                        🍽 Almuerzo confirmado
                      </div>
                    )}
                  </div>
                  {/* Toggle Presencial / Virtual */}
                  <button
                    onClick={() => handleToggleModalidad(p.id, modalidadHoy)}
                    title={`Cambiar a ${esVirtual ? 'Presencial' : 'Virtual'}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 20, border: 'none',
                      background: esVirtual ? '#ede9fe' : '#dbeafe',
                      color: esVirtual ? '#6d28d9' : '#1e40af',
                      fontSize: 10, fontWeight: 800, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {esVirtual ? '💻 Virtual' : '🏢 Presencial'}
                  </button>
                </div>

                {/* Botones de estado — condicionados por modalidad */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleMarcar(p.id, 'ASISTIO')}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                      background: estadoActual === 'ASISTIO' ? '#10b981' : '#f1f5f9',
                      color: estadoActual === 'ASISTIO' ? 'white' : '#64748b',
                      fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >✓ Asistió</button>
                  <button
                    onClick={() => handleMarcar(p.id, 'TARDANZA')}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                      background: estadoActual === 'TARDANZA' ? '#f59e0b' : '#f1f5f9',
                      color: estadoActual === 'TARDANZA' ? 'white' : '#64748b',
                      fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >T</button>
                  <button
                    onClick={() => handleMarcar(p.id, 'FALTA')}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                      background: estadoActual === 'FALTA' ? '#ef4444' : '#f1f5f9',
                      color: estadoActual === 'FALTA' ? 'white' : '#64748b',
                      fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >F</button>
                  {/* Campo: solo en Presencial */}
                  {!esVirtual && (
                    <button
                      onClick={() => handleMarcar(p.id, 'CAMPO')}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                        background: estadoActual === 'CAMPO' ? '#8b5cf6' : '#f1f5f9',
                        color: estadoActual === 'CAMPO' ? 'white' : '#64748b',
                        fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >Campo</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Módulo Almuerzos (reactivo, sin datos propios) ── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🍽️</span> Módulo Almuerzos
          </div>
          <button
            onClick={handleCopiarWhatsApp}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#10b981', color: 'white', border: 'none',
              padding: '6px 12px', borderRadius: 8, fontSize: 11,
              fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16,185,129,0.2)',
            }}
          >
            <Clipboard size={12} /> Copiar
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, fontWeight: 500 }}>
          Solo Presencial + Asistió ({almuerzosHoy.length} ración{almuerzosHoy.length !== 1 ? 'es' : ''})
        </div>
        {almuerzosHoy.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
            Sin raciones confirmadas aún
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {almuerzosHoy.map((p) => (
              <span
                key={p.id}
                style={{
                  background: '#d1fae5', color: '#065f46',
                  fontSize: 11, fontWeight: 600,
                  padding: '4px 10px', borderRadius: 12,
                  border: '1px solid #a7f3d0',
                }}
              >
                {p.nombre} {p.apellido[0]}. ✓
              </span>
            ))}
          </div>
        )}
      </Card>

    </div>
  )
}


// ============================================================
// DASHBOARD GERENCIA
// ============================================================

function GerenciaKpiCard({ label, value, icon, bgClass }: { label: string, value: string | number, icon: React.ReactNode, bgClass: string }) {
  return (
    <div className={`flex-1 rounded-[14px] p-[14px] flex flex-col gap-1.5 min-w-0 ${bgClass}`}>
      <div className="text-white/75 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-[32px] font-extrabold text-white leading-none">{value}</div>
    </div>
  )
}

function DashboardGerencia() {
  const practicantes = useAppStore((s) => s.practicantes)
  const fechaHoyStr = '2026-09-18'

  // Calcular totales
  const totalPersonal = practicantes.length
  
  // Almuerzos hoy: practicantes que asistieron presencial hoy
  let totalAlmuerzosHoy = 0
  practicantes.forEach((p) => {
    const regHoy = p.historial.find((h) => h.fecha === fechaHoyStr)
    if (regHoy?.estado === 'ASISTIO' && regHoy?.modalidad === 'presencial') {
      totalAlmuerzosHoy++
    }
  })

  // Faltas semanales (Lunes 14 a Viernes 18 = Semana 38)
  const inicioSemanaStr = '2026-09-14'
  const finSemanaStr = '2026-09-18'
  
  let faltasSemana = 0
  let tardanzasSemana = 0
  let suspendidosTotal = 0
  let vacacionesTotal = 0

  practicantes.forEach((p) => {
    if (p.estadoLaboral === 'suspendido') suspendidosTotal++
    if (p.estadoLaboral === 'vacaciones') vacacionesTotal++

    // Calcular faltas y tardanzas en la semana
    p.historial.forEach((h) => {
      if (h.fecha >= inicioSemanaStr && h.fecha <= finSemanaStr) {
        if (h.estado === 'FALTA') faltasSemana++
        if (h.estado === 'TARDANZA') tardanzasSemana++
      }
    })
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="font-bold text-[14px] text-slate-900">
        Panel de Gerencia
      </div>

      <div className="flex gap-2.5">
        <GerenciaKpiCard
          label="Total personal"
          value={totalPersonal}
          icon={<Users size={14} />}
          bgClass="bg-gradient-to-br from-emerald-800 to-emerald-600"
        />
        <GerenciaKpiCard
          label="Almuerzos hoy"
          value={totalAlmuerzosHoy}
          icon={<BarChart2 size={14} />}
          bgClass="bg-gradient-to-br from-blue-900 to-blue-600"
        />
      </div>

      <div className="flex gap-2.5">
        <GerenciaKpiCard
          label="Faltas semana"
          value={faltasSemana}
          icon={<AlertTriangle size={14} />}
          bgClass="bg-gradient-to-br from-red-900 to-red-600"
        />
        <GerenciaKpiCard
          label="Tardanzas"
          value={tardanzasSemana}
          icon={<Clock size={14} />}
          bgClass="bg-gradient-to-br from-amber-900 to-amber-600"
        />
        <GerenciaKpiCard
          label="Susp. / Vac."
          value={`${suspendidosTotal}/${vacacionesTotal}`}
          icon={<Award size={14} />}
          bgClass="bg-gradient-to-br from-indigo-900 to-indigo-500"
        />
      </div>

      {/* Resumen Diario */}
      <Card>
        <div className="font-bold text-[13px] text-slate-900 mb-2">
          Resumen de hoy [Viernes 18 de Septiembre de 2026]
        </div>
        {practicantes.map((p) => {
          const isSuspendido = p.estadoLaboral === 'suspendido'
          const isVacaciones = p.estadoLaboral === 'vacaciones'
          
          // Calcular modalidad actual (para activos)
          let modalidadHoy = p.modalidadBase
          const regHoy = p.historial.find((h) => h.fecha === fechaHoyStr)
          if (regHoy && regHoy.modalidad) {
            modalidadHoy = regHoy.modalidad
          }

          return (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 py-2 border-b border-slate-100 ${isSuspendido ? 'opacity-50' : 'opacity-100'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  isSuspendido
                    ? 'bg-slate-200 text-slate-400'
                    : isVacaciones
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gradient-to-br from-blue-900 to-blue-600 text-white'
                }`}
              >
                {p.nombre.split(' ')[0][0]}
                {p.nombre.split(' ')[1]?.[0] || p.apellido?.[0] || ''}
              </div>
              <div className="flex-1">
                <div className={`text-[12px] font-semibold ${isSuspendido ? 'text-slate-400' : 'text-slate-800'}`}>
                  {p.nombre} {p.apellido}
                </div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {isSuspendido ? (
                    <span className="text-[9px] bg-slate-200 text-slate-500 rounded-md px-1.5 py-0.5 font-bold">
                      SUSPENDIDO
                    </span>
                  ) : isVacaciones ? (
                    <span className="text-[9px] bg-yellow-100 text-yellow-800 rounded-md px-1.5 py-0.5 font-bold">
                      VACACIONES
                    </span>
                  ) : (
                    <>
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md px-1.5 py-0.5 font-bold">
                        ACTIVO
                      </span>
                      <span className={`text-[9px] rounded-md px-1.5 py-0.5 font-bold border ${
                        modalidadHoy === 'presencial' 
                        ? 'bg-blue-50 text-blue-600 border-blue-200' 
                        : 'bg-violet-50 text-violet-600 border-violet-200'
                      }`}>
                        {modalidadHoy.toUpperCase()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <button
          id="btn-ir-reportes-gerencia"
          onClick={() => {
            useAppStore.getState().setTabActiva('reportes')
          }}
          className="mt-3 bg-slate-900 text-white border-none rounded-xl py-2.5 text-[13px] font-bold cursor-pointer w-full flex items-center justify-center gap-1 hover:bg-slate-800 transition-colors"
        >
          Ver reporte completo →
        </button>
      </Card>
    </div>
  )
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function HoyScreen() {
  const rolActivo = useAppStore((s) => s.rolActivo)

  return (
    <div>
      {rolActivo === 'PRACTICANTE' && <DashboardPracticante />}
      {rolActivo === 'SUPERVISOR' && <DashboardSupervisor />}
      {rolActivo === 'GERENCIA' && <DashboardGerencia />}
    </div>
  )
}

// ── Utilidades ─────────────────────────────────────────────────

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dias = [
    'Dom',
    'Lun',
    'Mar',
    'Mié',
    'Jue',
    'Vie',
    'Sáb',
  ]
  const meses = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ]
  const dow = new Date(y, m - 1, d).getDay()
  return `${dias[dow]} ${d} ${meses[m - 1]}`
}

function estadoBg(estado: string): string {
  return (
    ({
      ASISTIO: '#d1fae5',
      TARDANZA: '#fef3c7',
      FALTA: '#fee2e2',
      COMPENSADO: '#dbeafe',
      FALTA_CUBIERTA: '#f0fdf4',
      SEMINARIO: '#e0f2fe',
      CAMPO: '#f3e8ff',
      LIBRE: '#f8fafc',
      PENDIENTE: '#f1f5f9',
    } as Record<string, string>)[estado] ?? '#f1f5f9'
  )
}

function estadoColor(estado: string): string {
  return (
    ({
      ASISTIO: '#065f46',
      TARDANZA: '#92400e',
      FALTA: '#991b1b',
      COMPENSADO: '#1e40af',
      FALTA_CUBIERTA: '#065f46',
      SEMINARIO: '#0c4a6e',
      CAMPO: '#5b21b6',
      LIBRE: '#475569',
      PENDIENTE: '#64748b',
    } as Record<string, string>)[estado] ?? '#64748b'
  )
}
