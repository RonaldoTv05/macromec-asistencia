import { useState, useMemo } from 'react'
import { Clock, TrendingDown, Users, ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  bgClass,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  bgClass: string
}) {
  return (
    <div className={`flex-1 rounded-[14px] p-3.5 flex flex-col gap-1.5 min-w-0 ${bgClass}`}>
      <div className="text-white/75 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-[32px] font-extrabold text-white leading-none">{value}</div>
      {sub && (
        <div className="text-[10px] text-white/60 font-medium">
          {sub}
        </div>
      )}
    </div>
  )
}

// ============================================================
// REPORTES SCREEN — Solo GERENCIA
// ============================================================

export default function ReportesScreen() {
  const practicantes = useAppStore((s) => s.practicantes)
  const extraHoursBalances = useAppStore((s) => s.extraHoursBalances)
  const [sortAsc, setSortAsc] = useState(true)

  // Mes Septiembre 2026
  const mesFiltroStr = '2026-09'
  const fechaHoyStr = '2026-09-18'

  // Calcular métricas del mes actual (Septiembre)
  let totalFaltasMes = 0
  let totalTardanzasMes = 0
  let totalHECompensadasMes = 0

  practicantes.forEach((p) => {
    p.historial.forEach((h) => {
      if (h.fecha.startsWith(mesFiltroStr)) {
        if (h.estado === 'FALTA') totalFaltasMes++
        if (h.estado === 'TARDANZA') totalTardanzasMes++
        if (h.estado === 'COMPENSADO' || h.estado === 'FALTA_CUBIERTA') {
          totalHECompensadasMes += 5
        }
      }
    })
  })

  // Calcular total de horas extras disponibles en el sistema
  const totalHorasExtrasDisponibles = extraHoursBalances.reduce(
    (s, b) => s + b.horasDisponibles,
    0,
  )

  const totalSuspendidos = practicantes.filter((p) => p.estadoLaboral === 'suspendido').length
  const totalVacaciones = practicantes.filter((p) => p.estadoLaboral === 'vacaciones').length

  // Consolidado de almuerzos hoy
  let totalAlmuerzosHoy = 0
  practicantes.forEach((p) => {
    const regHoy = p.historial.find((h) => h.fecha === fechaHoyStr)
    if (regHoy?.estado === 'ASISTIO' && regHoy?.modalidad === 'presencial') {
      totalAlmuerzosHoy++
    }
  })

  // Ordenamiento
  const practicantesOrdenados = useMemo(() => {
    const arr = [...practicantes]
    arr.sort((a, b) => {
      const cmp = a.nombre.localeCompare(b.nombre)
      return sortAsc ? cmp : -cmp
    })
    return arr
  }, [practicantes, sortAsc])

  return (
    <div className="flex flex-col gap-3">
      <div className="font-bold text-[14px] text-slate-900">
        📊 Reportes — Mes Septiembre (1-30)
      </div>

      {/* KPIs principales */}
      <div className="flex gap-2.5">
        <KpiCard
          label="Total personal"
          value={practicantes.length}
          sub="Activos en sistema"
          icon={<Users size={13} />}
          bgClass="bg-gradient-to-br from-blue-900 to-blue-600"
        />
        <KpiCard
          label="Faltas"
          value={totalFaltasMes}
          icon={<TrendingDown size={13} />}
          bgClass="bg-gradient-to-br from-red-900 to-red-600"
        />
      </div>

      <div className="flex gap-2.5">
        <KpiCard
          label="Tardanzas"
          value={totalTardanzasMes}
          icon={<Clock size={13} />}
          bgClass="bg-gradient-to-br from-amber-900 to-amber-600"
        />
        <KpiCard
          label="HE comp."
          value={`${totalHECompensadasMes}h`}
          icon={<span className="text-[12px]">🔄</span>}
          bgClass="bg-gradient-to-br from-indigo-900 to-indigo-500"
        />
      </div>

      <div className="flex gap-2.5">
        <KpiCard
          label="Suspendidos"
          value={totalSuspendidos}
          icon={<span className="text-[12px]">🚫</span>}
          bgClass="bg-gradient-to-br from-slate-700 to-slate-500"
        />
        <KpiCard
          label="Vacaciones"
          value={totalVacaciones}
          icon={<span className="text-[12px]">🌴</span>}
          bgClass="bg-gradient-to-br from-amber-900 to-amber-600"
        />
        <KpiCard
          label="HE disp."
          value={`${totalHorasExtrasDisponibles}h`}
          icon={<span className="text-[12px]">⚡</span>}
          bgClass="bg-gradient-to-br from-emerald-800 to-emerald-600"
        />
      </div>

      {/* Consolidado de almuerzos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="font-bold text-[13px] text-slate-900 mb-2.5">
          🍽️ Consolidado de Almuerzos — Hoy [Viernes 18 de Septiembre de 2026]
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
          <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest">
            Con almuerzo
          </div>
          <div className="text-[28px] font-extrabold text-emerald-600 mt-1 leading-none">
            {totalAlmuerzosHoy}
          </div>
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-[13px] text-slate-900">
            Detalle por Practicante
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg border-0 cursor-pointer transition-colors text-[11px] font-bold text-slate-600"
          >
            {sortAsc ? <ArrowDownAZ size={14} /> : <ArrowUpZA size={14} />}
            {sortAsc ? 'A-Z' : 'Z-A'}
          </button>
        </div>

        {practicantesOrdenados.map((p) => {
          const isSuspendido = p.estadoLaboral === 'suspendido'
          const isVacaciones = p.estadoLaboral === 'vacaciones'

          // Calcular faltas, tardanzas y HE del practicante en el mes
          let fMes = 0
          let tMes = 0
          let heMes = 0
          p.historial.forEach((h) => {
            if (h.fecha.startsWith(mesFiltroStr)) {
              if (h.estado === 'FALTA') fMes++
              if (h.estado === 'TARDANZA') tMes++
              if (h.estado === 'COMPENSADO' || h.estado === 'FALTA_CUBIERTA') heMes += 5
            }
          })

          return (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 py-2.5 border-b border-slate-100 last:border-b-0 ${
                isSuspendido ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
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

              {/* Nombre y badges */}
              <div className="flex-1 min-w-0">
                <div className={`text-[12px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${
                  isSuspendido ? 'text-slate-400' : 'text-slate-800'
                }`}>
                  {p.nombre} {p.apellido}
                </div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {isSuspendido && (
                    <span className="text-[9px] bg-slate-200 text-slate-500 rounded-md px-1.5 py-0.5 font-bold">
                      SUSPENDIDO
                    </span>
                  )}
                  {isVacaciones && (
                    <span className="text-[9px] bg-yellow-100 text-yellow-800 rounded-md px-1.5 py-0.5 font-bold">
                      VACACIONES
                    </span>
                  )}
                  {!isSuspendido && !isVacaciones && (
                    <>
                      {fMes > 0 && (
                        <span className="text-[9px] bg-red-100 text-red-700 rounded-md px-1.5 py-0.5 font-bold">
                          F:{fMes}
                        </span>
                      )}
                      {tMes > 0 && (
                        <span className="text-[9px] bg-amber-100 text-amber-700 rounded-md px-1.5 py-0.5 font-bold">
                          T:{tMes}
                        </span>
                      )}
                      {heMes > 0 && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 rounded-md px-1.5 py-0.5 font-bold">
                          HE:{heMes}h
                        </span>
                      )}
                      {fMes === 0 && tMes === 0 && heMes === 0 && (
                        <span className="text-[9px] bg-slate-50 text-slate-400 rounded-md px-1.5 py-0.5 font-bold">
                          S/N
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
