import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
import type { EstadoAsistencia, Modalidad, Practicante } from '../types'

// ============================================================
// CONSTANTES
// ============================================================

const MOCK_YEAR = 2026
const MOCK_MONTH = 8   // Septiembre (0-indexed)
const HE_HORAS = 5

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ============================================================
// UTILIDADES DE FECHAS
// ============================================================

function getFechaStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function getDow(y: number, m: number, d: number) {
  return new Date(y, m, d).getDay()
}
function getDiaLabel(y: number, m: number, d: number) {
  return `${DIAS_SEMANA[getDow(y, m, d)]} ${d}`
}
function getFechaLegible(y: number, m: number, d: number) {
  return new Date(y, m, d).toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Verifica si una fecha ISO cae dentro de un rango [inicio, fin] inclusive
function fechaEnRango(fecha: string, inicio: string, fin: string): boolean {
  return fecha >= inicio && fecha <= fin
}

// ============================================================
// LOGICA DE CELDAS CON RANGOS DE FECHAS
// ============================================================

type CeldaInfo = { label: string; cls: string; bloqueado: boolean }

function getCeldaAsistencia(p: Practicante, fecha: string): CeldaInfo {
  if (p.estadoLaboral === 'retirado' && p.retiro) {
    const inicio = p.retiro.fechaInicio
    const fin = '9999-12-31'
    if (fechaEnRango(fecha, inicio, fin)) {
      return { label: 'R', cls: 'bg-slate-100 text-slate-400 border border-slate-200', bloqueado: true }
    }
  }
  const reg = p.historial.find((h) => h.fecha === fecha)
  switch (reg?.estado) {
    case 'ASISTIO': return { label: '\u2713', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', bloqueado: false }
    case 'TARDANZA': return { label: 'T', cls: 'bg-amber-100 text-amber-700 border border-amber-200', bloqueado: false }
    case 'FALTA': return { label: 'F', cls: 'bg-red-100 text-red-700 border border-red-200', bloqueado: false }
    case 'CAMPO': return { label: 'C', cls: 'bg-blue-100 text-blue-700 border border-blue-200', bloqueado: false }
    case 'COMPENSADO':
    case 'FALTA_CUBIERTA': return { label: 'HE', cls: 'bg-sky-100 text-sky-700 border border-sky-200', bloqueado: false }
    case 'SEMINARIO': return { label: 'Se', cls: 'bg-violet-100 text-violet-700 border border-violet-200', bloqueado: false }
    case 'LIBRE': return { label: 'L', cls: 'bg-green-50 text-green-700 border border-green-200', bloqueado: false }
    default: return { label: '\u00b7', cls: 'bg-slate-50 text-slate-300 border border-slate-100', bloqueado: false }
  }
}


// ============================================================
// TIPOS
// ============================================================

interface AusenciaInfo {
  practicante: Practicante
  tipo: 'retirado'
  inicio: string
  fin: string
}

interface SheetState {
  open: boolean
  practicante: Practicante | null
  fecha: string
  fechaLegible: string
  estadoActual: EstadoAsistencia | undefined
  modalidadDia: 'presencial' | 'virtual'
}
const SHEET_VACIO: SheetState = {
  open: false, practicante: null,
  fecha: '', fechaLegible: '',
  estadoActual: undefined, modalidadDia: 'presencial',
}

// ============================================================
// MODAL DE SOLO LECTURA (Vacaciones / Suspendido por rango)
// ============================================================

function ModalAusencia({ info, onClose }: { info: AusenciaInfo; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-white rounded-t-[20px] px-5 pt-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-bold text-base text-slate-900">
              {info.practicante.nombre} {info.practicante.apellido}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Retirado
            </p>
          </div>
          <button onClick={onClose} className="bg-slate-100 rounded-lg p-1.5 cursor-pointer border-0">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="rounded-2xl p-4 mb-5 bg-slate-50 border border-slate-200">
          <p className="font-bold text-[13px] mb-2 text-slate-600">
            Periodo de Retiro
          </p>
          <div className="space-y-1">
            <p className="text-[12px] text-slate-600"><strong>Desde:</strong> {info.inicio}</p>
            <p className="text-[12px] text-slate-600">
              <strong>Hasta:</strong> Indefinido
            </p>
            {info.practicante.retiro?.motivo && (
              <p className="text-[12px] text-slate-600"><strong>Motivo:</strong> {info.practicante.retiro.motivo}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl font-bold text-[14px] text-white border-0 cursor-pointer bg-gradient-to-br from-blue-900 to-blue-600"
        >
          Aceptar
        </button>
      </div>
    </div>
  )
}

// ============================================================
// BOTTOM-SHEET DE EDICION
// ============================================================

function BottomSheetEdicion({ sheet, onClose }: { sheet: SheetState; onClose: () => void }) {
  const actualizarConModalidad = useAppStore((s) => s.actualizarAsistenciaDiaConModalidad)
  const compensarFaltaConHE = useAppStore((s) => s.compensarFaltaConHE)
  const extraHoursBalances = useAppStore((s) => s.extraHoursBalances)

  const saldoLive = useMemo(() => {
    if (!sheet.practicante) return 0
    return extraHoursBalances.find((b) => b.practicanteId === sheet.practicante!.id)?.horasDisponibles ?? 0
  }, [extraHoursBalances, sheet.practicante])

  const [estadoSel, setEstadoSel] = useState<EstadoAsistencia>(sheet.estadoActual ?? 'PENDIENTE')
  const [modalidadLocal, setModalidadLocal] = useState<'presencial' | 'virtual'>(sheet.modalidadDia)

  const esVirtual = modalidadLocal === 'virtual'
  const mostrarHE = estadoSel === 'FALTA'
  const puedeCompensarHE = mostrarHE && saldoLive >= HE_HORAS

  const handleToggleModalidad = () => {
    const nueva = esVirtual ? 'presencial' : 'virtual'
    setModalidadLocal(nueva)
    if (nueva === 'virtual' && estadoSel === 'CAMPO') setEstadoSel('PENDIENTE')
  }

  type BtnDef = { estado: EstadoAsistencia; label: string; activeClass: string }
  const BTNS_PRESENCIAL: BtnDef[] = [
    { estado: 'ASISTIO', label: 'Asistio', activeClass: 'bg-emerald-500 border-emerald-500 text-white' },
    { estado: 'TARDANZA', label: 'Tardanza', activeClass: 'bg-amber-500 border-amber-500 text-white' },
    { estado: 'FALTA', label: 'Falta', activeClass: 'bg-red-500 border-red-500 text-white' },
    { estado: 'CAMPO', label: 'Campo', activeClass: 'bg-blue-500 border-blue-500 text-white' },
  ]
  const BTNS_VIRTUAL: BtnDef[] = [
    { estado: 'ASISTIO', label: 'Asistio', activeClass: 'bg-emerald-500 border-emerald-500 text-white' },
    { estado: 'TARDANZA', label: 'Tardanza', activeClass: 'bg-amber-500 border-amber-500 text-white' },
    { estado: 'FALTA', label: 'Falta', activeClass: 'bg-red-500 border-red-500 text-white' },
  ]
  const btns = esVirtual ? BTNS_VIRTUAL : BTNS_PRESENCIAL

  const handleGuardar = () => {
    if (!sheet.practicante) return
    actualizarConModalidad(sheet.practicante.id, sheet.fecha, estadoSel, modalidadLocal as Modalidad)
    toast.success(`Guardado: ${sheet.practicante.nombre} - ${estadoSel} (${modalidadLocal})`)
    onClose()
  }

  const handleCompensar = () => {
    if (!sheet.practicante) return
    const ok = compensarFaltaConHE(sheet.practicante.id, sheet.fecha, HE_HORAS)
    if (ok) {
      toast.success(`Falta cubierta con ${HE_HORAS}h de HE`)
      onClose()
    } else {
      toast.error('Saldo insuficiente de Horas Extras')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/55 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-white rounded-t-[20px] px-5 pt-6"
        style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))', boxShadow: '0 -4px 30px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-bold text-base text-slate-900">
              {sheet.practicante?.nombre} {sheet.practicante?.apellido}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{sheet.fechaLegible}</p>
          </div>
          <button onClick={onClose} className="bg-slate-100 rounded-lg p-1.5 cursor-pointer border-0">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Toggle modalidad + Saldo HE */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={handleToggleModalidad}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold border-0 cursor-pointer transition-all ${esVirtual ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
              }`}
          >
            {esVirtual ? 'Virtual' : 'Presencial'}
            <span className="text-[9px] opacity-50">cambiar</span>
          </button>
          <span className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${saldoLive > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400'
            }`}>
            Saldo HE: {saldoLive}h
          </span>
        </div>

        {/* Label */}
        <p className="text-[10px] font-extrabold text-slate-400 tracking-widest mb-2">
          MARCAR ASISTENCIA {esVirtual ? '(VIRTUAL)' : '(PRESENCIAL)'}
        </p>

        {/* Botones de estado */}
        <div className={`grid gap-2 mb-5 ${esVirtual ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {btns.map(({ estado, label, activeClass }) => {
            const isActive = estadoSel === estado
            return (
              <button
                key={estado}
                onClick={() => setEstadoSel(estado)}
                className={`py-3 rounded-xl text-[12px] font-bold cursor-pointer border-2 transition-all ${isActive ? activeClass : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Seccion HE - SOLO para FALTA */}
        {mostrarHE && (
          <div className={`rounded-2xl p-4 mb-5 ${puedeCompensarHE ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'
            }`}>
            <p className="font-bold text-[12px] text-slate-900 mb-2">Recuperar con Horas Extras</p>
            {puedeCompensarHE ? (
              <>
                <p className="text-[11px] text-slate-500 mb-3">
                  Saldo actual: <strong className="text-sky-700">{saldoLive}h</strong>
                  {' - '} Saldo posterior: <strong className="text-red-600">{saldoLive - HE_HORAS}h</strong>
                </p>
                <button
                  onClick={handleCompensar}
                  className="w-full py-3 rounded-xl text-[13px] font-bold text-white border-0 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#0369a1,#0ea5e9)' }}
                >
                  Compensar falta con {HE_HORAS}h de HE
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 px-3 py-2.5 rounded-lg">
                <span className="text-base">Sin saldo</span>
                <span className="text-[11px] text-red-700 font-semibold">
                  Minimo {HE_HORAS}h requeridas
                </span>
              </div>
            )}
          </div>
        )}

        {/* Guardar */}
        <button
          id="btn-guardar-general"
          onClick={handleGuardar}
          className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white border-0 cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}

// ============================================================
// LEYENDA
// ============================================================

const LEYENDA_ASISTENCIA = [
  { label: 'OK', cls: 'bg-emerald-100 text-emerald-700', txt: 'Asistio' },
  { label: 'T', cls: 'bg-amber-100 text-amber-700', txt: 'Tardanza' },
  { label: 'F', cls: 'bg-red-100 text-red-700', txt: 'Falta' },
  { label: 'C', cls: 'bg-blue-100 text-blue-700', txt: 'Campo' },
  { label: 'HE', cls: 'bg-sky-100 text-sky-700', txt: 'Comp. HE' },
  { label: 'R', cls: 'bg-slate-100 text-slate-400', txt: 'Retirado' },
]
function Leyenda() {
  const items = LEYENDA_ASISTENCIA
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-5 h-5 rounded flex items-center justify-center text-[7px] font-extrabold ${it.cls}`}>
            {it.label}
          </div>
          <span className="text-[9px] text-slate-400 font-medium">{it.txt}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// TABLA MATRIZ
// ============================================================

interface TablaMatrizProps {
  practicantes: Practicante[]
  year: number
  month: number
  dias: number[]
  extraHoursBalances: { practicanteId: string; horasDisponibles: number }[]
  onCeldaClick: (p: Practicante, fecha: string, fechaLegible: string) => void
}

function TablaMatriz({ practicantes, year, month, dias, extraHoursBalances, onCeldaClick }: TablaMatrizProps) {
  return (
    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table className="border-collapse" style={{ tableLayout: 'fixed', width: 'max-content' }}>
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 text-left text-[10px] font-bold text-white px-3 py-2.5"
              style={{ background: '#1E3A8A', minWidth: 130, borderRight: '2px solid #2563EB' }}
            >
              PRACTICANTE
            </th>
            <th
              className="sticky z-10 text-center text-[10px] font-bold text-blue-300 py-2.5"
              style={{ left: 130, background: '#1E3A8A', width: 42, borderRight: '2px solid rgba(255,255,255,0.15)' }}
            >
              HE
            </th>
            {dias.map((d) => {
              const dow = getDow(year, month, d)
              const esFinde = dow === 0 || dow === 6
              const label = getDiaLabel(year, month, d)
              const [dayAbbr, dayNum] = label.split(' ')
              return (
                <th
                  key={d}
                  className="text-center font-bold"
                  style={{
                    background: esFinde ? '#0c1f4a' : '#1E3A8A',
                    color: esFinde ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)',
                    fontSize: 8, padding: '7px 0', width: 34,
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {dayAbbr}<br /><span style={{ fontSize: 10 }}>{dayNum}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {practicantes.map((p, ri) => {
            const saldo = extraHoursBalances.find((b) => b.practicanteId === p.id)?.horasDisponibles ?? 0
            const rowBg = ri % 2 === 0 ? '#fafafa' : 'white'
            return (
              <tr key={p.id} style={{ background: rowBg }}>
                <td
                  className="sticky left-0 z-[5] py-1.5 px-3"
                  style={{ background: rowBg, minWidth: 130, borderRight: '2px solid #e2e8f0' }}
                >
                  <p className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                    {p.nombre} {p.apellido.split(' ')[0]}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {p.modalidadBase} · {p.estadoLaboral}
                  </p>
                </td>
                <td
                  className="sticky z-[5] text-center py-1"
                  style={{ left: 130, background: rowBg, width: 42, borderRight: '2px solid #e2e8f0' }}
                >
                  <span className={`inline-block rounded-lg px-1.5 py-0.5 text-[9px] font-extrabold ${saldo > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                    {saldo}h
                  </span>
                </td>
                {dias.map((d) => {
                  const fecha = getFechaStr(year, month, d)
                  const info = getCeldaAsistencia(p, fecha)
                  return (
                    <td
                      key={d}
                      className="text-center"
                      style={{ padding: '3px 2px', borderLeft: '1px solid #f1f5f9' }}
                    >
                      <button
                        onClick={() => onCeldaClick(p, fecha, getFechaLegible(year, month, d))}
                        className={`w-7 h-7 rounded flex items-center justify-center mx-auto text-[8px] font-extrabold cursor-pointer transition-all ${info.cls}`}
                      >
                        {info.label}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// MAIN — GENERAL SCREEN
// ============================================================

export default function GeneralScreen() {
  const practicantes = useAppStore((s) => s.practicantes)
  const extraHoursBalances = useAppStore((s) => s.extraHoursBalances)

  const [mesOffset, setMesOffset] = useState(0)
  const [sheet, setSheet] = useState<SheetState>(SHEET_VACIO)
  const [ausenciaInfo, setAusenciaInfo] = useState<AusenciaInfo | null>(null)

  const mesActual = (MOCK_MONTH + mesOffset + 12) % 12
  const anioActual = MOCK_YEAR + Math.floor((MOCK_MONTH + mesOffset) / 12)
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
  const dias = useMemo(() => Array.from({ length: diasEnMes }, (_, i) => i + 1), [diasEnMes])

  const handleCeldaClick = (p: Practicante, fecha: string, fechaLegible: string) => {
    // Retirado en rango
    if (p.estadoLaboral === 'retirado' && p.retiro) {
      const inicio = p.retiro.fechaInicio
      const fin = '9999-12-31'
      if (fechaEnRango(fecha, inicio, fin)) {
        setAusenciaInfo({ practicante: p, tipo: 'retirado', inicio, fin })
        return
      }
    }
    // Edición de asistencia
    const reg = p.historial.find((h) => h.fecha === fecha)
    setSheet({
      open: true,
      practicante: p,
      fecha,
      fechaLegible,
      estadoActual: reg?.estado,
      modalidadDia: reg?.modalidad === 'virtual' ? 'virtual' : 'presencial',
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Cabecera */}
      <div className="rounded-2xl px-5 py-4" style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)' }}>
        <p className="font-bold text-base text-white mb-0.5">Vista General</p>
        <p className="text-[12px] text-white/75">
          Toca una celda para editar asistencia
        </p>
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-200">
        <button onClick={() => setMesOffset((o) => o - 1)} className="bg-slate-100 rounded-lg px-2.5 py-1.5 border-0 cursor-pointer">
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <span className="font-bold text-[14px] text-slate-900">{MESES[mesActual]} {anioActual}</span>
        <button
          onClick={() => setMesOffset((o) => o + 1)}
          disabled={mesOffset >= 0}
          className={`bg-slate-100 rounded-lg px-2.5 py-1.5 border-0 cursor-pointer ${mesOffset >= 0 ? 'opacity-30 cursor-default' : ''}`}
        >
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Leyenda */}
      <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200">
        <Leyenda />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <TablaMatriz
          practicantes={practicantes}
          year={anioActual}
          month={mesActual}
          dias={dias}
          extraHoursBalances={extraHoursBalances}
          onCeldaClick={handleCeldaClick}
        />
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-slate-400 py-2">
        {practicantes.length} practicantes - Desliza horizontalmente
      </p>

      {ausenciaInfo && <ModalAusencia info={ausenciaInfo} onClose={() => setAusenciaInfo(null)} />}
      {sheet.open && <BottomSheetEdicion sheet={sheet} onClose={() => setSheet(SHEET_VACIO)} />}
    </div>
  )
}
