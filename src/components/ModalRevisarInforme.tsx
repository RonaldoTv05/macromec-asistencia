import React, { useState, useEffect } from 'react'
import { X, Download, Upload, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { descargarArchivoBase64 } from '../utils/fileUtils'
import type { InformeQuincenal } from '../types'
import ModalConfirmacion from './ModalConfirmacion'

interface ModalRevisarInformeProps {
  isOpen: boolean
  onClose: () => void
  informe: InformeQuincenal | null
  onProcesar: (
    informeId: string,
    nuevoEstado: 'observado' | 'aprobado_y_firmado',
    feedback: string,
    archivoFirmadoBase64?: string,
    nombreArchivoFirmado?: string,
    tipoMimeFirmado?: string
  ) => void
}

export default function ModalRevisarInforme({
  isOpen,
  onClose,
  informe,
  onProcesar,
}: ModalRevisarInformeProps) {
  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [archivoFirmadoBase64, setArchivoFirmadoBase64] = useState<string | undefined>(undefined)
  const [nombreArchivoFirmado, setNombreArchivoFirmado] = useState<string | undefined>(undefined)
  const [tipoMimeFirmado, setTipoMimeFirmado] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmObservar, setShowConfirmObservar] = useState(false)

  // Sincronizar estado cuando el modal se abre o cambia de informe
  useEffect(() => {
    if (isOpen) {
      setFeedback(informe?.feedbackMonitor || '')
      setFeedbackError(null)
      setArchivoFirmadoBase64(undefined)
      setNombreArchivoFirmado(undefined)
      setTipoMimeFirmado(undefined)
      setIsSubmitting(false)
      setShowConfirmObservar(false)
    } else {
      setFeedback('')
      setFeedbackError(null)
      setArchivoFirmadoBase64(undefined)
      setNombreArchivoFirmado(undefined)
      setTipoMimeFirmado(undefined)
      setIsSubmitting(false)
      setShowConfirmObservar(false)
    }
  }, [isOpen, informe])

  if (!isOpen || !informe) return null

  // Manejo de lectura de archivo firmado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo permitido (15MB)')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setArchivoFirmadoBase64(base64)
      setNombreArchivoFirmado(file.name)
      setTipoMimeFirmado(file.type || 'application/pdf')
      toast.success(`Archivo adjuntado: ${file.name}`)
    }
    reader.onerror = () => {
      toast.error('Error al procesar el archivo seleccionado')
    }
    reader.readAsDataURL(file)
  }

  // 1. Lógica de "Observar": Requiere feedback obligatorio.
  // Si no hay documento firmado adjunto, despliega confirmación UI antes de guardar.
  const handleObservarClick = () => {
    if (isSubmitting) return

    const feedbackLimpio = feedback.trim()
    if (!feedbackLimpio) {
      setFeedbackError('Debes ingresar un feedback u observaciones para devolver el informe')
      toast.error('El feedback u observación es obligatorio para devolver el informe')
      return
    }

    // Si NO se adjuntó documento, mostrar cuadro de diálogo de confirmación
    if (!archivoFirmadoBase64) {
      setShowConfirmObservar(true)
      return
    }

    // Si ya adjuntó documento, proceder directamente
    ejecutarObservacion()
  }

  const ejecutarObservacion = () => {
    try {
      setIsSubmitting(true)
      const feedbackLimpio = feedback.trim()
      onProcesar(
        informe.id,
        'observado',
        feedbackLimpio,
        archivoFirmadoBase64 || undefined,
        nombreArchivoFirmado || undefined,
        tipoMimeFirmado || undefined
      )
      toast.success('Informe devuelto con observaciones')
      setShowConfirmObservar(false)
      onClose()
    } catch (err) {
      toast.error('Error al procesar la observación del informe')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 2. Lógica de "Aprobar y Firmar": Requiere obligatoriamente documento firmado
  const handleAprobar = () => {
    if (isSubmitting) return

    if (!archivoFirmadoBase64) {
      toast.error('Debes subir el documento firmado para aprobarlo')
      return
    }

    try {
      setIsSubmitting(true)
      onProcesar(
        informe.id,
        'aprobado_y_firmado',
        feedback.trim(),
        archivoFirmadoBase64,
        nombreArchivoFirmado,
        tipoMimeFirmado
      )
      toast.success('Informe aprobado y firmado exitosamente')
      // Cerrar modal inmediatamente tras invocar la acción en Zustand
      onClose()
    } catch (err) {
      toast.error('Error al procesar la aprobación del informe')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Formato seguro de periodo
  const getPeriodoString = () => {
    try {
      const fmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' })
      const [sY, sM, sD] = informe.fechaInicio.split('-').map(Number)
      const [eY, eM, eD] = informe.fechaFin.split('-').map(Number)
      return `${fmt.format(new Date(sY, sM - 1, sD))} - ${fmt.format(new Date(eY, eM - 1, eD))}`
    } catch {
      return `${informe.fechaInicio} - ${informe.fechaFin}`
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-[100] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />
      <div className="bg-white rounded-t-[24px] sm:rounded-3xl p-5 w-full max-w-[430px] mx-auto shadow-2xl relative flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 shrink-0">
          <h3 className="m-0 text-[18px] font-bold text-slate-900">Revisar Informe</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center border-none text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto pr-1 flex-1 min-h-0 flex flex-col gap-4 pb-8">
          <div>
            <div className="flex flex-col gap-1 mb-3">
              <span className="text-[13px] font-bold text-slate-700">Periodo evaluado:</span>
              <span className="text-[13px] text-slate-600 capitalize bg-slate-50 p-2 rounded-lg border border-slate-100">
                {getPeriodoString()}
              </span>
            </div>

            {informe.mensajePracticante && (
              <div className="mb-4">
                <span className="text-[13px] font-bold text-slate-700 block mb-1">Nota del alumno:</span>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-[13px] text-slate-700 italic">
                  "{informe.mensajePracticante}"
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (!informe.archivoPracticanteBase64) {
                  toast.error('No hay archivo disponible para descargar')
                  return
                }
                descargarArchivoBase64(
                  informe.archivoPracticanteBase64,
                  informe.nombreArchivo || `Informe_${informe.id}.pdf`,
                  informe.tipoMime
                )
                toast.success('Descargando documento de SENATI...')
              }}
              className="w-full py-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold cursor-pointer hover:bg-blue-100 transition-colors mb-1 shadow-sm active:scale-[0.99]"
            >
              <Download size={18} /> Descargar documento de SENATI
            </button>
            <div className="text-center text-[11px] text-slate-500 mb-4 font-medium truncate px-2">
              Adjunto: {informe.nombreArchivo || (informe.archivoPracticanteBase64?.startsWith('data:') ? 'Documento adjunto de SENATI' : informe.archivoPracticanteBase64) || 'Documento adjunto'}
            </div>
          </div>

          {/* Feedback con validación obligatoria para Observaciones */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[13px] font-bold text-slate-700 block">
                Feedback / Observaciones{' '}
                <span className="font-normal text-slate-500">
                  (Obligatorio para Observar)
                </span>
              </label>
              {feedbackError && (
                <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle size={12} /> Requerido
                </span>
              )}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value)
                if (feedbackError && e.target.value.trim()) {
                  setFeedbackError(null)
                }
              }}
              disabled={isSubmitting}
              placeholder="Escribe aquí las observaciones detalladas para el practicante o felicitaciones..."
              className={`w-full h-24 p-3 border rounded-xl resize-none text-[13px] outline-none transition-all bg-white ${
                feedbackError
                  ? 'border-rose-400 ring-2 ring-rose-100 focus:border-rose-500'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              }`}
            />
            {feedbackError && (
              <p className="m-0 mt-1 text-[11px] text-rose-600 font-medium">
                {feedbackError}
              </p>
            )}
          </div>

          {/* Subir documento firmado */}
          <div>
            <label className="text-[13px] font-bold text-slate-700 block mb-1">
              Subir documento FIRMADO <span className="text-red-500">*</span>
            </label>
            <label
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white ${
                nombreArchivoFirmado
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-300 hover:bg-slate-50 hover:border-blue-400'
              }`}
            >
              <Upload
                size={24}
                className={nombreArchivoFirmado ? 'text-emerald-500 mb-2' : 'text-slate-400 mb-2'}
              />
              <span className="text-[13px] font-medium text-slate-600 text-center truncate max-w-full px-2">
                {nombreArchivoFirmado ? nombreArchivoFirmado : 'Toca para subir el documento PDF/IMG firmado'}
              </span>
              {nombreArchivoFirmado && (
                <span className="text-[11px] text-emerald-600 font-semibold mt-1">
                  ✓ Archivo cargado y listo para firmar
                </span>
              )}
              <input
                type="file"
                className="hidden"
                accept=".pdf,application/pdf,image/*,.doc,.docx"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
            </label>
          </div>
        </div>

        {/* Acciones de pie */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleObservarClick}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl border-none bg-red-600 text-white font-bold text-[14px] cursor-pointer hover:bg-red-700 shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Procesando...' : 'Observar'}
          </button>
          <button
            type="button"
            onClick={handleAprobar}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl border-none bg-emerald-600 text-white font-bold text-[14px] cursor-pointer hover:bg-emerald-700 shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Procesando...' : 'Aprobar y Firmar'}
          </button>
        </div>
      </div>
          {/* Modal de Confirmación al Observar sin Documento */}
      <ModalConfirmacion
        isOpen={showConfirmObservar}
        onClose={() => setShowConfirmObservar(false)}
        onConfirm={ejecutarObservacion}
        titulo="¿Enviar observación sin documento?"
        mensaje="¿Estás seguro de enviar esta observación sin adjuntar un documento?"
        textoConfirmar="Sí, enviar"
        textoCancelar="Cancelar"
        tipo="advertencia"
        isSubmitting={isSubmitting}
      />
    </div>
  )
}