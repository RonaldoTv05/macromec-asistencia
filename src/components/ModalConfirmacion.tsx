import React from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ModalConfirmacionProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  titulo?: string
  mensaje?: string
  textoConfirmar?: string
  textoCancelar?: string
  tipo?: 'peligro' | 'advertencia' | 'info'
  isSubmitting?: boolean
}

export default function ModalConfirmacion({
  isOpen,
  onClose,
  onConfirm,
  titulo = '¿Eliminar Especialista?',
  mensaje = '¿Estás seguro de eliminar este especialista? Se desvinculará automáticamente de todas las carreras asignadas.',
  textoConfirmar = 'Eliminar',
  textoCancelar = 'Cancelar',
  tipo = 'peligro',
  isSubmitting = false,
}: ModalConfirmacionProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />

      <div className="w-full max-w-[360px] bg-white rounded-3xl p-5 shadow-2xl relative z-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 bg-slate-100 p-1.5 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-none cursor-pointer disabled:opacity-50"
        >
          <X size={16} />
        </button>

        {/* Icono */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 shadow-sm ${tipo === 'peligro'
              ? 'bg-rose-100 text-rose-600'
              : tipo === 'advertencia'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-blue-100 text-blue-600'
            }`}
        >
          {tipo === 'peligro' ? <Trash2 size={26} /> : <AlertTriangle size={26} />}
        </div>

        {/* Título y Mensaje */}
        <h3 className="m-0 text-[17px] font-bold text-slate-800 leading-tight mb-2">
          {titulo}
        </h3>
        <p className="m-0 text-[13px] text-slate-500 leading-relaxed px-1 mb-5">
          {mensaje}
        </p>

        {/* Botones de Acción */}
        <div className="w-full flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold rounded-xl border-none cursor-pointer transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-1 py-3 px-3 text-[13px] font-bold rounded-xl border-none cursor-pointer transition-colors shadow-md active:scale-[0.98] disabled:opacity-50 ${tipo === 'peligro'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {isSubmitting ? 'Eliminando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

