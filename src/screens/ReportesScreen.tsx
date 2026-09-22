import { useState } from 'react'
import { FileText, CheckCircle2, X, Clock, Check, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'

export default function ReportesScreen() {
  const rolActivo = useAppStore((s) => s.rolActivo)
  const practicantes = useAppStore((s) => s.practicantes)

  // SUPERVISOR
  const informes = useAppStore((s) => s.informesQuincenales)
  const aceptarInforme = useAppStore((s) => s.aceptarInformeQuincenal)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInforme, setSelectedInforme] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  // GERENCIA
  const aprobarHorario = useAppStore((s) => s.aprobarHorario)
  const rechazarHorario = useAppStore((s) => s.rechazarHorario)

  // ── Lógica Supervisor ──
  const pendientesSupervisor = informes.filter((i) => i.estado === 'pendiente')
  const revisadosSupervisor = informes.filter((i) => i.estado === 'revisado')

  const handleOpenModal = (id: string) => {
    setSelectedInforme(id)
    setFeedback('')
    setModalOpen(true)
  }

  const handleConfirmar = () => {
    if (!selectedInforme) return
    aceptarInforme(selectedInforme, feedback)
    toast.success('Informe revisado exitosamente')

    setModalOpen(false)
    setSelectedInforme(null)
  }

  const renderTarjetaSupervisor = (informe: typeof informes[0]) => {
    const practicante = practicantes.find((p) => p.id === informe.practicanteId)
    if (!practicante) return null
    const isRevisado = informe.estado === 'revisado'

    return (
      <div
        key={informe.id}
        className={`border-t border-slate-100 pt-3 mt-2 ${isRevisado ? 'opacity-60 grayscale' : ''}`}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center text-[14px] font-bold text-white">
            {practicante.nombre[0]}
            {practicante.apellido[0]}
          </div>
          <div className="flex-1">
            <div className="font-bold text-[14px] text-slate-800">
              {practicante.nombre} {practicante.apellido}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg mb-2.5 flex flex-col gap-1.5 border border-slate-100">
          {informe.documentos?.map((doc, idx) => (
             <div key={idx} className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-1.5 truncate">
                  <FileText size={12} className="text-blue-500 shrink-0" />
                  <span className="truncate">{doc}</span>
                </div>
                <button onClick={() => console.log('Abriendo documento...')} className="bg-transparent border-none text-blue-600 underline cursor-pointer font-bold hover:text-blue-700 shrink-0">
                  Abrir
                </button>
             </div>
          ))}
        </div>

        <p className="text-[13px] text-slate-600 italic m-0 mb-3 px-1">
          "{informe.mensajePracticante}"
        </p>

        {!isRevisado && (
          <button
            onClick={() => handleOpenModal(informe.id)}
            className="w-full py-2.5 rounded-[10px] border-none bg-gradient-to-br from-emerald-700 to-emerald-500 text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90"
          >
            <CheckCircle2 size={16} /> Aceptar y enviar feedback
          </button>
        )}
        {isRevisado && informe.feedbackSupervisor && (
          <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2 rounded-lg font-medium border border-emerald-100">
            <span className="font-bold">Tu feedback:</span> {informe.feedbackSupervisor}
          </div>
        )}
      </div>
    )
  }

  // ── Lógica Gerencia ──
  const pendientesGerencia = practicantes.filter(
    (p) => p.horarioPendiente?.estado === 'pendiente_aprobacion',
  )

  const handleAprobarHorario = (id: string) => {
    aprobarHorario(id)
    toast.success('Horario aprobado exitosamente')
  }

  const handleRechazarHorario = (id: string) => {
    rechazarHorario(id)
    toast.error('Horario rechazado')
  }

  const renderTarjetaGerencia = (p: typeof practicantes[0]) => {
    const horario = p.horarioPendiente
    if (!horario) return null

    return (
      <div key={p.id} className="border-t border-slate-100 pt-3 mt-2">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-br from-indigo-900 to-indigo-600 flex items-center justify-center text-[14px] font-bold text-white">
            {p.nombre[0]}
            {p.apellido[0]}
          </div>
          <div className="flex-1">
            <div className="font-bold text-[14px] text-slate-800">
              {p.nombre} {p.apellido}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Horas propuestas: {horario.totalHoras}h
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 flex flex-col gap-1">
          {horario.dias.map((d, i) => (
            <div key={i} className="flex justify-between text-[11px] font-medium">
              <span className="text-slate-600 capitalize">{d.dia}</span>
              <span className="text-slate-800">{d.horaInicio} - {d.horaFin}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => handleRechazarHorario(p.id)}
            className="flex-1 py-2.5 rounded-[10px] border-none bg-rose-100 text-rose-700 text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90"
          >
            <XCircle size={16} /> Rechazar
          </button>
          <button
            onClick={() => handleAprobarHorario(p.id)}
            className="flex-1 py-2.5 rounded-[10px] border-none bg-gradient-to-br from-emerald-600 to-emerald-500 text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90"
          >
            <Check size={16} /> Aprobar
          </button>
        </div>
      </div>
    )
  }

  // ── Renderizado Principal ──
  if (rolActivo === 'SUPERVISOR') {
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="font-bold text-[14px] text-slate-900 mb-3 flex items-center gap-2">
            📑 Informes pendientes de revisión ({pendientesSupervisor.length})
          </div>
          {pendientesSupervisor.length === 0 ? (
            <div className="text-center py-5 text-slate-400 text-[13px]">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-300" />
              Sin informes pendientes
            </div>
          ) : (
            pendientesSupervisor.map(renderTarjetaSupervisor)
          )}
        </div>

        {revisadosSupervisor.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mt-2">
            <div className="font-bold text-[14px] text-slate-500 mb-3 flex items-center gap-2">
              ✅ Informes revisados ({revisadosSupervisor.length})
            </div>
            {revisadosSupervisor.map(renderTarjetaSupervisor)}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
            <div className="bg-white rounded-[20px] p-5 w-full max-w-[350px] shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="m-0 text-[16px] font-bold text-slate-900">Dar Feedback</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="bg-transparent border-none text-slate-400 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-[13px] text-slate-600 mb-3">
                Escribe un mensaje de retroalimentación para el alumno:
              </p>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Opcional: 'Buen trabajo en esta quincena...'"
                className="w-full h-24 p-3 border border-slate-200 rounded-xl resize-none text-[13px] focus:outline-none focus:border-blue-500 bg-slate-50 mb-4 font-sans"
              />

              <button
                onClick={handleConfirmar}
                className="w-full py-3 rounded-xl border-none bg-blue-600 text-white font-bold text-[14px] cursor-pointer"
              >
                Confirmar revisión
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (rolActivo === 'GERENCIA') {
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="font-bold text-[14px] text-slate-900 mb-3 flex items-center gap-2">
            <Clock size={16} className="text-indigo-600" />
            Solicitudes de cambio de horario ({pendientesGerencia.length})
          </div>
          {pendientesGerencia.length === 0 ? (
            <div className="text-center py-5 text-slate-400 text-[13px]">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-300" />
              Sin solicitudes pendientes
            </div>
          ) : (
            pendientesGerencia.map(renderTarjetaGerencia)
          )}
        </div>
      </div>
    )
  }

  // Fallback
  return null
}
