import { useState, useRef } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Send, Trash2, X, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
import type { DiaHorario, Modalidad, RegistroDia } from '../types'

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
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const MODALIDAD_LABELS: Record<Modalidad, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
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
}

// ============================================================
// VISTA PRACTICANTE — Declaración de Horario Semanal
// ============================================================

const FECHA_HOY = '2026-09-18' // Mock

function PracticanteHorarios() {
  const practicantes = useAppStore((s) => s.practicantes)
  const enviarHorario = useAppStore((s) => s.enviarHorario)
  const cancelarHorario = useAppStore((s) => s.cancelarHorario)
  const acumularHorasExtras = useAppStore((s) => s.acumularHorasExtras)
  const enviarInformeQuincenal = useAppStore((s) => s.enviarInformeQuincenal)
  const p = practicantes[0]

  // File upload states
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [mensaje, setMensaje] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      if (files.length > 3) {
        toast.error('Puedes subir un máximo de 3 archivos.')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      if (files.length > 0) {
        setSelectedFiles(files)
        setShowModal(true)
      }
    }
  }

  const handleCerrarModal = () => {
    setShowModal(false)
    setSelectedFiles([])
    setMensaje('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEnviarInforme = () => {
    enviarInformeQuincenal({
      practicanteId: p.id,
      documentos: selectedFiles.map((f) => f.name),
      mensajePracticante: mensaje,
    })
    handleCerrarModal()
    toast.success('Informe quincenal enviado correctamente.')
  }

  const [diasForm, setDiasForm] = useState<DiaForm[]>(
    DIAS_SEMANA.map((d, i) => ({
      dia: d.key,
      modalidad: p.horarioActual?.dias[i]?.modalidad ?? 'presencial',
      horaInicio: p.horarioActual?.dias[i]?.horaInicio ?? '08:00',
      horaFin: p.horarioActual?.dias[i]?.horaFin ?? '14:00',
    })),
  )

  // Acordeón Inteligente (Single-Open)
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const totalHoras = diasForm.reduce((s, d) => {
    if (d.modalidad === 'libre') return s
    return s + calcHoras(d.horaInicio, d.horaFin)
  }, 0)

  // Validación estricta
  const esValido = totalHoras >= 30
  const excedente = Math.max(0, totalHoras - 30)

  const toggleDia = (dia: string) => {
    if (!isEditing) return
    setDiaAbierto((prev) => (prev === dia ? null : dia))
  }

  const updateDia = (
    dia: DiaHorario['dia'],
    campo: Partial<DiaForm>,
  ) => {
    if (!isEditing) return
    setDiasForm((prev) =>
      prev.map((d) => (d.dia === dia ? { ...d, ...campo } : d)),
    )
  }

  const procesarEnvio = async () => {
    if (!esValido) return
    setEnviando(true)
    await new Promise((r) => setTimeout(r, 800))
    const diasFinales: DiaHorario[] = diasForm.map((d) => ({
      dia: d.dia,
      modalidad: d.modalidad,
      horaInicio: d.horaInicio,
      horaFin: d.horaFin,
      horasCalculadas: d.modalidad === 'libre' ? 0 : calcHoras(d.horaInicio, d.horaFin),
    }))

    // Si hay excedente, acumular HE
    if (excedente > 0) {
      acumularHorasExtras(p.id, excedente, `Excedente declarado Sem. 38`)
    }

    enviarHorario(p.id, diasFinales)
    setEnviando(false)
    setIsEditing(false)
    toast.success('✅ Horario enviado — PENDIENTE DE APROBACIÓN POR SUPERVISOR')
  }

  const handleCancelarEnvio = () => {
    cancelarHorario(p.id)
    toast.info('Envío cancelado, puedes editar tu horario nuevamente.')
  }

  const pendienteActual = p.horarioPendiente

  return (
    <div className="flex flex-col gap-3">
      {/* Banner estado horario */}
      {pendienteActual && (
        <div className="bg-gradient-to-br from-blue-900 to-blue-600 rounded-[14px] px-4 py-3 flex items-center gap-2.5">
          <Clock size={18} className="text-white shrink-0" />
          <div className="flex-1">
            <div className="text-[12px] font-bold text-white">
              Horario enviado — En revisión
            </div>
            <div className="text-[11px] text-white/70">
              Semana {pendienteActual.semana} ·{' '}
              {pendienteActual.totalHoras}h declaradas
            </div>
          </div>
          <button
            onClick={handleCancelarEnvio}
            className="bg-white/20 text-white border-none rounded-lg p-1.5 flex items-center justify-center cursor-pointer"
            aria-label="Eliminar envío"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Formulario declaración */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-1">
          <div className="font-bold text-[14px] text-slate-900">
            📋 Solicitud de cambio de horario
          </div>
          {!pendienteActual && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer border-none ${isEditing
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {isEditing ? 'Cancel Edición' : 'Habilitar'}
            </button>
          )}
        </div>
        <div className="text-[11px] text-slate-400 mb-3">
          Declara tu horario para la próxima semana
        </div>

        <div className={`transition-all duration-300 ${isEditing ? '' : 'opacity-60 pointer-events-none grayscale-[30%]'}`}>
          {DIAS_SEMANA.map((d) => {
            const form = diasForm.find((f) => f.dia === d.key)!

            let horas = 0
            if (form.modalidad !== 'libre') {
              horas = calcHoras(form.horaInicio, form.horaFin)
            }

            const isOpen = diaAbierto === d.key

            return (
              <div
                key={d.key}
                className="border-t border-slate-100 mt-1 bg-transparent border-none p-0"
              >
                <div className="flex items-center py-2.5 gap-2">
                  <button
                    id={`dia-toggle-${d.key}`}
                    onClick={() => toggleDia(d.key)}
                    disabled={!isEditing}
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
                        ['presencial', 'virtual', 'libre'] as Modalidad[]
                      ).map((m) => (
                        <button
                          key={m}
                          id={`modal-${d.key}-${m}`}
                          onClick={() => updateDia(d.key, { modalidad: m })}
                          className={`flex-1 rounded-lg py-1.5 px-1 text-[11px] font-semibold cursor-pointer ${form.modalidad === m
                            ? 'border-2 border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-[1.5px] border-slate-200 bg-white text-slate-500'
                            }`}
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
                            value={form.horaInicio}
                            onChange={(e) =>
                              updateDia(d.key, {
                                horaInicio: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-2 rounded-lg border-[1.5px] border-slate-200 text-[13px] text-slate-800 outline-none bg-white box-border"
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
                            value={form.horaFin}
                            onChange={(e) =>
                              updateDia(d.key, { horaFin: e.target.value })
                            }
                            className="w-full px-2.5 py-2 rounded-lg border-[1.5px] border-slate-200 text-[13px] text-slate-800 outline-none bg-white box-border"
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
              Total declarado
            </span>
            <span
              className={`text-[16px] font-extrabold flex items-center gap-1.5 ${esValido ? 'text-emerald-600' : 'text-red-600'
                }`}
            >
              {totalHoras.toFixed(1)}h / 30h{' '}
              {excedente > 0 && (
                <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded-md">
                  +{excedente}h extras
                </span>
              )}
            </span>
          </div>

          <button
            id="btn-enviar-horario"
            onClick={procesarEnvio}
            disabled={enviando || !!pendienteActual || !esValido}
            className={`w-full mt-3 py-3.5 border-none rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all duration-200 ${(enviando || !!pendienteActual || !esValido) ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-gradient-to-br from-blue-900 to-blue-600 text-white cursor-pointer'}`}
          >
            <Send size={16} />
            {enviando ? 'Enviando…' : 'Guardar y Enviar Horario'}
          </button>
        </div>
      </div>

      {/* Botón de envío de informe quincenal */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-slate-900 text-white rounded-xl py-3.5 text-[14px] font-bold mt-1 border-none cursor-pointer hover:bg-slate-800 transition-colors"
      >
        Mandar informe quincenal
      </button>

      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Modal Informe Quincenal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-slate-800 m-0">Informe quincenal</h3>
              <button
                onClick={handleCerrarModal}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border-none cursor-pointer hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <div className="text-[13px] font-semibold text-slate-700 mb-2">Archivos adjuntos:</div>
                <div className="flex flex-col gap-2">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="text-[13px] font-medium text-slate-700 truncate">{f.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-slate-700 mb-2 block">Mensaje (opcional):</label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe un mensaje para tu supervisor..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] text-slate-700 outline-none resize-none h-24 box-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={handleEnviarInforme}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-[14px] font-bold border-none cursor-pointer hover:bg-blue-700 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
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

  const pendientes = practicantes.filter(
    (p) =>
      p.horarioPendiente &&
      p.horarioPendiente.estado === 'pendiente_aprobacion',
  )

  const handleAprobar = (id: string, nombre: string) => {
    aprobarHorario(id)
    toast.success(`✅ Horario de ${nombre} aprobado`)
  }

  const handleRechazar = (id: string, nombre: string) => {
    rechazarHorario(id)
    toast.warning(`❌ Horario de ${nombre} devuelto a estado editable (restando horas extras)`)
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
                    {p.apellido[0]}
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
                        {d.horasCalculadas > 0
                          ? `${d.horasCalculadas}h`
                          : '—'}
                      </div>
                    </div>
                  ))}
                </div>

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
                    onClick={() => handleRechazar(p.id, `${p.nombre} ${p.apellido}`)}
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
