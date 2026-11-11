import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import {
  esSupervisorSuspendido,
  getPeriodoContext,
  perteneceAPeriodo,
} from '../utils/periodoHelpers'
import type { Monitor, Practicante } from '../types'

export interface CumpleanoItem {
  id: string
  nombreCompleto: string
  dia: number
  mesIndex: number
  mesTexto: string
  edadActual: number
  avatar: string
  esSupervisor: boolean
  rolLabel: 'Supervisor' | 'Practicante'
}

export interface ModalCumpleanosProps {
  abierto: boolean
  onCerrar: () => void
  items?: CumpleanoItem[]
}

const MESES_CORTOS = [
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

function parsearCumpleanos(
  fechaNacimiento: string | undefined,
  hoyActual: Date
): {
  dia: number
  mesIndex: number
  mesTexto: string
  edadActual: number
} | null {
  if (!fechaNacimiento || !fechaNacimiento.includes('-')) return null
  const [year, month, day] = fechaNacimiento.split('-')
  const anioNac = parseInt(year, 10)
  const mesNum = parseInt(month, 10)
  const diaNum = parseInt(day, 10)

  if (
    Number.isNaN(anioNac) ||
    Number.isNaN(mesNum) ||
    Number.isNaN(diaNum) ||
    mesNum < 1 ||
    mesNum > 12 ||
    diaNum < 1 ||
    diaNum > 31
  ) {
    return null
  }

  const mesIndex = mesNum - 1
  let edad = hoyActual.getFullYear() - anioNac
  const mDiff = hoyActual.getMonth() - mesIndex
  if (mDiff < 0 || (mDiff === 0 && hoyActual.getDate() < diaNum)) {
    edad -= 1
  }

  return {
    dia: diaNum,
    mesIndex,
    mesTexto: MESES_CORTOS[mesIndex],
    edadActual: edad,
  }
}

function inicialesDeNombre(nombreCompleto: string): string {
  const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'US'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function construirCumpleanosActivos({
  practicantes,
  monitores,
  fechaReferencia,
}: {
  practicantes: Practicante[]
  monitores: Monitor[]
  fechaReferencia?: Date
}): CumpleanoItem[] {
  const hoyActual = fechaReferencia ?? new Date()
  const lista: CumpleanoItem[] = []

  // 1. Practicantes ACTIVOS
  for (const p of practicantes || []) {
    const estaActivo =
      (!p.estadoGlobal || p.estadoGlobal === 'ACTIVO') &&
      p.estadoLaboral !== 'retirado' &&
      p.estado !== 'retirado'
    if (!estaActivo) continue

    const fechaInfo = parsearCumpleanos(p.fechaNacimiento, hoyActual)
    if (!fechaInfo) continue

    const nombreCompleto = `${p.nombre} ${p.apellido || ''}`.trim()
    lista.push({
      id: p.id,
      nombreCompleto,
      ...fechaInfo,
      avatar: inicialesDeNombre(nombreCompleto),
      esSupervisor: false,
      rolLabel: 'Practicante',
    })
  }

  // 2. Supervisores ACTIVOS
  for (const m of monitores || []) {
    const estaActivo =
      (!m.estadoGlobal || m.estadoGlobal === 'ACTIVO') &&
      !esSupervisorSuspendido(m) &&
      m.estado !== 'Retirado'
    if (!estaActivo) continue

    const fechaInfo = parsearCumpleanos(m.fechaNacimiento, hoyActual)
    if (!fechaInfo) continue

    const nombreCompleto = (m.nombre || '').trim()
    if (!nombreCompleto) continue

    lista.push({
      id: m.id,
      nombreCompleto,
      ...fechaInfo,
      avatar: inicialesDeNombre(nombreCompleto),
      esSupervisor: true,
      rolLabel: 'Supervisor',
    })
  }

  return lista.sort((a, b) => {
    if (a.mesIndex !== b.mesIndex) return a.mesIndex - b.mesIndex
    if (a.dia !== b.dia) return a.dia - b.dia
    return a.nombreCompleto.localeCompare(b.nombreCompleto, 'es')
  })
}

export default function ModalCumpleaños({
  abierto,
  onCerrar,
  items,
}: ModalCumpleanosProps) {
  const todosPracticantes = useAppStore((s) => s.practicantes)
  const monitores = useAppStore((s) => s.monitores || [])
  const periodos = useAppStore((s) => s.periodos || [])
  const periodoVisualizacionId = useAppStore((s) => s.periodoVisualizacionId)

  const listaComputed = useMemo(() => {
    if (items) return items
    const { periodoActivo, periodoVisualizacionId: periodoVisId } =
      getPeriodoContext(periodos, periodoVisualizacionId)
    const practicantesPeriodo = (todosPracticantes || []).filter((p) =>
      perteneceAPeriodo(p, periodoVisId, periodoActivo?.id || 'per-2026-02')
    )
    return construirCumpleanosActivos({
      practicantes: practicantesPeriodo,
      monitores,
    })
  }, [items, todosPracticantes, monitores, periodos, periodoVisualizacionId])

  if (!abierto) return null

  const mesActual = new Date().getMonth()

  return (
    <div
      id="modal-cumpleanos-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/55 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        id="modal-cumpleanos-sheet"
        className="bg-white w-full max-w-[430px] rounded-t-3xl sm:rounded-3xl p-5 max-h-[82vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex justify-center mb-2 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="m-0 font-bold text-lg text-slate-800 truncate">
              Cumpleaños del Año
            </h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
              {listaComputed.length}
            </span>
          </div>
          <button
            id="btn-cerrar-modal-cumpleanos"
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar cumpleaños"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border-none flex items-center justify-center text-slate-500 font-bold cursor-pointer shrink-0 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col gap-2.5 pr-1">
          {listaComputed.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              No hay cumpleaños registrados en el personal activo.
            </div>
          ) : (
            listaComputed.map((c) => {
              const esMesActual = c.mesIndex === mesActual
              return (
                <div
                  key={`${c.esSupervisor ? 'sup' : 'prac'}-${c.id}`}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                    esMesActual
                      ? 'bg-indigo-50/80 border-indigo-200'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        c.esSupervisor
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {c.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 truncate">
                          {c.nombreCompleto}
                        </span>
                        {c.esSupervisor && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-extrabold shrink-0"
                            title="Supervisor"
                          >
                            (S)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">
                        {c.rolLabel}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 ${
                      esMesActual
                        ? 'bg-indigo-200 text-indigo-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.dia} {c.mesTexto}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

