
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
  ChevronLeft,
  ChevronRight,
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
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3 ${className}`}
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
      className="rounded-[14px] px-4 py-[14px] flex flex-col gap-2 flex-1 min-w-0"
      style={{ background: color }}
    >
      <div className="text-white/70 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold tracking-[0.5px] uppercase leading-tight">
          {label}
        </span>
      </div>
      <div className="text-[28px] font-extrabold text-white leading-none">
        {value}
      </div>
    </div>
  )
}

// ============================================================
// ============================================================
// DASHBOARD PRACTICANTE
// ============================================================



function DashboardPracticante() {
  const usuario = useAppStore((s) => s.usuarioActual)
  const practicantes = useAppStore((s) => s.practicantes)
  const extraHoursBalances = useAppStore((s) => s.extraHoursBalances)

  const p = practicantes[0]
  const balance = extraHoursBalances[0]
  const horasExtra = balance?.horasDisponibles ?? 0

  const pct = Math.round((HORAS_SEMANA_ACTUAL / 30) * 100)

  if (!p || !usuario) return null

  // FASE 1: LÓGICA DE REVELACIÓN PROGRESIVA DE DÍAS (TIEMPO REAL)
  const hoy = new Date();
  const diaSemanaHoy = hoy.getDay() === 0 ? 7 : hoy.getDay(); 
  
  const diasAMostrar: Date[] = [];
  for (let i = 1; i <= diaSemanaHoy; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (diaSemanaHoy - i));
    diasAMostrar.push(d);
  }

  // FASE 2: CONEXIÓN CON EL STORE
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  
  const SEMANA_ACTUAL = diasAMostrar.map(d => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const fechaStr = `${yyyy}-${mm}-${dd}`
    
    const registro = p.historial.find(r => r.fecha === fechaStr)
    return registro || {
      fecha: fechaStr,
      estado: 'PENDIENTE',
      codigoHoja: '-',
      horaIngreso: '',
      fuente: 'TERMINAL'
    }
  })

  // FASE 3: UI STRICTA EN TAILWIND CSS
  const getBadgeClass = (estado: string) => {
    switch(estado) {
      case 'ASISTIO': return 'bg-emerald-100 text-emerald-800'
      case 'TARDANZA': return 'bg-amber-100 text-amber-800'
      case 'FALTA': return 'bg-red-100 text-red-800'
      case 'COMPENSADO': return 'bg-blue-100 text-blue-800'
      case 'FALTA_CUBIERTA': return 'bg-emerald-50 text-emerald-800'
      case 'SEMINARIO': return 'bg-sky-100 text-sky-800'
      case 'CAMPO': return 'bg-purple-100 text-purple-800'
      case 'LIBRE': return 'bg-slate-50 text-slate-600'
      default: return 'bg-slate-100 text-slate-500' // PENDIENTE
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Tarjeta de perfil del día ── */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center text-[18px] font-bold text-white shrink-0">
            {usuario.avatarIniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] text-slate-900 mb-0.5">
              {usuario.nombre}
            </div>
            <div className="text-[12px] text-slate-500">
              {p.carrera} ·{' '}
              <span className="font-semibold text-blue-900 capitalize">
                {p.modalidadBase}
              </span>
            </div>
          </div>
        </div>

        {/* Badges de estado */}
        <div className="flex gap-2 flex-wrap">
          {/* Estado de hoy */}
          {(() => {
            const hoyActual = SEMANA_ACTUAL.find((d) => d.fecha === fechaHoy)
            if (hoyActual?.estado === 'ASISTIO') {
              return (
                <span className="bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-[12px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  ASISTIÓ — {hoyActual.horaIngreso}
                </span>
              )
            }
            return (
              <span className="bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-[12px] font-bold">
                ⏳ Sin registro hoy
              </span>
            )
          })()}

          {/* Almuerzo confirmado */}
          {p.almuerzosConfirmados.includes(fechaHoy) && (
            <span className="bg-blue-50 text-blue-800 rounded-full px-3 py-1 text-[12px] font-semibold">
              🍽️ Almuerzo confirmado
            </span>
          )}

          {/* Badge horas extras */}
          {horasExtra > 0 && (
            <span className="bg-gradient-to-br from-blue-900 to-blue-600 text-white rounded-full px-3 py-1 text-[12px] font-bold flex items-center gap-1">
              <Zap size={12} />
              +{horasExtra}h extras disponibles
            </span>
          )}
        </div>
      </Card>

      {/* ── Progreso semanal con comparativo ── */}
      <Card>
        <div className="flex justify-between items-center">
          <span className="font-bold text-[14px] text-slate-900">
            Horas Semanales
          </span>
          <span
            className={`text-[12px] font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-blue-600'
              }`}
          >
            {HORAS_SEMANA_ACTUAL} / 30 hrs
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="h-[10px] bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${pct >= 100
                ? 'bg-emerald-600'
                : 'bg-gradient-to-r from-blue-900 to-blue-600'
              }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            {pct}% completado esta semana
          </span>
        </div>

        {/* Comparativo semana anterior */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-[10px] py-2 px-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-600 shrink-0" />
          <span className="text-[11px] text-emerald-800 font-semibold">
            {SEMANA_ANTERIOR_LABEL}: {HORAS_SEMANA_ANTERIOR}h completadas — ✓ Meta alcanzada
          </span>
        </div>
      </Card>

      {/* ── Historial Reciente ── */}
      <div className="font-bold text-[14px] text-slate-900 pl-0.5 mt-2">
        Historial Reciente — Semana Actual
      </div>

      <div className="flex flex-col gap-3 mt-1">
        {SEMANA_ACTUAL.length === 0 ? (
          <div className="text-[13px] text-slate-400 italic text-center py-4">No hay historial esta semana.</div>
        ) : (
          SEMANA_ACTUAL.map((d) => (
            <div
              key={d.fecha}
              className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center text-[12px] font-extrabold ${getBadgeClass(d.estado)}`}
              >
                {d.codigoHoja}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-slate-800">
                  {formatFecha(d.fecha)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {d.horaIngreso
                    ? `Ingreso: ${d.horaIngreso}`
                    : 'Sin registro de ingreso'}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getBadgeClass(d.estado)}`}
              >
                {d.estado === 'ASISTIO'
                  ? 'ASISTIÓ'
                  : d.estado.replace(/_/g, ' ')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


// ============================================================
// DASHBOARD SUPERVISOR (NUEVO ROL - DÍA A DÍA)
// ============================================================
function DashboardSupervisor() {
  const practicantes = useAppStore((s) => s.practicantes)
  const [fechaActual, setFechaActual] = useState(new Date(2026, 8, 22))

  const handlePrevDay = () => {
    const prev = new Date(fechaActual)
    prev.setDate(prev.getDate() - 1)
    setFechaActual(prev)
  }

  const handleNextDay = () => {
    const next = new Date(fechaActual)
    next.setDate(next.getDate() + 1)
    setFechaActual(next)
  }

  const formatFechaTitle = (date: Date) => {
    const dia = date.getDate()
    const mes = date.toLocaleString('es-ES', { month: 'long' })
    const esHoy = date.getTime() === new Date(2026, 8, 22).getTime()
    return `${esHoy ? 'Hoy (' : ''}${dia} de ${mes}${esHoy ? ')' : ''}`
  }

  // Ajustar la fecha a YYYY-MM-DD local
  const yyyy = fechaActual.getFullYear()
  const mm = String(fechaActual.getMonth() + 1).padStart(2, '0')
  const dd = String(fechaActual.getDate()).padStart(2, '0')
  const fechaStr = `${yyyy}-${mm}-${dd}`

  const renderBadge = (modalidad: string, estado: string) => {
    if (estado === 'FALTA') {
      return <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded-md text-[10px] whitespace-nowrap">Faltó</span>
    }
    const isVirtual = modalidad === 'virtual'
    const modLabel = isVirtual ? 'Virtual' : 'Presencial'
    const modColor = isVirtual ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'

    let estLabel = ''
    let estColor = ''
    if (estado === 'ASISTIO') {
      estLabel = 'Asistió'
      estColor = 'bg-emerald-100 text-emerald-700'
    } else if (estado === 'TARDANZA') {
      estLabel = 'Tardanza'
      estColor = 'bg-amber-100 text-amber-700'
    } else if (estado === 'CAMPO' && !isVirtual) {
      estLabel = 'Campo'
      estColor = 'bg-purple-100 text-purple-700'
    } else if (estado === 'PENDIENTE') {
      estLabel = 'Pendiente'
      estColor = 'bg-slate-100 text-slate-500'
    } else {
      estLabel = estado
      estColor = 'bg-slate-100 text-slate-500'
    }

    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        <span className={`${modColor} font-bold px-2 py-1 rounded-md text-[10px] whitespace-nowrap`}>{modLabel}</span>
        <span className={`${estColor} font-bold px-2 py-1 rounded-md text-[10px] whitespace-nowrap`}>{estLabel}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="font-bold text-[15px] text-slate-900 px-1">
        Panel de Control (Día a Día)
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <button onClick={handlePrevDay} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors border-none cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <div className="font-bold text-[14px] text-slate-800">
            📅 {formatFechaTitle(fechaActual)}
          </div>
          <button onClick={handleNextDay} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors border-none cursor-pointer">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {practicantes.map(p => {
            const regHoy = p.historial.find(h => h.fecha === fechaStr)
            const modalidad = regHoy?.modalidad || p.modalidadBase
            const estado = regHoy?.estado || 'PENDIENTE'

            return (
              <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between">
                <div className="font-bold text-[11px] text-slate-900 leading-tight mb-1">
                  {p.nombre} {p.apellido.split(' ')[0]}
                </div>
                {renderBadge(modalidad, estado)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// DASHBOARD GERENCIA (Antiguo Dashboard Supervisor)
// ============================================================
function DashboardGerencia() {
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

  // ── Almuerzos: REGLA — Presencial + (ASISTIO o CAMPO) ──
  const almuerzosHoy = practicantes.filter((p) => {
    if (p.estadoLaboral !== 'activo') return false
    const reg = p.historial.find((d) => d.fecha === FECHA_HOY)
    return reg?.modalidad === 'presencial' && (reg?.estado === 'ASISTIO' || reg?.estado === 'CAMPO')
  })

  const handleCopiarWhatsApp = async () => {
    const fechaStr = new Date(2026, 8, 18).toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const lista = almuerzosHoy.map((p) => {
      const reg = p.historial.find((d) => d.fecha === FECHA_HOY)
      const sufijo = reg?.estado === 'CAMPO' ? ' (C)' : ''
      return `• ${p.nombre} ${p.apellido}${sufijo} ✓`
    }).join('\n')
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
        Panel de Gerencia
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
            if (p.estadoLaboral === 'retirado') {
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 opacity-70">
                  <div>
                    <div className="font-semibold text-[13px] text-slate-500">
                      {p.nombre} {p.apellido}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {p.retiro?.motivo ?? 'Sin motivo registrado'}
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-slate-200 text-slate-500 px-2.5 py-1 rounded-full">
                    RETIRADO
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
          Solo Presencial + Asistió/Campo ({almuerzosHoy.length} ración{almuerzosHoy.length !== 1 ? 'es' : ''})
        </div>
        {almuerzosHoy.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
            Sin raciones confirmadas aún
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {almuerzosHoy.map((p) => {
              const reg = p.historial.find((d) => d.fecha === FECHA_HOY)
              const esCampo = reg?.estado === 'CAMPO'
              return (
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
              )
            })}
          </div>
        )}
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
