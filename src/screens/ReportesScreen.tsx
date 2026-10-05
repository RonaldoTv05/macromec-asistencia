import React, { useState, useMemo } from 'react'
import { FileText, CheckCircle2, X, Clock, Check, XCircle, Download, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'

export default function ReportesScreen() {
  const rolActivo = useAppStore((s) => s.rolActivo)
  const practicantes = useAppStore((s) => s.practicantes)
  const aprobarHorario = useAppStore((state) => state.aprobarHorario);
  const rechazarHorario = useAppStore((state) => state.rechazarHorario);

  // SUPERVISOR
  const informes = useAppStore((s) => s.informesQuincenales)
  const procesarInformeMonitor = useAppStore((s) => s.procesarInformeMonitor)
  const usuarioActual = useAppStore((s) => s.usuarioActual)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInforme, setSelectedInforme] = useState<typeof informes[0] | null>(null)
  const [feedback, setFeedback] = useState('')
  const [archivoFirmado, setArchivoFirmado] = useState<string | undefined>(undefined)

  // ── Lógica Supervisor ──
  const pendientesSupervisor = informes.filter((informe) => {
    if (informe.estado !== 'en_revision') return false;
    const practicante = practicantes.find(p => p.id === informe.practicanteId);
    return practicante?.monitorId === usuarioActual?.id;
  })

  const revisadosSupervisor = informes.filter((informe) => {
    // Solo queremos los que YA pasaron revisión ('observado' o 'aprobado_y_firmado')
    if (informe.estado === 'en_revision') return false;

    // Filtro relacional estricto (solo mis practicantes)
    const practicante = practicantes.find(p => p.id === informe.practicanteId);
    return practicante?.monitorId === usuarioActual?.id;
  });

  const handleOpenModal = (informe: typeof informes[0]) => {
    setSelectedInforme(informe)
    setFeedback('')
    setArchivoFirmado(undefined)
    setModalOpen(true)
  }

  const handleDevolver = () => {
    if (!selectedInforme) return
    if (!feedback.trim()) {
      toast.error('Debes ingresar un feedback para devolver el informe')
      return
    }
    procesarInformeMonitor(selectedInforme.id, 'observado', feedback)
    toast.success('Informe devuelto con observaciones')
    setModalOpen(false)
    setSelectedInforme(null)
  }

  const handleAprobarYSubir = () => {
    if (!selectedInforme) return
    if (!archivoFirmado) {
      toast.error('Debes subir el informe firmado para aprobarlo')
      return
    }
    procesarInformeMonitor(selectedInforme.id, 'aprobado_y_firmado', feedback, archivoFirmado)
    toast.success('Informe aprobado y firmado exitosamente')
    setModalOpen(false)
    setSelectedInforme(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivoFirmado(e.target.files[0].name) // Simulamos base64 guardando el nombre
      toast.success(`Archivo adjuntado: ${e.target.files[0].name}`)
    }
  }

  const renderTarjetaSupervisor = (informe: typeof informes[0]) => {
    const practicante = practicantes.find((p) => p.id === informe.practicanteId)
    const isRevisado = informe.estado !== 'en_revision'

    const formateador = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
    const iniStr = informe.fechaInicio ? formateador.format(new Date(informe.fechaInicio.split('-').map(Number) as any)) : ''
    const finStr = informe.fechaFin ? formateador.format(new Date(informe.fechaFin.split('-').map(Number) as any)) : ''

    const iniciales = practicante ? `${practicante.nombre[0]}${practicante.apellido[0]}` : 'PD'
    const nombreCompleto = practicante ? `${practicante.nombre} ${practicante.apellido}` : 'Practicante Desconocido'

    return (
      <div
        key={informe.id}
        className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 ${isRevisado ? 'opacity-60 grayscale' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[14px] font-bold uppercase shrink-0">
            {iniciales}
          </div>
          <div className="flex-1">
            <div className="font-bold text-[15px] text-slate-800">
              {nombreCompleto}
            </div>
            <div className="text-[12px] text-slate-500 font-medium capitalize mt-0.5">
              Periodo: {iniStr} - {finStr}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mt-3 border border-slate-100 flex items-center gap-2">
          <FileText size={18} className="text-blue-500 shrink-0" />
          <span className="text-[13px] font-medium text-slate-700 truncate">
            {informe.archivoPracticanteBase64 || 'Documento adjunto de SENATI'}
          </span>
        </div>

        {informe.mensajePracticante && (
          <div className="mt-2 text-[13px] text-slate-500 italic line-clamp-2">
            "{informe.mensajePracticante}"
          </div>
        )}

        {!isRevisado && (
          <button
            onClick={() => handleOpenModal(informe)}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl transition-all shadow-md flex justify-center items-center border-none cursor-pointer"
          >
            Revisar Informe
          </button>
        )}
        {isRevisado && informe.feedbackMonitor && (
          <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2 rounded-lg font-medium border border-emerald-100 mt-3">
            <span className="font-bold">Tu feedback:</span> {informe.feedbackMonitor}
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
        {modalOpen && selectedInforme && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="m-0 text-[18px] font-bold text-slate-900">Revisar Informe</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center border-none text-slate-500 cursor-pointer hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto pr-1 flex flex-col gap-4">
                <div>
                  <div className="flex flex-col gap-1 mb-3">
                    <span className="text-[13px] font-bold text-slate-700">Periodo evaluado:</span>
                    <span className="text-[13px] text-slate-600 capitalize bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(new Date(selectedInforme.fechaInicio.split('-').map(Number) as any))} - {new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(new Date(selectedInforme.fechaFin.split('-').map(Number) as any))}
                    </span>
                  </div>

                  {selectedInforme.mensajePracticante && (
                    <div className="mb-4">
                      <span className="text-[13px] font-bold text-slate-700 block mb-1">Nota del alumno:</span>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-[13px] text-slate-700 italic">
                        "{selectedInforme.mensajePracticante}"
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => toast.success('Descargando archivo adjunto...')}
                    className="w-full py-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold cursor-pointer hover:bg-blue-100 transition-colors mb-1 shadow-sm"
                  >
                    <Download size={18} /> Descargar documento de SENATI
                  </button>
                  <div className="text-center text-[11px] text-slate-500 mb-4 font-medium">
                    Adjunto: {selectedInforme.archivoPracticanteBase64}
                  </div>
                </div>

                <div>
                  <label className="text-[13px] font-bold text-slate-700 block mb-1">Feedback / Observaciones <span className="font-normal text-slate-500">(Opcional si se aprueba)</span></label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Escribe aquí las observaciones o felicitaciones..."
                    className="w-full h-24 p-3 border border-slate-200 rounded-xl resize-none text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="text-[13px] font-bold text-slate-700 block mb-1">Subir documento FIRMADO (RF-59) <span className="text-red-500">*</span></label>
                  <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors bg-white">
                    <Upload size={24} className="text-slate-400 mb-2" />
                    <span className="text-[13px] font-medium text-slate-600 text-center">
                      {archivoFirmado ? archivoFirmado : "Toca para subir el documento PDF/IMG firmado"}
                    </span>
                    <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3">
                <button
                  onClick={handleDevolver}
                  className="w-full py-3 rounded-xl border-none bg-red-600 text-white font-bold text-[14px] cursor-pointer hover:bg-red-700 shadow-md transition-colors"
                >
                  Observar
                </button>
                <button
                  onClick={handleAprobarYSubir}
                  className="w-full py-3 rounded-xl border-none bg-emerald-600 text-white font-bold text-[14px] cursor-pointer hover:bg-emerald-700 shadow-md transition-colors"
                >
                  Aprobar y Firmar
                </button>
              </div>
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

        {/* ── Generador de Reportes de Asistencia ── */}
        <GeneradorReportes />
      </div>
    )
  }

  // Fallback
  return null
}

export function GeneradorReportes() {
  const { carreras, monitores, practicantes } = useAppStore();

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [monitorId, setMonitorId] = useState('');
  const [carreraId, setCarreraId] = useState('');

  // Lógica de filtrado: Obtener solo las carreras de los practicantes del monitor seleccionado
  const carrerasDisponibles = useMemo(() => {
    if (!monitorId) return [];

    // 1. Buscamos a los practicantes de este monitor
    const practicantesDelMonitor = practicantes.filter(p => p.monitorId === monitorId);

    // 2. Extraemos los IDs únicos de sus carreras
    const idsCarrerasUnicas = Array.from(new Set(practicantesDelMonitor.map(p => p.carreraId)));

    // 3. Devolvemos los objetos completos de esas carreras
    return carreras.filter(c => idsCarrerasUnicas.includes(c.id));
  }, [monitorId, practicantes, carreras]);

  const handleMonitorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonitorId(e.target.value);
    setCarreraId(''); // Reset al cambiar monitor
  };

  const handleExportar = () => {
    if (!fechaInicio || !fechaFin || !monitorId || !carreraId) {
      alert("Por favor completa todos los campos para generar el reporte.");
      return;
    }

    // 1. Filtrar los practicantes según Monitor y Carrera (o Todas)
    const dataFiltrada = practicantes.filter(p => {
      const matchMonitor = p.monitorId === monitorId;
      const matchCarrera = carreraId === 'ALL' ? true : p.carreraId === carreraId;
      return matchMonitor && matchCarrera;
    });

    if (dataFiltrada.length === 0) {
      alert("No hay practicantes en este periodo con los filtros seleccionados.");
      return;
    }

    // 2. Armar el payload exacto para la librería de Excel (xlsx)
    const reporteExcel = dataFiltrada.map(p => {
      const monitor = monitores.find(m => m.id === p.monitorId);
      const carrera = carreras.find(c => c.id === p.carreraId);

      return {
        "DNI / ID": p.id,
        "Practicante": `${p.nombre} ${p.apellido}`,
        "Monitor Asignado": monitor?.nombre || '-',
        "Área Macromec": monitor?.area || '-',
        "Carrera SENATI": carrera?.nombre || '-',
        "Especialista SENATI": carrera?.especialistaNombre || '-',
        "Rango Fechas": `${fechaInicio} al ${fechaFin}`
      };
    });

    console.log("=== DATOS PREPARADOS PARA EXCEL ===");
    console.table(reporteExcel);
    alert(`Reporte generado exitosamente con ${reporteExcel.length} registros. Revisa la consola.`);
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-5 text-[15px]">
        <FileText className="w-5 h-5 text-blue-600" />
        Generador de Reportes de Asistencia
      </h3>

      {/* FILA 1: Fechas */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Fecha Inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-3 text-[14px] text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 appearance-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Fecha Fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-3 text-[14px] text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 appearance-none"
          />
        </div>
      </div>

      {/* FILA 2: Monitor */}
      <div className="mb-5">
        <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Monitor Asignado (Supervisor)</label>
        <select
          value={monitorId}
          onChange={handleMonitorChange}
          className="w-full border border-slate-200 rounded-lg p-3 text-[14px] text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
        >
          <option value="">Seleccione un monitor...</option>
          {monitores.map(m => (
            <option key={m.id} value={m.id}>{m.nombre} ({m.area})</option>
          ))}
        </select>
      </div>

      {/* FILA 3: Carreras filtradas */}
      <div className="mb-6">
        <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Carrera (SENATI)</label>
        <select
          value={carreraId}
          onChange={(e) => setCarreraId(e.target.value)}
          disabled={!monitorId || carrerasDisponibles.length === 0}
          className={`w-full border border-slate-200 rounded-lg p-3 text-[14px] outline-none ${!monitorId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-500'}`}
        >
          {!monitorId ? (
            <option value="">Primero seleccione un monitor</option>
          ) : carrerasDisponibles.length === 0 ? (
            <option value="">Este monitor no tiene practicantes</option>
          ) : (
            <>
              <option value="" disabled>Seleccione carrera a filtrar...</option>
              <option value="ALL" className="font-bold text-blue-600">Ver todas las carreras del monitor</option>
              {carrerasDisponibles.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </>
          )}
        </select>
      </div>

      <button
        onClick={handleExportar}
        className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-[14px] shadow-sm"
      >
        <Download className="w-4 h-4" />
        Generar y Exportar Reporte
      </button>
    </div>
  );
}
