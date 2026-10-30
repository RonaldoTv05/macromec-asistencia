import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  CheckCircle2,
  X,
  Clock,
  Check,
  XCircle,
  Download,
  Upload,
  Archive,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { useAppStore } from '../store/useAppStore'
import { descargarArchivoBase64 } from '../utils/fileUtils'
import type { Monitor } from '../types';
import ModalRevisarInforme from '../components/ModalRevisarInforme';
import ModalConfirmacion from '../components/ModalConfirmacion';

export default function ReportesScreen() {
  const rolActivo = useAppStore((s) => s.rolActivo)
  const practicantes = useAppStore((s) => s.practicantes)
  const aprobarHorario = useAppStore((state) => state.aprobarHorario);
  const rechazarHorario = useAppStore((state) => state.rechazarHorario);

  // SUPERVISOR
  const informes = useAppStore((s) => s.informesQuincenales)
  const procesarInformeMonitor = useAppStore((s) => s.procesarInformeMonitor)
  const archivarInformeQuincenal = useAppStore((s) => s.archivarInformeQuincenal)
  const eliminarInformeQuincenal = useAppStore((s) => s.eliminarInformeQuincenal)
  const usuarioActual = useAppStore((s) => s.usuarioActual)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalBovedaOpen, setModalBovedaOpen] = useState(false)
  const [informeAEliminar, setInformeAEliminar] = useState<string | null>(null)
  const periodos = useAppStore((s) => s.periodos)
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos')
  const [selectedInforme, setSelectedInforme] = useState<typeof informes[0] | null>(null)


  // ── Lógica Supervisor ──
  const pendientesSupervisor = informes.filter((informe) => {
    if (informe.archivado) return false;
    if (informe.estado !== 'en_revision') return false;
    const practicante = practicantes.find(p => p.id === informe.practicanteId);
    return practicante?.monitorId === usuarioActual?.id;
  });

  const revisadosSupervisor = informes.filter((informe) => {
    if (informe.archivado) return false;
    if (informe.estado === 'en_revision') return false;
    const practicante = practicantes.find(p => p.id === informe.practicanteId);
    return practicante?.monitorId === usuarioActual?.id;
  });

  const archivadosSupervisor = informes.filter((informe) => {
    if (!informe.archivado) return false;
    const practicante = practicantes.find(p => p.id === informe.practicanteId);
    return practicante?.monitorId === usuarioActual?.id;
  });

  const handleOpenModal = (informe: typeof informes[0]) => {
    setSelectedInforme(informe)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedInforme(null)
  }

  const renderTarjetaSupervisor = (informe: typeof informes[0]) => {
    const practicante = practicantes.find((p) => p.id === informe.practicanteId)
    const isRevisado = informe.estado !== 'en_revision'

    const formateador = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
    const iniStr = informe.fechaInicio
      ? (() => {
        const [year, month, day] = informe.fechaInicio.split('-').map(Number);
        return formateador.format(new Date(year, month - 1, day));
      })()
      : '';

    const finStr = informe.fechaFin
      ? (() => {
        const [year, month, day] = informe.fechaFin.split('-').map(Number);
        return formateador.format(new Date(year, month - 1, day));
      })()
      : '';

    const iniciales = practicante ? `${practicante.nombre?.[0] || ''}${practicante.apellido?.[0] || ''}` : 'PD'
    const nombreCompleto = practicante ? `${practicante.nombre} ${practicante.apellido}` : 'Practicante Desconocido'

    return (
      <div
        key={informe.id}
        className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 ${isRevisado ? 'bg-slate-50/70 border-slate-200' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[14px] font-bold uppercase shrink-0">
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] text-slate-800 truncate">
              {nombreCompleto}
            </div>
            <div className="text-[12px] text-slate-500 font-medium capitalize mt-0.5">
              Periodo: {iniStr} - {finStr}
            </div>
          </div>
          {isRevisado && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${informe.estado === 'aprobado_y_firmado'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
                }`}
            >
              {informe.estado === 'aprobado_y_firmado' ? 'Firmado' : 'Observado'}
            </span>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mt-3 border border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={18} className="text-blue-500 shrink-0" />
            <span className="text-[13px] font-medium text-slate-700 truncate">
              {informe.nombreArchivo || (informe.archivoPracticanteBase64?.startsWith('data:') ? 'Documento adjunto de SENATI' : informe.archivoPracticanteBase64) || 'Documento adjunto de SENATI'}
            </span>
          </div>
          {informe.archivoPracticanteBase64 && (
            <button
              type="button"
              onClick={() => {
                descargarArchivoBase64(
                  informe.archivoPracticanteBase64!,
                  informe.nombreArchivo || `SENATI_${informe.id}.pdf`,
                  informe.tipoMime
                );
                toast.success('Descargando documento de SENATI...');
              }}
              title="Descargar documento de SENATI"
              className="p-1.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              <Download size={14} />
            </button>
          )}
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

        {isRevisado && (
          <div className="mt-3 flex flex-col gap-2">
            {informe.feedbackMonitor && (
              <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2.5 rounded-lg font-medium border border-emerald-100">
                <span className="font-bold">Tu feedback:</span> {informe.feedbackMonitor}
              </div>
            )}

            {/* Documento de respuesta / firmado del supervisor */}
            {informe.archivoFirmadoBase64 ? (
              <button
                type="button"
                onClick={() => {
                  descargarArchivoBase64(
                    informe.archivoFirmadoBase64!,
                    informe.nombreArchivoFirmado || (informe.estado === 'aprobado_y_firmado' ? `Firmado_${informe.id}.pdf` : `Observacion_${informe.id}.pdf`),
                    informe.tipoMimeFirmado
                  );
                  toast.success('Descargando documento...');
                }}
                className={`w-full py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs border ${
                  informe.estado === 'aprobado_y_firmado'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Download size={13} /> {informe.estado === 'aprobado_y_firmado' ? 'Descargar Doc Firmado' : 'Descargar Doc Observación'}
              </button>
            ) : (
              <div className="w-full py-2 px-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-[11px] font-semibold flex items-center justify-center text-center">
                No se adjuntó documento
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  archivarInformeQuincenal(informe.id, true);
                  toast.success('Informe archivado correctamente');
                }}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors"
              >
                <Archive size={14} /> Archivar informe
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Lógica Gerencia ──
  const pendientesGerencia = practicantes.filter(
    (p) => p.horarioPendiente?.estado === 'pendiente_aprobacion',
  )

  const [rechazoModalOpen, setRechazoModalOpen] = useState(false)
  const [rechazoId, setRechazoId] = useState('')
  const [rechazoMotivo, setRechazoMotivo] = useState('')

  const handleAprobarHorario = (id: string) => {
    aprobarHorario(id)
    toast.success('Horario aprobado exitosamente')
  }

  const handleRechazarHorario = (id: string) => {
    setRechazoId(id)
    setRechazoMotivo('')
    setRechazoModalOpen(true)
  }

  const confirmarRechazo = () => {
    if (!rechazoMotivo.trim()) {
      toast.error('Debe ingresar un motivo')
      return
    }
    rechazarHorario(rechazoId, rechazoMotivo)
    toast.error('Horario rechazado')
    setRechazoModalOpen(false)
  }

  const renderTarjetaGerencia = (p: typeof practicantes[0]) => {
    const horario = p.horarioPendiente
    if (!horario) return null

    return (
      <div key={p.id} className="border-t border-slate-100 pt-3 mt-2">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-br from-indigo-900 to-indigo-600 flex items-center justify-center text-[14px] font-bold text-white">
            {p.nombre[0]}
            {p.apellido?.[0] || ''}
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
              <span className="text-slate-600 capitalize">{d.dia} <span className="font-bold">({d.modalidadDiaria || d.modalidad})</span></span>
              <span className={d.modalidad === 'libre' ? 'text-slate-400' : 'text-slate-800'}>
                {d.modalidad === 'libre' || d.modalidadDiaria === 'Libre' ? 'Libre' : `${d.horaInicio} - ${d.horaFin}`}
              </span>
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
        {/* Cabecera Supervisor con acceso a la Bóveda */}
        <div className="flex items-center justify-between px-1">
          <div className="text-[13px] font-semibold text-slate-600">
            Panel de Informes Quincenales
          </div>
          <button
            type="button"
            onClick={() => setModalBovedaOpen(true)}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <Archive size={14} /> Bóveda / Archivados ({archivadosSupervisor.length})
          </button>
        </div>

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
            <div className="font-bold text-[14px] text-slate-700 mb-3 flex items-center gap-2">
              ✅ Informes revisados ({revisadosSupervisor.length})
            </div>
            {revisadosSupervisor.map(renderTarjetaSupervisor)}
          </div>
        )}

        {/* Modal de Bóveda / Documentos Archivados (Supervisor) */}
        {modalBovedaOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/75 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setModalBovedaOpen(false)} />
            <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[24px] overflow-hidden relative flex flex-col animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] h-[85vh] shadow-2xl">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Archive size={16} />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-800 m-0 leading-tight">Bóveda de Archivados</h3>
                    <span className="text-[11px] text-slate-400 font-medium">Bóveda histórica multiciclo</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalBovedaOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border-none cursor-pointer active:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filtro por Periodo Académico */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold text-slate-500">Historial de Periodo:</span>
                <select
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 outline-none cursor-pointer shadow-2xs"
                >
                  <option value="todos">Todos los periodos</option>
                  {periodos.map(per => (
                    <option key={per.id} value={per.id}>
                      Ver: {per.nombre} {per.estado === 'activo' ? '(Activo)' : per.estado === 'cerrado' ? '(Cerrado)' : '(Borrador)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pb-12">
                {archivadosSupervisor.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-[13px]">
                    <Archive size={36} className="mx-auto mb-2 text-slate-300" />
                    No hay informes archivados en la bóveda
                  </div>
                ) : (
                  archivadosSupervisor.filter((inf) => {
                    if (filtroPeriodo === 'todos') return true;
                    return (inf.periodoId || 'per-2026-02') === filtroPeriodo;
                  }).map((inf) => {
                    const perDelInf = periodos.find(p => p.id === (inf.periodoId || 'per-2026-02'));
                    const esCerrado = perDelInf?.estado === 'cerrado';
                    const pract = practicantes.find((p) => p.id === inf.practicanteId);
                    const nombreCompleto = pract ? `${pract.nombre} ${pract.apellido}` : 'Practicante';

                    const formateador = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
                    const iniStr = inf.fechaInicio
                      ? (() => {
                        const [y, m, d] = inf.fechaInicio.split('-').map(Number);
                        return formateador.format(new Date(y, m - 1, d));
                      })()
                      : '';
                    const finStr = inf.fechaFin
                      ? (() => {
                        const [y, m, d] = inf.fechaFin.split('-').map(Number);
                        return formateador.format(new Date(y, m - 1, d));
                      })()
                      : '';

                    return (
                      <div
                        key={inf.id}
                        className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-[14px] text-slate-800">
                              {nombreCompleto}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              Periodo: {iniStr} - {finStr}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inf.estado === 'aprobado_y_firmado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inf.estado === 'aprobado_y_firmado' ? 'Firmado' : 'Observado'}
                          </span>
                        </div>

                        {/* Botones de Descarga */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {inf.archivoPracticanteBase64 ? (
                            <button
                              type="button"
                              onClick={() => {
                                descargarArchivoBase64(
                                  inf.archivoPracticanteBase64!,
                                  inf.nombreArchivo || `SENATI_${inf.id}.pdf`,
                                  inf.tipoMime
                                );
                                toast.success('Descargando doc SENATI...');
                              }}
                              className="py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-blue-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-blue-50 transition-colors shadow-xs"
                            >
                              <Download size={13} /> Doc SENATI
                            </button>
                          ) : (
                            <div className="text-[11px] text-slate-400 text-center py-1">Sin doc SENATI</div>
                          )}

                          {inf.archivoFirmadoBase64 ? (
                            <button
                              type="button"
                              onClick={() => {
                                descargarArchivoBase64(
                                  inf.archivoFirmadoBase64!,
                                  inf.nombreArchivoFirmado || `Firmado_${inf.id}.pdf`,
                                  inf.tipoMimeFirmado
                                );
                                toast.success('Descargando doc FIRMADO...');
                              }}
                              className="py-2 px-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition-colors shadow-xs"
                            >
                              <Download size={13} /> Doc Firmado
                            </button>
                          ) : (
                            <div className="py-2 px-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-[11px] font-semibold flex items-center justify-center text-center">No se adjuntó documento</div>
                          )}
                        </div>

                        {/* Acciones Restaurar y Eliminar (Bloqueado si el periodo está cerrado) */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                          {esCerrado ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              🔒 Periodo Cerrado (Solo Lectura)
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  archivarInformeQuincenal(inf.id, false);
                                  toast.success('Informe restaurado al listado principal');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-transparent border-none cursor-pointer"
                              >
                                <RotateCcw size={12} /> Restaurar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setInformeAEliminar(inf.id);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-transparent border-none cursor-pointer"
                              >
                                <Trash2 size={12} /> Eliminar definitivamente
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación para Eliminar Definitivamente (Supervisor) */}
        <ModalConfirmacion
          isOpen={!!informeAEliminar}
          onClose={() => setInformeAEliminar(null)}
          onConfirm={() => {
            if (informeAEliminar) {
              eliminarInformeQuincenal(informeAEliminar);
              toast.success('Informe eliminado definitivamente');
              setInformeAEliminar(null);
            }
          }}
          titulo="¿Eliminar definitivamente?"
          mensaje="Esta acción eliminará el informe y sus documentos asociados de forma permanente."
          textoConfirmar="Eliminar definitivamente"
          tipo="peligro"
        />

        {/* Modal Revisar Informe */}
        <ModalRevisarInforme
          isOpen={modalOpen}
          onClose={handleCloseModal}
          informe={selectedInforme}
          onProcesar={procesarInformeMonitor}
        />
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

        {/* Modal de Rechazo de Horario (Gerencia) */}
        {rechazoModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl relative flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="m-0 text-[18px] font-bold text-slate-900">Motivo del Rechazo</h3>
                <button
                  onClick={() => setRechazoModalOpen(false)}
                  className="bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center border-none text-slate-500 cursor-pointer hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={rechazoMotivo}
                onChange={(e) => setRechazoMotivo(e.target.value)}
                placeholder="Escribe el motivo detallado para el practicante..."
                className="w-full h-24 p-3 rounded-xl border border-slate-200 text-[13px] bg-slate-50 outline-none focus:border-blue-500 resize-none"
                autoFocus
              />
              <div className="mt-4 flex gap-3">
                <button onClick={() => setRechazoModalOpen(false)} className="flex-1 py-3 rounded-xl border-none bg-slate-100 text-slate-700 font-bold cursor-pointer hover:bg-slate-200">
                  Cancelar
                </button>
                <button onClick={confirmarRechazo} className="flex-1 py-3 rounded-xl border-none bg-red-600 text-white font-bold cursor-pointer hover:bg-red-700">
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Fallback
  return null
}

export function GeneradorReportes() {
  const usuarioActual = useAppStore((s) => s.usuarioActual);
  const monitores = useAppStore((s) => s.monitores || []);
  const practicantes = useAppStore((s) => s.practicantes || []);
  const periodos = useAppStore((s) => s.periodos || []);
  const semestres = useAppStore((s) => s.semestres || []);

  const esAdmin =
    usuarioActual?.rol === 'GERENCIA' ||
    (usuarioActual as any)?.rol === 'ADMIN' ||
    (usuarioActual as any)?.role === 'ADMIN' ||
    (usuarioActual as any)?.role === 'GERENCIA';

  // 🛡️ Seguridad RBAC: Solo visible para administradores/gerencia
  if (!esAdmin || usuarioActual?.rol === 'PRACTICANTE') {
    return null;
  }

  const periodoActivo = periodos.find((p) => p.estado === 'activo') || periodos[0];
  const feriados = periodoActivo?.feriados || semestres[0]?.feriados || [];

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [monitoresSeleccionados, setMonitoresSeleccionados] = useState<Monitor[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [archivoGenerado, setArchivoGenerado] = useState<{
    url: string;
    nombre: string;
    tamanoStr: string;
  } | null>(null);

  const downloadAnchorRef = useRef<HTMLAnchorElement>(null);

  // Limpieza de memoria RAM al desmontar o al sustituir archivo
  useEffect(() => {
    return () => {
      if (archivoGenerado?.url) {
        URL.revokeObjectURL(archivoGenerado.url);
      }
    };
  }, [archivoGenerado]);

  const handleMonitorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) return;

    if (value === 'ALL') {
      setMonitoresSeleccionados([...monitores]);
    } else {
      const monitor = monitores.find((m) => m.id === value);
      if (monitor && !monitoresSeleccionados.some((m) => m.id === monitor.id)) {
        setMonitoresSeleccionados((prev) => [...prev, monitor]);
      }
    }
    e.target.value = ''; // Reset select
  };

  const quitarMonitor = (id: string) => {
    setMonitoresSeleccionados((prev) => prev.filter((m) => m.id !== id));
  };

  const handleEliminarArchivo = () => {
    if (archivoGenerado) {
      URL.revokeObjectURL(archivoGenerado.url);
      setArchivoGenerado(null);
      toast.info('Archivo eliminado de memoria');
    }
  };

  const handleExportarExcel = async () => {
    // Validaciones sin alertas nativas
    if (!fechaInicio || !fechaFin) {
      toast.error('Seleccione las fechas de inicio y fin');
      return;
    }

    if (fechaInicio > fechaFin) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    if (monitoresSeleccionados.length === 0) {
      toast.error('Seleccione al menos un supervisor');
      return;
    }

    setIsExporting(true);

    try {
      // Liberar URL previa si existía
      if (archivoGenerado?.url) {
        URL.revokeObjectURL(archivoGenerado.url);
        setArchivoGenerado(null);
      }

      // Ligero delay visual de feedback en memoria
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 1. Generar array con el rango de fechas estrictas
      const fechas: string[] = [];
      const cursor = new Date(fechaInicio + 'T00:00:00');
      const finDate = new Date(fechaFin + 'T00:00:00');
      while (cursor <= finDate) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, '0');
        const d = String(cursor.getDate()).padStart(2, '0');
        fechas.push(`${y}-${m}-${d}`);
        cursor.setDate(cursor.getDate() + 1);
      }

      // 2. Construir matriz y estilos con SheetJS (xlsx-js-style)
      const wb = XLSX.utils.book_new();
      const aoa: any[][] = [];
      const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
      const supervisorHeaderRows: number[] = [];
      const tableHeaderRows: number[] = [];

      monitoresSeleccionados.forEach((sup) => {
        // Alumnos asignados al supervisor
        const alumnos = practicantes.filter(
          (p) => p.supervisorId === sup.id || p.monitorId === sup.id
        );

        // Cabecera del supervisor (Fila con fondo azul tenue)
        const supRowIdx = aoa.length;
        supervisorHeaderRows.push(supRowIdx);
        aoa.push([`SUPERVISOR: ${sup.nombre}`]);
        merges.push({ s: { r: supRowIdx, c: 0 }, e: { r: supRowIdx, c: 9 } });

        // Fila de encabezados de columna
        const colHeaderIdx = aoa.length;
        tableHeaderRows.push(colHeaderIdx);
        aoa.push(['DNI', 'Nombre', 'Modalidad', 'HE', 'OK', 'T', 'F', 'Fr', 'L', 'Total Días']);

        // Filas de practicantes
        if (alumnos.length === 0) {
          aoa.push(['-', 'Sin alumnos asignados', '-', 0, 0, 0, 0, 0, 0, 0]);
        } else {
          alumnos.forEach((p) => {
            let ok = 0;
            let t = 0;
            let f = 0;
            let he = 0;
            let l = 0;
            let fr = 0;

            fechas.forEach((fStr) => {
              // Feriado
              const esFeriado = feriados.some((fer: any) => fer.fecha === fStr);
              if (esFeriado) {
                fr++;
                return;
              }

              // Retirado
              if (p.estadoLaboral === 'retirado' && p.retiro && fStr >= p.retiro.fechaInicio) {
                return;
              }

              // Registros de asistencia / historial
              const reg = p.historial?.find((h) => h.fecha === fStr);
              const regAsis = p.asistencia?.[fStr];

              if (reg?.estado === 'ASISTIO' || regAsis?.estado === 'Asistió') {
                ok++;
              } else if (reg?.estado === 'TARDANZA' || regAsis?.estado === 'Tardanza') {
                t++;
              } else if (reg?.estado === 'FALTA' || regAsis?.estado === 'Falta') {
                f++;
              } else if (
                reg?.estado === 'COMPENSADO' ||
                reg?.estado === 'FALTA_CUBIERTA' ||
                (regAsis?.horasExtraManuales || 0) > 0 ||
                regAsis?.faltaCubierta
              ) {
                he++;
              } else if (reg?.estado === 'LIBRE' || regAsis?.estado === 'Libre') {
                l++;
              } else if (reg?.estado === 'CAMPO' || regAsis?.estado === 'Campo') {
                ok++;
              } else {
                // Horario semanal (si el día está programado como Libre o no laborable)
                const horarioActivo = p.horarioVigente || p.horarioAprobado || p.horarioActual;
                if (horarioActivo && (horarioActivo.estado === 'Aprobado' || horarioActivo.estado === 'aprobado')) {
                  const [yy, mm, dd] = fStr.split('-').map(Number);
                  const dObj = new Date(yy, mm - 1, dd);
                  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  const nombreDia = diasNombres[dObj.getDay()];
                  const diaHorario = horarioActivo.dias?.find((dh) => dh.dia === nombreDia);
                  if (
                    !diaHorario ||
                    diaHorario.modalidadDiaria === 'Libre' ||
                    diaHorario.modalidad === 'libre' ||
                    nombreDia === 'Domingo'
                  ) {
                    l++;
                  }
                }
              }
            });

            const totalDias = ok + t + f + fr + l + he;
            const dni = p.dni || '-';
            const nombreCompleto = `${p.nombre} ${p.apellido || ''}`.trim();
            const modalidad = p.modalidadBase
              ? p.modalidadBase.charAt(0).toUpperCase() + p.modalidadBase.slice(1)
              : 'Presencial';

            aoa.push([dni, nombreCompleto, modalidad, he, ok, t, f, fr, l, totalDias]);
          });
        }

        // Espaciador entre supervisores
        aoa.push([]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Asignar merges
      ws['!merges'] = merges;

      // Asignar anchos de columnas
      ws['!cols'] = [
        { wch: 14 }, // DNI
        { wch: 34 }, // Nombre
        { wch: 18 }, // Modalidad
        { wch: 8 },  // HE
        { wch: 8 },  // OK
        { wch: 8 },  // T
        { wch: 8 },  // F
        { wch: 8 },  // Fr
        { wch: 8 },  // L
        { wch: 13 }, // Total Días
      ];



      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Asistencia');

      // 3. Generación en memoria (Blob)
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const nombre = `asistencia_${fechaInicio}_${fechaFin}.xlsx`;
      const tamanoStr = `${(blob.size / 1024).toFixed(1)} KB`;

      setArchivoGenerado({
        url,
        nombre,
        tamanoStr,
      });

      // Aviso rápido con Toast UI
      toast.success('✅ Reporte generado correctamente');
    } catch (error) {
      console.error('Error generando reporte Excel:', error);
      toast.error('Error al generar el reporte de asistencia');
    } finally {
      setIsExporting(false);
    }
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
          <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
            Fecha Inicio
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-3 text-[14px] text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 appearance-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
            Fecha Fin
          </label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-3 text-[14px] text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 appearance-none"
          />
        </div>
      </div>

      {/* FILA 2: Monitor */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wide">
            Monitor Asignado (Supervisor)
          </label>
          {monitoresSeleccionados.length > 0 && (
            <button
              type="button"
              onClick={() => setMonitoresSeleccionados([])}
              className="text-[11px] text-slate-400 hover:text-red-600 font-bold bg-transparent border-none cursor-pointer"
            >
              Limpiar selección
            </button>
          )}
        </div>
        <select
          defaultValue=""
          onChange={handleMonitorChange}
          className="w-full border border-slate-200 rounded-lg p-3 text-[14px] text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 cursor-pointer"
        >
          <option value="" disabled>
            Seleccione un monitor...
          </option>
          <option value="ALL">-- Seleccionar Todos --</option>
          {monitores.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre} ({m.area})
            </option>
          ))}
        </select>

        {monitoresSeleccionados.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {monitoresSeleccionados.map((mon) => (
              <div
                key={mon.id}
                className="bg-blue-100 text-blue-700 text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-2xs"
              >
                <span>{mon.nombre}</span>
                <button
                  type="button"
                  onClick={() => quitarMonitor(mon.id)}
                  title={`Quitar a ${mon.nombre}`}
                  className="text-blue-500 hover:text-blue-800 font-bold active:scale-95 transition-transform bg-transparent border-none cursor-pointer p-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón de Generación en memoria */}
      <button
        type="button"
        onClick={handleExportarExcel}
        disabled={isExporting}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all text-[14px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Generando archivo...</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4" />
            <span>Generar archivo de asistencia</span>
          </>
        )}
      </button>

      {/* 📥 UI DE DESCARGA DIFERIDA: Tarjeta del Archivo Generado */}
      {archivoGenerado && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 flex justify-between items-center shadow-xs mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Izquierda: Ícono de Excel y Nombre Dinámico */}
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <FileSpreadsheet size={22} className="text-emerald-600" />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="text-[13px] font-bold text-slate-800 truncate"
                title={archivoGenerado.nombre}
              >
                {archivoGenerado.nombre}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Microsoft Excel • {archivoGenerado.tamanoStr}
              </span>
            </div>
          </div>

          {/* Derecha: Botones de Acción (Descargar y Eliminar) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. Botón Descargar: Tag <a> funcional con download */}
            <a
              ref={downloadAnchorRef}
              href={archivoGenerado.url}
              download={archivoGenerado.nombre}
              title="Descargar archivo al dispositivo"
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-2 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs no-underline cursor-pointer"
            >
              <Download size={14} />
              <span>Descargar</span>
            </a>

            {/* 2. Botón Eliminar: Ícono Papelera roja */}
            <button
              type="button"
              onClick={handleEliminarArchivo}
              title="Eliminar de memoria"
              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg border-none cursor-pointer active:scale-95 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
