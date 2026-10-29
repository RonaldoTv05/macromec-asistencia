import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Send, Trash2, X, FileText, Download, Upload, Archive } from 'lucide-react'
import { descargarArchivoBase64 } from '../utils/fileUtils'
import ModalNuevoInforme from '../components/ModalNuevoInforme'
import ModalConfirmacion from '../components/ModalConfirmacion'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
import type { DiaHorario, HorarioSemanal, Modalidad, Practicante, RegistroDia } from '../types'

// ── Utilidades ─────────────────────────────────────────────────

function calcHoras(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  const diff = hf * 60 + mf - (hi * 60 + mi)
  return Math.round((diff / 60) * 10) / 10
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const meses = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
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

// ── Constantes ────────────────────────────────────────────────

const DIAS_SEMANA: { key: DiaHorario['dia']; label: string }[] = [
  { key: 'Lunes', label: 'Lunes' },
  { key: 'Martes', label: 'Martes' },
  { key: 'Miércoles', label: 'Miércoles' },
  { key: 'Jueves', label: 'Jueves' },
  { key: 'Viernes', label: 'Viernes' },
  { key: 'Sábado', label: 'Sábado' },
  { key: 'Domingo', label: 'Domingo' },
];

const MODALIDAD_LABELS: Record<Modalidad, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  semipresencial: 'Semipresencial',
  libre: 'Libre',
}

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
}

type DiaForm = {
  dia: DiaHorario['dia']
  modalidad: Modalidad
  horaInicio: string
  horaFin: string
  horas: number
  horasCalculadas: number
}

function getHorarioVigente(p?: Practicante): HorarioSemanal | undefined {
  if (!p) return undefined
  if (p.horarioVigente && (p.horarioVigente.estado === 'Aprobado' || p.horarioVigente.estado === 'aprobado')) {
    return p.horarioVigente
  }
  if (p.horarioAprobado && (p.horarioAprobado.estado === 'Aprobado' || p.horarioAprobado.estado === 'aprobado')) {
    return p.horarioAprobado
  }
  if (p.horarioActual && (p.horarioActual.estado === 'Aprobado' || p.horarioActual.estado === 'aprobado')) {
    return p.horarioActual
  }
  return p.horarioVigente || p.horarioAprobado
}

function mapHorarioToDiasForm(horario?: HorarioSemanal): DiaForm[] {
  if (!horario || !horario.dias || horario.dias.length === 0) {
    return DIAS_SEMANA.map((d) => ({
      dia: d.key,
      modalidad: 'libre',
      horaInicio: '',
      horaFin: '',
      horas: 0,
      horasCalculadas: 0,
    }))
  }

  return DIAS_SEMANA.map((d) => {
    const diaEncontrado = horario.dias.find(
      (hd) => hd.dia.toLowerCase() === d.key.toLowerCase(),
    )

    if (!diaEncontrado) {
      return {
        dia: d.key,
        modalidad: 'libre',
        horaInicio: '',
        horaFin: '',
        horas: 0,
        horasCalculadas: 0,
      }
    }

    let mod: Modalidad = 'libre'
    if (diaEncontrado.modalidad) {
      mod = diaEncontrado.modalidad.toLowerCase() as Modalidad
    } else if (diaEncontrado.modalidadDiaria) {
      mod = diaEncontrado.modalidadDiaria.toLowerCase() as Modalidad
    }

    const horaInicio = diaEncontrado.horaInicio || ''
    const horaFin = diaEncontrado.horaFin || ''

    let horas = 0
    if (mod !== 'libre') {
      if (diaEncontrado.horas !== undefined && diaEncontrado.horas > 0) {
        horas = diaEncontrado.horas
      } else if (diaEncontrado.horasCalculadas !== undefined && diaEncontrado.horasCalculadas > 0) {
        horas = diaEncontrado.horasCalculadas
      } else if (horaInicio && horaFin) {
        horas = calcHoras(horaInicio, horaFin)
      }
    }

    return {
      dia: d.key,
      modalidad: mod,
      horaInicio,
      horaFin,
      horas,
      horasCalculadas: horas,
    }
  })
}

// ============================================================
// VISTA PRACTICANTE — Declaración de Horario Semanal
// ============================================================

const FECHA_HOY = '2026-09-18' // Mock

function PracticanteHorarios() {
  const practicantes = useAppStore((s) => s.practicantes)
  const usuarioActual = useAppStore((s) => s.usuarioActual)
  const enviarHorario = useAppStore((s) => s.enviarHorario)
  const cancelarHorario = useAppStore((s) => s.cancelarHorario)
  const acumularHorasExtras = useAppStore((s) => s.acumularHorasExtras)
  const enviarInformeQuincenal = useAppStore((s) => s.enviarInformeQuincenal)
  const archivarInformeQuincenal = useAppStore((s) => s.archivarInformeQuincenal)
  const eliminarInformeQuincenal = useAppStore((s) => s.eliminarInformeQuincenal)
  const informesQuincenales = useAppStore((s) => s.informesQuincenales)
  const p = practicantes.find(pr => pr.id === usuarioActual?.id) || practicantes[0]
  const misInformes = informesQuincenales.filter(i => i.practicanteId === (usuarioActual?.id || p.id))
  const misInformesActivos = misInformes.filter(i => !i.archivado)
  const misInformesArchivados = misInformes.filter(i => i.archivado)

  // States for new Informe Quincenal modal & Archivo
  const [showModal, setShowModal] = useState(false)
  const [showArchivadosModal, setShowArchivadosModal] = useState(false)
  const [informeAEliminar, setInformeAEliminar] = useState<string | null>(null)

  // Horario aprobado / vigente de la entidad relacional Practicante
  const horarioVigente = getHorarioVigente(p)
  const tieneHorarioAprobado = !!horarioVigente
  const pendienteActual = p?.horarioPendiente

  // Requerimiento 1 & 2: isEditing se inicializa en false si existe un horario aprobado cargado
  const [isEditing, setIsEditing] = useState<boolean>(() => {
    if (tieneHorarioAprobado) return false
    if (pendienteActual && pendienteActual.estado !== 'Rechazado') return false
    return true
  })

  // Requerimiento 1: Si existe horario aprobado, mapear obligatoriamente sus datos reales; sino plantilla en blanco
  const [diasForm, setDiasForm] = useState<DiaForm[]>(() => {
    if (tieneHorarioAprobado) {
      return mapHorarioToDiasForm(horarioVigente)
    }
    return DIAS_SEMANA.map((d) => ({
      dia: d.key,
      modalidad: 'libre',
      horaInicio: '',
      horaFin: '',
      horas: 0,
      horasCalculadas: 0,
    }))
  })

  // Sincronización cuando el practicante o su horario vigente en el store cambia (ej. al ser aprobado por Gerencia)
  useEffect(() => {
    if (!isEditing) {
      if (tieneHorarioAprobado) {
        setDiasForm(mapHorarioToDiasForm(horarioVigente))
      } else {
        setDiasForm(
          DIAS_SEMANA.map((d) => ({
            dia: d.key,
            modalidad: 'libre',
            horaInicio: '',
            horaFin: '',
            horas: 0,
            horasCalculadas: 0,
          }))
        )
      }
    }
  }, [p?.id, horarioVigente, tieneHorarioAprobado, isEditing])

  const handleResetForm = () => {
    if (tieneHorarioAprobado) {
      setDiasForm(mapHorarioToDiasForm(horarioVigente))
    } else {
      setDiasForm(
        DIAS_SEMANA.map((d) => ({
          dia: d.key,
          modalidad: 'libre',
          horaInicio: '',
          horaFin: '',
          horas: 0,
          horasCalculadas: 0,
        }))
      )
    }
    setIsEditing(false)
  }

  // Acordeón Inteligente (Single-Open)
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Requerimiento 3: Aplicación estricta de la fórmula de tipado requerida
  const totalHoras = diasForm.reduce((s, d) => s + (d.horas || d.horasCalculadas || 0), 0)

  // Validación estricta del convenio (exactamente 30h)
  const esValido = totalHoras === 30

  const toggleDia = (dia: string) => {
    setDiaAbierto((prev) => (prev === dia ? null : dia))
  }

  const updateDia = (
    dia: DiaHorario['dia'],
    campo: Partial<DiaForm>,
  ) => {
    if (!isEditing) return
    setDiasForm((prev) =>
      prev.map((d) => {
        if (d.dia !== dia) return d
        const updated = { ...d, ...campo }
        const h = updated.modalidad === 'libre' ? 0 : calcHoras(updated.horaInicio, updated.horaFin)
        return {
          ...updated,
          horas: h,
          horasCalculadas: h,
        }
      }),
    )
  }

  const procesarEnvio = async () => {
    if (!esValido) return
    if (!usuarioActual) {
      toast.error('Sesión no encontrada')
      return
    }

    setEnviando(true)
    await new Promise((r) => setTimeout(r, 600))
    const diasFinales: DiaHorario[] = diasForm.map((d) => {
      const h = d.modalidad === 'libre' ? 0 : calcHoras(d.horaInicio, d.horaFin)
      return {
        dia: d.dia,
        modalidadDiaria: d.modalidad === 'presencial' ? 'Presencial' : d.modalidad === 'virtual' ? 'Virtual' : 'Libre',
        horas: h,
        modalidad: d.modalidad,
        horaInicio: d.horaInicio,
        horaFin: d.horaFin,
        horasCalculadas: h,
      }
    })

    enviarHorario(usuarioActual.id, diasFinales)

    setEnviando(false)
    setIsEditing(false)
    toast.success('✅ Horario enviado — PENDIENTE DE APROBACIÓN POR SUPERVISOR')
  }

  const handleCancelarEnvio = () => {
    cancelarHorario(usuarioActual?.id || p.id)
    handleResetForm()
    toast.info('Envío cancelado, puedes editar tu horario nuevamente.')
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Banner estado horario */}
      {pendienteActual && (
        <div className={`rounded-[14px] px-4 py-3 flex items-center gap-2.5 ${pendienteActual.estado === 'Rechazado' ? 'bg-red-50 border border-red-200' : 'bg-gradient-to-br from-blue-900 to-blue-600'}`}>
          <Clock size={18} className={`shrink-0 ${pendienteActual.estado === 'Rechazado' ? 'text-red-600' : 'text-white'}`} />
          <div className="flex-1">
            <div className={`text-[12px] font-bold ${pendienteActual.estado === 'Rechazado' ? 'text-red-700' : 'text-white'}`}>
              {pendienteActual.estado === 'Rechazado' ? 'Solicitud denegada' : 'Horario enviado — En revisión'}
            </div>
            {pendienteActual.estado !== 'Rechazado' && (
              <div className="text-[11px] text-white/70">
                Semana {pendienteActual.semana} · {pendienteActual.totalHoras}h declaradas
              </div>
            )}
            {pendienteActual.estado === 'Rechazado' && (
              <div className="text-[11px] text-red-600 font-medium mt-0.5">
                {pendienteActual.motivoRechazo}. Por favor, enviar nueva solicitud
              </div>
            )}
          </div>
          <button
            onClick={handleCancelarEnvio}
            className={`border-none rounded-lg p-1.5 flex items-center justify-center cursor-pointer ${pendienteActual.estado === 'Rechazado' ? 'bg-red-100 text-red-700' : 'bg-white/20 text-white'}`}
            aria-label="Eliminar envío"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Formulario declaración */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-1">
          <div className="font-bold text-[14px] text-slate-900 flex items-center gap-2">
            📋 {isEditing ? 'Declaración de Horario Semanal' : 'Horario Semanal Vigente'}
            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{p.modalidadBase}</span>
            {tieneHorarioAprobado && !isEditing && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Aprobado</span>
            )}
          </div>
          {(!pendienteActual || pendienteActual.estado === 'Rechazado') && (
            <button
              id="btn-habilitar-edicion"
              type="button"
              onClick={() => {
                if (isEditing) {
                  handleResetForm()
                } else {
                  setIsEditing(true)
                }
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer border-none ${isEditing
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
            >
              {isEditing ? 'Cancelar Edición' : 'Habilitar'}
            </button>
          )}
        </div>
        <div className="text-[11px] text-slate-400 mb-3">
          {isEditing
            ? 'Modifica tu horario y envíalo a revisión (convenio: 30h semanales exactas)'
            : tieneHorarioAprobado
              ? 'Horario oficial vigente de 30 horas semanales'
              : 'Declara tu horario para la próxima semana'}
        </div>

        <div className="transition-all duration-300">
          {DIAS_SEMANA.map((d) => {
            const form = diasForm.find((f) => f.dia === d.key)!
            const horas = form.horas || form.horasCalculadas || 0
            const isOpen = diaAbierto === d.key

            return (
              <div
                key={d.key}
                className="border-t border-slate-100 mt-1 bg-transparent border-none p-0"
              >
                <div className="flex items-center py-2.5 gap-2">
                  <button
                    id={`dia-toggle-${d.key}`}
                    type="button"
                    onClick={() => toggleDia(d.key)}
                    className="flex-1 bg-transparent border-none flex items-center gap-2 p-0 cursor-pointer"
                  >
                    <span className="font-semibold text-[13px] w-[65px] text-left text-slate-800">
                      {d.label}
                    </span>

                    {/* Badge de Modalidad */}
                    <span
                      className={`text-[11px] rounded-lg px-2 py-0.5 font-semibold ${form.modalidad === 'presencial' ? 'bg-blue-50 text-blue-800'
                        : form.modalidad === 'virtual' ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-50 text-slate-400'
                        }`}
                    >
                      {MODALIDAD_LABELS[form.modalidad]}
                    </span>

                    <span className="text-[11px] font-semibold flex-1 text-right text-slate-500">
                      {horas > 0 ? `${horas}h` : '—'}
                    </span>

                    {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </button>
                </div>

                {/* Contenido Acordeón */}
                {isOpen && (
                  <div className="pb-3 flex flex-col gap-2.5">
                    {/* Selector modalidad */}
                    <div className="flex gap-1.5">
                      {(
                        (p.modalidadBase?.toLowerCase() === 'semipresencial' || !p.modalidadBase)
                          ? (['presencial', 'virtual', 'libre'] as Modalidad[])
                          : p.modalidadBase?.toLowerCase() === 'presencial'
                            ? (['presencial', 'libre'] as Modalidad[])
                            : (['virtual', 'libre'] as Modalidad[])
                      ).map((m) => (
                        <button
                          key={m}
                          id={`modal-${d.key}-${m}`}
                          type="button"
                          disabled={!isEditing}
                          onClick={() => updateDia(d.key, { modalidad: m })}
                          className={`flex-1 rounded-lg py-1.5 px-1 text-[11px] font-semibold transition-all ${form.modalidad === m
                            ? 'border-2 border-blue-600 bg-blue-50 text-blue-800 font-bold'
                            : 'border-[1.5px] border-slate-200 bg-white text-slate-500'
                            } ${!isEditing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {MODALIDAD_LABELS[m]}
                        </button>
                      ))}
                    </div>

                    {/* Horario */}
                    {form.modalidad !== 'libre' && (
                      <div className="flex gap-2.5 items-center">
                        <div className="flex-1">
                          <label
                            htmlFor={`hora-inicio-${d.key}`}
                            className="text-[10px] text-slate-400 font-semibold block mb-1"
                          >
                            ENTRADA
                          </label>
                          <input
                            id={`hora-inicio-${d.key}`}
                            type="time"
                            disabled={!isEditing}
                            readOnly={!isEditing}
                            value={form.horaInicio}
                            onChange={(e) =>
                              updateDia(d.key, {
                                horaInicio: e.target.value,
                              })
                            }
                            className={`w-full px-2.5 py-2 rounded-lg border-[1.5px] text-[13px] outline-none box-border ${!isEditing
                              ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed'
                              : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500'
                              }`}
                          />
                        </div>
                        <div className="text-slate-400 text-[16px] mt-4">
                          →
                        </div>
                        <div className="flex-1">
                          <label
                            htmlFor={`hora-fin-${d.key}`}
                            className="text-[10px] text-slate-400 font-semibold block mb-1"
                          >
                            SALIDA
                          </label>
                          <input
                            id={`hora-fin-${d.key}`}
                            type="time"
                            disabled={!isEditing}
                            readOnly={!isEditing}
                            value={form.horaFin}
                            onChange={(e) =>
                              updateDia(d.key, { horaFin: e.target.value })
                            }
                            className={`w-full px-2.5 py-2 rounded-lg border-[1.5px] text-[13px] outline-none box-border ${!isEditing
                              ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed'
                              : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500'
                              }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Total validador */}
          <div
            className={`mt-3 rounded-[10px] px-3.5 py-2.5 flex justify-between items-center ${esValido ? 'bg-emerald-100' : 'bg-red-50 border border-red-200'
              }`}
          >
            <span
              className={`text-[13px] font-semibold ${esValido ? 'text-emerald-800' : 'text-red-800'
                }`}
            >
              {isEditing ? 'Total recalculado' : 'Total de horas'}
            </span>
            <span
              className={`text-[16px] font-extrabold flex items-center gap-1.5 ${esValido ? 'text-emerald-600' : 'text-red-600'
                }`}
            >
              {totalHoras.toFixed(1)}h / 30h
            </span>
          </div>
          {isEditing && !esValido && (
            <div className="text-red-600 text-[12px] font-bold mt-2 text-center">
              ⚠️ Error: El horario debe sumar exactamente 30 horas semanales. Actual: {totalHoras.toFixed(1)}h
            </div>
          )}

          <button
            id="btn-enviar-horario"
            type="button"
            onClick={procesarEnvio}
            disabled={!isEditing || enviando || !!pendienteActual || !esValido}
            className={`w-full mt-3 py-3.5 border-none rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all duration-200 ${(!isEditing || enviando || !!pendienteActual || !esValido) ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-gradient-to-br from-blue-900 to-blue-600 text-white cursor-pointer active:opacity-90'}`}
          >
            <Send size={16} />
            {enviando ? 'Enviando…' : 'Guardar y Enviar Horario'}
          </button>
        </div>
      </div>

      {/* ── SECCIÓN: Mis Informes Quincenales (RF-57) ── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[16px] font-bold text-slate-800 m-0">Mis Informes Quincenales</h3>
          <button
            type="button"
            onClick={() => setShowArchivadosModal(true)}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Archive size={14} className="text-slate-500" />
            <span>Archivados ({misInformesArchivados.length})</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {misInformesActivos.length === 0 ? (
            <div className="text-center text-[13px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl py-6 italic">
              No tienes informes quincenales activos.
            </div>
          ) : (
            misInformesActivos.map((informe) => {
              const [yI, mI, dI] = informe.fechaInicio.split('-').map(Number);
              const [yF, mF, dF] = informe.fechaFin.split('-').map(Number);
              const dateI = new Date(yI, mI - 1, dI);
              const dateF = new Date(yF, mF - 1, dF);

              const formateador = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
              const iniStr = formateador.format(dateI);
              const finStr = formateador.format(dateF);

              const isEnRevision = informe.estado === 'en_revision';
              const isObservado = informe.estado === 'observado';
              const isAprobado = informe.estado === 'aprobado_y_firmado';

              return (
                <div key={informe.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[14px] text-slate-800 capitalize">
                      {iniStr} - {finStr}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${isEnRevision ? 'bg-amber-100 text-amber-700' : isObservado ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {isEnRevision ? 'En Revisión' : isObservado ? 'Observado' : 'Aprobado'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          archivarInformeQuincenal(informe.id, true);
                          toast.success('Informe archivado correctamente');
                        }}
                        title="Archivar informe"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Archive size={14} />
                      </button>
                    </div>
                  </div>

                  <div
                    onClick={() => descargarArchivoBase64(informe.archivoPracticanteBase64, informe.nombreArchivo || 'documento_senati.pdf', informe.tipoMime)}
                    className="flex items-center justify-between text-[12px] text-slate-600 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-100 cursor-pointer transition-colors"
                    title="Clic para descargar tu documento adjunto"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="text-blue-500 shrink-0" />
                      <span className="truncate font-medium">{informe.nombreArchivo || informe.archivoPracticanteBase64}</span>
                    </div>
                    <Download size={14} className="text-slate-400 shrink-0 ml-2" />
                  </div>

                  {informe.mensajePracticante && (
                    <div className="text-[12px] text-slate-500 italic line-clamp-2 mt-0.5">
                      "{informe.mensajePracticante}"
                    </div>
                  )}

                  {isAprobado && (
                    informe.archivoFirmadoBase64 ? (
                      <button
                        type="button"
                        onClick={() => descargarArchivoBase64(
                          informe.archivoFirmadoBase64!,
                          informe.nombreArchivoFirmado || `informe_firmado_${informe.id}.pdf`,
                          informe.tipoMimeFirmado || 'application/pdf'
                        )}
                        className="mt-1 w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl py-2.5 flex items-center justify-center gap-2 text-[13px] font-bold transition-colors border border-emerald-200 cursor-pointer shadow-xs"
                      >
                        <Download size={16} /> Descargar Informe Final Firmado
                      </button>
                    ) : (
                      <div className="mt-1 py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-[11px] font-semibold flex items-center justify-center text-center">
                        No se adjuntó documento
                      </div>
                    )
                  )}
                  {isObservado && (
                    <div className="mt-1 flex flex-col gap-2">
                      {informe.feedbackMonitor && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-xl text-[12px] border border-red-100">
                          <span className="font-bold block mb-1">Feedback del Monitor:</span>
                          {informe.feedbackMonitor}
                        </div>
                      )}
                      {informe.archivoFirmadoBase64 ? (
                        <button
                          type="button"
                          onClick={() => descargarArchivoBase64(
                            informe.archivoFirmadoBase64!,
                            informe.nombreArchivoFirmado || `documento_observacion_${informe.id}.pdf`,
                            informe.tipoMimeFirmado || 'application/pdf'
                          )}
                          className="w-full bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl py-2.5 flex items-center justify-center gap-2 text-[13px] font-bold transition-colors border border-amber-200 cursor-pointer shadow-xs"
                        >
                          <Download size={16} /> Descargar documento de observación
                        </button>
                      ) : (
                        <div className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-[11px] font-semibold flex items-center justify-center text-center">
                          No se adjuntó documento
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Botón de envío de informe quincenal */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-slate-900 text-white rounded-2xl py-3.5 text-[14px] font-bold border-none cursor-pointer active:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <FileText size={18} /> Mandar informe nuevo
        </button>
      </div>

      {/* Modal Informe Quincenal BottomSheet */}
      <ModalNuevoInforme
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        practicanteId={usuarioActual?.id || p.id}
        onEnviar={enviarInformeQuincenal}
      />

      {/* Modal Bóveda de Documentos Archivados (Practicante) */}
      {showArchivadosModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowArchivadosModal(false)} />
          <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[24px] overflow-hidden relative flex flex-col animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] h-[85vh] shadow-2xl z-10">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Archive size={16} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-800 m-0 leading-tight">Documentos Archivados</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Bóveda personal de informes</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchivadosModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border-none cursor-pointer active:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pb-12">
              {misInformesArchivados.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[13px] italic">
                  No tienes informes archivados.
                </div>
              ) : (
                misInformesArchivados.map((inf) => (
                  <div key={inf.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-slate-700">
                        {inf.fechaInicio} — {inf.fechaFin}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        Archivado
                      </span>
                    </div>
                    <div className="text-[12px] text-slate-600 truncate flex items-center gap-1.5 font-medium">
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="truncate">{inf.nombreArchivo || inf.archivoPracticanteBase64}</span>
                    </div>

                    {inf.feedbackMonitor && (
                      <div className="text-[11px] bg-slate-100 text-slate-600 p-2 rounded-lg italic">
                        <span className="font-semibold not-italic">Feedback:</span> {inf.feedbackMonitor}
                      </div>
                    )}

                    <div className="pt-0.5">
                      {inf.archivoFirmadoBase64 ? (
                        <button
                          type="button"
                          onClick={() => descargarArchivoBase64(
                            inf.archivoFirmadoBase64!,
                            inf.nombreArchivoFirmado || (inf.estado === 'aprobado_y_firmado' ? `Firmado_${inf.id}.pdf` : `Observacion_${inf.id}.pdf`),
                            inf.tipoMimeFirmado
                          )}
                          className="w-full py-1.5 px-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <Download size={13} /> {inf.estado === 'aprobado_y_firmado' ? 'Descargar Doc Firmado' : 'Descargar Doc Observación'}
                        </button>
                      ) : (
                        <div className="w-full py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-[10px] font-semibold flex items-center justify-center text-center">
                          No se adjuntó documento
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => descargarArchivoBase64(inf.archivoPracticanteBase64, inf.nombreArchivo || 'informe_senati.pdf', inf.tipoMime)}
                        className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Download size={13} /> Descargar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          archivarInformeQuincenal(inf.id, false);
                          toast.success('Informe restaurado a la lista activa');
                        }}
                        className="py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors border border-blue-200"
                        title="Restaurar informe a la lista activa"
                      >
                        Restaurar
                      </button>
                      <button
                        type="button"
                        onClick={() => setInformeAEliminar(inf.id)}
                        className="py-2 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors border border-red-200"
                        title="Eliminar definitivamente"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación (Practicante) */}
      <ModalConfirmacion
        isOpen={!!informeAEliminar}
        onClose={() => setInformeAEliminar(null)}
        onConfirm={() => {
          if (informeAEliminar) {
            eliminarInformeQuincenal(informeAEliminar)
            toast.success('Informe eliminado definitivamente')
            setInformeAEliminar(null)
          }
        }}
        titulo="¿Eliminar definitivamente?"
        mensaje="Esta acción eliminará el informe archivado de forma permanente."
        textoConfirmar="Eliminar definitivamente"
        tipo="peligro"
      />
    </div>
  )
}


// ============================================================
// VISTA SUPERVISOR — Aprobación de Horarios
// ============================================================

function SupervisorHorarios() {
  const practicantes = useAppStore((s) => s.practicantes)
  const aprobarHorario = useAppStore((s) => s.aprobarHorario)
  const rechazarHorario = useAppStore((s) => s.rechazarHorario)

  const [rechazandoId, setRechazandoId] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  const pendientes = practicantes.filter(
    (p) =>
      p.horarioPendiente &&
      (p.horarioPendiente.estado === 'Pendiente' || p.horarioPendiente.estado === 'pendiente_aprobacion'),
  )

  const handleAprobar = (id: string, nombre: string) => {
    aprobarHorario(id)
    toast.success(`✅ Horario de ${nombre} aprobado`)
  }

  const handleRechazarConfirmar = (id: string, nombre: string, tel?: string) => {
    if (!motivoRechazo.trim()) {
      toast.error('Debe ingresar un motivo')
      return
    }
    rechazarHorario(id, motivoRechazo)
    console.log(`[API WhatsApp Mock] Enviando a ${tel || 'Sin número'}: Hola ${nombre}, tu horario ha sido rechazado. Motivo: ${motivoRechazo}`)
    toast.warning(`❌ Horario de ${nombre} rechazado`)
    setRechazandoId(null)
    setMotivoRechazo('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Solicitudes de horario */}
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: 16,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: '#0f172a',
            marginBottom: 12,
          }}
        >
          📥 Solicitudes de Horario ({pendientes.length})
        </div>

        {pendientes.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '20px 0',
              color: '#94a3b8',
              fontSize: 13,
            }}
          >
            <CheckCircle2
              size={32}
              style={{
                margin: '0 auto 8px',
                display: 'block',
                color: '#cbd5e1',
              }}
            />
            Sin solicitudes pendientes
          </div>
        ) : (
          pendientes.map((p) => {
            const horasSemanales = p.horarioPendiente?.totalHoras || 0;
            const extra = Math.max(0, horasSemanales - 30);
            const isRechazando = rechazandoId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: 12,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 9999,
                      flexShrink: 0,
                      background:
                        'linear-gradient(135deg,#1E3A8A,#2563EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {p.nombre[0]}
                    {p.apellido?.[0] || ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: '#1e293b',
                      }}
                    >
                      {p.nombre} {p.apellido}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Semana {p.horarioPendiente?.semana} ·{' '}
                      {horasSemanales}h declaradas
                      {extra > 0 && <span style={{ color: '#059669', fontWeight: 600 }}> (+{extra}h extra)</span>}
                    </div>
                  </div>
                </div>

                {/* Resumen días */}
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  {p.horarioPendiente?.dias.map((d) => (
                    <div
                      key={d.dia}
                      style={{
                        flex: 1,
                        minWidth: 50,
                        borderRadius: 8,
                        padding: '6px 4px',
                        textAlign: 'center',
                        background:
                          d.modalidad === 'presencial'
                            ? '#eff6ff'
                            : d.modalidad === 'virtual'
                              ? '#f0fdf4'
                              : '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#94a3b8',
                        }}
                      >
                        {DIAS_LABEL[d.dia]}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color:
                            d.modalidad === 'presencial'
                              ? '#1e40af'
                              : d.modalidad === 'virtual'
                                ? '#059669'
                                : '#94a3b8',
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {d.modalidad === 'libre'
                          ? 'Libre'
                          : `${d.horaInicio}–${d.horaFin}`}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#1e293b',
                          marginTop: 1,
                        }}
                      >
                        {(d.horasCalculadas ?? 0) > 0
                          ? `${d.horasCalculadas}h`
                          : '—'}
                      </div>
                    </div>
                  ))}
                </div>

                {isRechazando ? (
                  <div className="flex flex-col gap-2 mt-3">
                    <input
                      type="text"
                      placeholder="Motivo del rechazo..."
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      className="border border-red-200 rounded-lg p-2 text-[13px] outline-none focus:border-red-400"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRechazandoId(null)}
                        className="flex-1 bg-slate-100 text-slate-600 rounded-lg py-2 text-[12px] font-bold border-none"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleRechazarConfirmar(p.id, p.nombre, p.tel)}
                        className="flex-1 bg-red-600 text-white rounded-lg py-2 text-[12px] font-bold border-none"
                      >
                        Confirmar Rechazo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      id={`btn-aprobar-${p.id}`}
                      onClick={() =>
                        handleAprobar(
                          p.id,
                          `${p.nombre} ${p.apellido}`,
                        )
                      }
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        border: 'none',
                        background:
                          'linear-gradient(135deg,#065f46,#059669)',
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={15} /> Aprobar
                    </button>
                    <button
                      id={`btn-rechazar-${p.id}`}
                      onClick={() => setRechazandoId(p.id)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        border: 'none',
                        background: '#fee2e2',
                        color: '#dc2626',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <X size={15} /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================================
// MAIN EXPORT — Routing por rol
// ============================================================

export default function HorariosScreen() {
  return <PracticanteHorarios />
}
