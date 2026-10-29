import React, { useState, useEffect } from 'react'
import { X, Upload, FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ModalNuevoInformeProps {
  isOpen: boolean
  onClose: () => void
  practicanteId: string
  onEnviar: (payload: {
    practicanteId: string
    fechaInicio: string
    fechaFin: string
    archivoPracticanteBase64: string
    nombreArchivo?: string
    tipoMime?: string
    mensajePracticante?: string
  }) => void
}

export default function ModalNuevoInforme({
  isOpen,
  onClose,
  practicanteId,
  onEnviar,
}: ModalNuevoInformeProps) {
  // Fechas por defecto: últimos 14 días
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0])

  const [archivoPracticanteBase64, setArchivoPracticanteBase64] = useState<string | undefined>(undefined)
  const [nombreArchivo, setNombreArchivo] = useState<string | undefined>(undefined)
  const [tipoMime, setTipoMime] = useState<string | undefined>(undefined)
  const [mensajePracticante, setMensajePracticante] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset del formulario cuando el modal se abre o cierra
  useEffect(() => {
    if (isOpen) {
      const today = new Date()
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(today.getDate() - 14)

      setFechaInicio(fourteenDaysAgo.toISOString().split('T')[0])
      setFechaFin(today.toISOString().split('T')[0])
      setArchivoPracticanteBase64(undefined)
      setNombreArchivo(undefined)
      setTipoMime(undefined)
      setMensajePracticante('')
      setFileError(null)
      setIsSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCerrar = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'doc', 'docx'].includes(extension || '')) {
      toast.error('Formato no permitido. Solo se aceptan archivos .pdf, .doc o .docx')
      setFileError('Solo se permiten archivos en formato .pdf, .doc o .docx')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo permitido (15MB)')
      setFileError('El archivo excede 15MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setArchivoPracticanteBase64(base64)
      setNombreArchivo(file.name)
      setTipoMime(file.type || 'application/pdf')
      setFileError(null)
      toast.success(`Documento cargado: ${file.name}`)
    }
    reader.onerror = () => {
      toast.error('Error al leer el archivo seleccionado')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    if (!archivoPracticanteBase64) {
      setFileError('Debes adjuntar el documento de SENATI')
      toast.error('Debes adjuntar el documento de SENATI')
      return
    }

    try {
      setIsSubmitting(true)
      // Guardar informe en Zustand
      onEnviar({
        practicanteId,
        fechaInicio,
        fechaFin,
        archivoPracticanteBase64,
        nombreArchivo: nombreArchivo || 'documento_senati.pdf',
        tipoMime: tipoMime || 'application/pdf',
        mensajePracticante: mensajePracticante.trim(),
      })

      toast.success('Informe enviado al supervisor en estado En Revisión')

      // Invocar obligatoriamente onClose() inmediatamente para evitar bloqueos y duplicados
      onClose()
    } catch (err) {
      toast.error('Error al enviar el informe')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/75 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={handleCerrar} />
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[24px] overflow-hidden relative flex flex-col animate-in slide-in-from-bottom-full duration-300 max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
          <h3 className="text-[18px] font-bold text-slate-800 m-0">Nuevo Informe Quincenal</h3>
          <button
            type="button"
            onClick={handleCerrar}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border-none cursor-pointer active:bg-slate-200 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 pb-10">
          {/* Rango de Fechas */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">
                Periodo Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>
            <div className="flex-1">
              <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">
                Periodo Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Subida de documento SENATI */}
          <div>
            <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">
              Documento de SENATI <span className="text-red-500">*</span>
            </label>
            {nombreArchivo ? (
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-slate-800 truncate">
                      {nombreArchivo}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Archivo listo para enviar
                    </span>
                  </div>
                </div>
                <label className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shrink-0 ml-2 shadow-xs">
                  Cambiar
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
            ) : (
              <label
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white ${
                  fileError
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-slate-300 hover:bg-slate-50 hover:border-blue-400'
                }`}
              >
                <Upload size={22} className={fileError ? 'text-rose-400 mb-2' : 'text-slate-400 mb-2'} />
                <span className="text-[13px] font-medium text-slate-600 text-center">
                  Toca para subir el documento (.pdf, .doc, .docx)
                </span>
                <span className="text-[11px] text-slate-400 text-center mt-1">
                  Convertido y almacenado en Base64 real
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
              </label>
            )}
            {fileError && (
              <p className="m-0 mt-1.5 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle size={12} /> {fileError}
              </p>
            )}
          </div>

          {/* Nota opcional */}
          <div>
            <label className="text-[13px] font-semibold text-slate-700 mb-1.5 block">
              Nota extra para el supervisor <span className="font-normal text-slate-500">(Opcional)</span>
            </label>
            <textarea
              value={mensajePracticante}
              onChange={(e) => setMensajePracticante(e.target.value)}
              disabled={isSubmitting}
              placeholder="Comentario adicional sobre el informe..."
              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] text-slate-800 outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Botón de Enviar con protección contra dobles clics */}
          <div className="pb-6 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex justify-center items-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-none"
            >
              {isSubmitting ? 'Enviando al Supervisor...' : 'Enviar al Supervisor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

