import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  Users,
  ShieldAlert,
  Save,
  Rocket,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  GraduationCap,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
import ModalConfirmacion from './ModalConfirmacion'
import type { Practicante } from '../types'

interface WizardNuevoPeriodoProps {
  isOpen: boolean
  onClose: () => void
}

export default function WizardNuevoPeriodo({ isOpen, onClose }: WizardNuevoPeriodoProps) {
  const getPeriodoActivo = useAppStore((s) => s.getPeriodoActivo)
  const practicantes = useAppStore((s) => s.practicantes)
  const monitores = useAppStore((s) => s.monitores || [])
  const crearPeriodoBorrador = useAppStore((s) => s.crearPeriodoBorrador)
  const lanzarNuevoPeriodo = useAppStore((s) => s.lanzarNuevoPeriodo)

  const periodoActivo = getPeriodoActivo() || {
    id: 'per-2026-02',
    nombre: '2026-02',
    fechaInicio: '2026-08-03',
    fechaFin: '2026-12-18',
    estado: 'activo' as const
  }

  // Practicantes activos del periodo actual
  const practicantesActivos = practicantes.filter(
    (p) => p.estadoLaboral !== 'retirado' && p.estado !== 'retirado'
  )

  // Pasos: 1. Definición | 2. Promoción de Alumnos | 3. Configuración de Roles
  const [paso, setPaso] = useState<1 | 2 | 3>(1)

  // Paso 1: Definición
  const [nombrePeriodo, setNombrePeriodo] = useState('2027-01')
  const [fechaInicio, setFechaInicio] = useState('2027-01-18')
  const [fechaFin, setFechaFin] = useState('2027-06-25')

  // Paso 2: Promociones (ID -> 'promover' | 'egresar' | 'retirado')
  const [promociones, setPromociones] = useState<Record<string, 'promover' | 'egresar' | 'retirado'>>({})

  // Paso 3: Configuración de Roles
  const [clonarRoles, setClonarRoles] = useState(true)
  const [supervisoresAsignados, setSupervisoresAsignados] = useState<Record<string, string>>({})

  // Modales de Confirmación de la barra inferior
  const [modalCancelarOpen, setModalCancelarOpen] = useState(false)
  const [modalGuardarOpen, setModalGuardarOpen] = useState(false)
  const [modalLanzarOpen, setModalLanzarOpen] = useState(false)
  const [palabraConfirmacion, setPalabraConfirmacion] = useState('')

  // Inicializar promociones y supervisores al abrir
  useEffect(() => {
    if (isOpen) {
      setPaso(1)
      setNombrePeriodo('2027-01')
      setFechaInicio('2027-01-18')
      setFechaFin('2027-06-25')
      setClonarRoles(true)
      setPalabraConfirmacion('')

      const promInit: Record<string, 'promover' | 'egresar' | 'retirado'> = {}
      const supInit: Record<string, string> = {}

      practicantesActivos.forEach((p) => {
        if (p.semestre === 'S6') {
          promInit[p.id] = 'egresar'
        } else {
          promInit[p.id] = 'promover'
        }
        supInit[p.id] = p.monitorId || (monitores[0]?.id ?? '')
      })

      setPromociones(promInit)
      setSupervisoresAsignados(supInit)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Validación de fecha para lanzamiento forzado
  const hoyStr = new Date().toISOString().split('T')[0]
  const fechaFinActivo = periodoActivo.fechaFin || '2026-12-18'
  const esLanzamientoForzado = hoyStr <= fechaFinActivo

  // Manejador: Cancelar y Salir
  const handleConfirmarCancelar = () => {
    setModalCancelarOpen(false)
    onClose()
  }

  // Manejador: Guardar como Borrador
  const handleConfirmarGuardarBorrador = () => {
    if (!nombrePeriodo.trim()) {
      toast.error('El nombre del periodo es requerido')
      return
    }
    crearPeriodoBorrador({
      nombre: nombrePeriodo.trim(),
      fechaInicio,
      fechaFin,
      clonarRoles
    })
    toast.success(`Periodo ${nombrePeriodo} guardado como borrador`)
    setModalGuardarOpen(false)
    onClose()
  }

  // Manejador: Lanzar Cambios
  const handleConfirmarLanzar = () => {
    if (esLanzamientoForzado && palabraConfirmacion.trim().toUpperCase() !== 'CONFIRMAR') {
      toast.error('Debes escribir la palabra "CONFIRMAR" para forzar la apertura del periodo')
      return
    }

    lanzarNuevoPeriodo({
      nombre: nombrePeriodo.trim(),
      fechaInicio,
      fechaFin,
      promociones,
      supervisores: supervisoresAsignados,
      clonarRoles
    })

    toast.success(`¡Periodo ${nombrePeriodo} lanzado exitosamente!`, {
      description: 'El periodo anterior fue cerrado y las Horas Extras se han reiniciado a 0.'
    })

    setModalLanzarOpen(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[28px] sm:rounded-3xl overflow-hidden relative flex flex-col h-[92vh] max-h-[92vh] shadow-2xl animate-in slide-in-from-bottom-full duration-300">
        
        {/* Cabecera del Wizard */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xs">
              <Rocket size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-800 m-0 leading-tight">
                Asignar Nuevo Periodo
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                Paso {paso} de 3 — {paso === 1 ? 'Definición' : paso === 2 ? 'Promoción de Alumnos' : 'Configuración de Roles'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalCancelarOpen(true)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border-none cursor-pointer active:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Indicador visual de pasos */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-100 shrink-0">
          {[
            { num: 1, label: 'Definición' },
            { num: 2, label: 'Promociones' },
            { num: 3, label: 'Roles' }
          ].map((item, idx) => (
            <React.Fragment key={item.num}>
              <button
                type="button"
                onClick={() => setPaso(item.num as 1 | 2 | 3)}
                className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                    paso === item.num
                      ? 'bg-blue-600 text-white shadow-xs'
                      : paso > item.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {paso > item.num ? '✓' : item.num}
                </div>
                <span
                  className={`text-[11px] font-medium hidden sm:inline ${
                    paso === item.num ? 'text-blue-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
              {idx < 2 && <div className="h-[2px] flex-1 mx-2 bg-slate-200" />}
            </React.Fragment>
          ))}
        </div>

        {/* Cuerpo del Wizard con scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4 pb-28">

          {/* ════════════ PASO 1: DEFINICIÓN ════════════ */}
          {paso === 1 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl flex items-start gap-3">
                <Sparkles size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[12px] text-blue-900 leading-relaxed">
                  Configura las fechas para la transición de periodo académico. El periodo actual activo es{' '}
                  <strong className="font-bold underline">{periodoActivo.nombre}</strong> (Cierre: {periodoActivo.fechaFin}).
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[12px] font-bold text-slate-700 mb-1 block">
                    Nombre del Nuevo Periodo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombrePeriodo}
                    onChange={(e) => setNombrePeriodo(e.target.value)}
                    placeholder="ej. 2027-01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Nomenclatura estándar del ERP de SENATI (ej. 2026-02, 2027-01).
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-bold text-slate-700 mb-1 block">
                      Fecha de Apertura <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-slate-700 mb-1 block">
                      Fecha de Cierre <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Resumen del periodo activo a sustituir */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Periodo Actual en Curso
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-slate-800">{periodoActivo.nombre}</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Activo
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>
                    {periodoActivo.fechaInicio} al {periodoActivo.fechaFin}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPaso(2)}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 border-none cursor-pointer transition-colors shadow-xs"
              >
                Continuar a Promoción de Alumnos <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ════════════ PASO 2: PROMOCIÓN DE ALUMNOS ════════════ */}
          {paso === 2 && (
            <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[12px] text-amber-900 leading-relaxed">
                  Define el destino de cada practicante activo para el periodo {nombrePeriodo}. Los promovidos pasarán al siguiente ciclo; los de S6 pueden egresar.
                </div>
              </div>

              <div className="flex items-center justify-between text-[12px] text-slate-500 font-semibold px-1">
                <span>Practicantes Activos ({practicantesActivos.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    const allProm: Record<string, 'promover' | 'egresar' | 'retirado'> = {}
                    practicantesActivos.forEach((p) => {
                      allProm[p.id] = p.semestre === 'S6' ? 'egresar' : 'promover'
                    })
                    setPromociones(allProm)
                    toast.success('Promociones sugeridas aplicadas a todos')
                  }}
                  className="text-blue-600 hover:underline bg-transparent border-none cursor-pointer text-[11px] font-bold"
                >
                  Sugerir todo
                </button>
              </div>

              {/* Lista de Practicantes */}
              <div className="flex flex-col gap-2.5">
                {practicantesActivos.map((p) => {
                  const accion = promociones[p.id] || (p.semestre === 'S6' ? 'egresar' : 'promover')

                  const sigSemestre = p.semestre === 'S4' ? 'S5' : p.semestre === 'S5' ? 'S6' : 'Egresado'

                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] font-bold text-slate-800 m-0 truncate">
                            {p.nombre} {p.apellido || ''}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {p.carrera || 'Practicante'} • Semestre actual: <strong>{p.semestre}</strong>
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            accion === 'promover'
                              ? 'bg-blue-100 text-blue-800'
                              : accion === 'egresar'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {accion === 'promover'
                            ? `Promover a ${sigSemestre}`
                            : accion === 'egresar'
                            ? 'Egresar'
                            : 'Dar de Baja'}
                        </span>
                      </div>

                      {/* Selector de Acción */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setPromociones((prev) => ({ ...prev, [p.id]: 'promover' }))}
                          disabled={p.semestre === 'S6'}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border ${
                            accion === 'promover'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : p.semestre === 'S6'
                              ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <UserCheck size={12} /> Promover
                        </button>

                        <button
                          type="button"
                          onClick={() => setPromociones((prev) => ({ ...prev, [p.id]: 'egresar' }))}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border ${
                            accion === 'egresar'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <GraduationCap size={12} /> Egresar
                        </button>

                        <button
                          type="button"
                          onClick={() => setPromociones((prev) => ({ ...prev, [p.id]: 'retirado' }))}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border ${
                            accion === 'retirado'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <UserX size={12} /> De Baja
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 border-none cursor-pointer transition-colors"
                >
                  <ChevronLeft size={16} /> Volver
                </button>
                <button
                  type="button"
                  onClick={() => setPaso(3)}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 border-none cursor-pointer transition-colors shadow-xs"
                >
                  Configurar Roles <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ════════════ PASO 3: CONFIGURACIÓN DE ROLES ════════════ */}
          {paso === 3 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col pr-2">
                    <span className="text-[13px] font-bold text-slate-800">
                      Clonar Asignaciones de Supervisores
                    </span>
                    <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Mantiene los mismos supervisores y especialistas del periodo {periodoActivo.nombre}.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClonarRoles(!clonarRoles)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer border-none shrink-0 ${
                      clonarRoles ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                        clonarRoles ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Ajuste manual por alumno promovido */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[12px] font-bold text-slate-700 block">
                  Supervisores para Alumnos Promovidos
                </span>

                {practicantesActivos
                  .filter((p) => promociones[p.id] === 'promover')
                  .map((p) => {
                    const supActual = supervisoresAsignados[p.id] || p.monitorId

                    return (
                      <div
                        key={p.id}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-[12px] font-bold text-slate-800 m-0 truncate">
                            {p.nombre} {p.apellido || ''}
                          </h5>
                          <span className="text-[10px] text-slate-400">
                            Pasa a {p.semestre === 'S4' ? 'S5' : 'S6'}
                          </span>
                        </div>
                        <select
                          value={supActual}
                          onChange={(e) =>
                            setSupervisoresAsignados((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none max-w-[170px] truncate cursor-pointer"
                        >
                          {monitores.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} ({m.area?.slice(0, 15) || 'Supervisor'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 border-none cursor-pointer transition-colors"
                >
                  <ChevronLeft size={16} /> Volver
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ════════════ BARRA INFERIOR FIJA CON 3 BOTONES CRÍTICOS ════════════ */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 flex items-center gap-2 z-20">
          {/* Botón 1: Cancelar y Salir */}
          <button
            type="button"
            onClick={() => setModalCancelarOpen(true)}
            className="flex-1 py-3 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border-none cursor-pointer transition-colors shadow-2xs"
            title="Descartar cambios y cerrar"
          >
            <X size={14} /> Cancelar
          </button>

          {/* Botón 2: Guardar Cambios (Borrador) */}
          <button
            type="button"
            onClick={() => setModalGuardarOpen(true)}
            className="flex-1 py-3 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border border-blue-200 cursor-pointer transition-colors shadow-2xs"
            title="Guardar como borrador sin activar"
          >
            <Save size={14} /> Guardar
          </button>

          {/* Botón 3: LANZAR CAMBIOS (Forzar Apertura) */}
          <button
            type="button"
            onClick={() => {
              setPalabraConfirmacion('')
              setModalLanzarOpen(true)
            }}
            className="flex-[1.5] py-3 px-2.5 bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-[11px] font-extrabold tracking-wide uppercase flex items-center justify-center gap-1.5 border-none cursor-pointer transition-all shadow-md active:scale-95"
            title="Activar inmediatamente el nuevo periodo"
          >
            <Rocket size={14} /> Lanzar Periodo
          </button>
        </div>

      </div>

      {/* ──────────────── DIÁLOGOS DE CONFIRMACIÓN ──────────────── */}

      {/* 1. Modal Confirmar Cancelar */}
      <ModalConfirmacion
        isOpen={modalCancelarOpen}
        onClose={() => setModalCancelarOpen(false)}
        onConfirm={handleConfirmarCancelar}
        titulo="¿Cancelar y Salir?"
        mensaje="¿Estás seguro? Se perderán todos los cambios no guardados en el asistente de periodo."
        textoConfirmar="Sí, salir"
        textoCancelar="Seguir configurando"
        tipo="advertencia"
      />

      {/* 2. Modal Confirmar Guardar Borrador */}
      <ModalConfirmacion
        isOpen={modalGuardarOpen}
        onClose={() => setModalGuardarOpen(false)}
        onConfirm={handleConfirmarGuardarBorrador}
        titulo="¿Guardar como borrador?"
        mensaje={`¿Guardar la configuración de ${nombrePeriodo} como borrador? El periodo actual (${periodoActivo.nombre}) continuará activo sin alteraciones.`}
        textoConfirmar="Guardar Borrador"
        textoCancelar="Cancelar"
        tipo="info"
      />

      {/* 3. Modal Crítico: LANZAR CAMBIOS (Forzar Apertura) */}
      {modalLanzarOpen && (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[380px] bg-white rounded-3xl p-5 shadow-2xl relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 shadow-xs">
              <ShieldAlert size={28} />
            </div>

            <h3 className="m-0 text-[17px] font-bold text-slate-900 leading-tight mb-2">
              Lanzar Nuevo Periodo: {nombrePeriodo}
            </h3>

            <p className="text-[12px] text-slate-600 leading-relaxed mb-3">
              Atención: Esta acción cerrará permanentemente el periodo actual (<strong>{periodoActivo.nombre}</strong>),
              reiniciará las <strong>Horas Extras a 0</strong> de todos los practicantes y activará{' '}
              <strong>{nombrePeriodo}</strong>.
            </p>

            {/* Alerta de lanzamiento forzado si aún no culmina */}
            {esLanzamientoForzado && (
              <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3.5 text-left">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[11px] mb-1">
                  <AlertTriangle size={14} /> Lanzamiento Forzado Anticipado
                </div>
                <p className="text-[11px] text-rose-700 m-0 mb-2 leading-snug">
                  La fecha de cierre de {periodoActivo.nombre} ({periodoActivo.fechaFin}) aún no ha sido sobrepasada.
                  Para forzar la apertura anticipada, escribe estrictamente <strong className="font-extrabold tracking-wider">CONFIRMAR</strong>:
                </p>
                <input
                  type="text"
                  value={palabraConfirmacion}
                  onChange={(e) => setPalabraConfirmacion(e.target.value)}
                  placeholder="Escribe CONFIRMAR"
                  className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-rose-900 tracking-wider text-center outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>
            )}

            <div className="flex items-center gap-2 w-full pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalLanzarOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] rounded-xl border-none cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarLanzar}
                disabled={esLanzamientoForzado && palabraConfirmacion.trim().toUpperCase() !== 'CONFIRMAR'}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-[12px] rounded-xl border-none cursor-pointer transition-colors shadow-xs"
              >
                Proceder y Lanzar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

