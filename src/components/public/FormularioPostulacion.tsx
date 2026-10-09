import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { toast } from 'sonner'
import { Building2, UserCircle, GraduationCap, Send, CheckCircle2 } from 'lucide-react'

export default function FormularioPostulacion() {
  const carreras = useAppStore(s => s.carreras)
  const addPostulacion = useAppStore(s => s.addPostulacion)
  const config = useAppStore(s => s.macromecConfig)

  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [dni, setDni] = useState('')
  const [celular, setCelular] = useState('')
  const [correo, setCorreo] = useState('')
  const [carreraId, setCarreraId] = useState('')
  const [semestre, setSemestre] = useState('')
  const [mostrarExito, setMostrarExito] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombres || !apellidos || !dni || !celular || !correo || !carreraId || !semestre) {
      toast.error('Por favor complete todos los campos')
      return
    }

    addPostulacion({
      id: `postulante-${Date.now()}`,
      nombres,
      apellidos,
      dni,
      celular,
      correo,
      carreraId,
      semestre,
      fechaPostulacion: new Date().toISOString(),
      estado: 'pendiente',
      observaciones: ''
    })

    // Limpiar form
    setNombres('')
    setApellidos('')
    setDni('')
    setCelular('')
    setCorreo('')
    setCarreraId('')
    setSemestre('')

    setMostrarExito(true)
  }

  if (mostrarExito) {
    return (
      <div className="w-full max-w-[430px] mx-auto h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-emerald-100 p-5 rounded-full text-emerald-600 mb-6">
          <CheckCircle2 size={64} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">¡Postulación Enviada!</h2>
        <p className="text-slate-500 text-[15px] mb-8">
          Hemos recibido tu información correctamente. Nos contactaremos contigo a la brevedad para los siguientes pasos.
        </p>
        <button
          onClick={() => setMostrarExito(false)}
          className="bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl active:bg-slate-700 transition-colors"
        >
          Enviar otra postulación
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[430px] mx-auto h-[100dvh] overflow-y-auto bg-slate-50 flex flex-col relative animate-in fade-in duration-300">

      {/* Header Corporativo */}
      <div className="bg-blue-600 px-5 pt-12 pb-6 text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
            <Building2 size={24} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[20px] leading-tight tracking-tight uppercase">Macromec</span>
            <span className="text-blue-200 text-[12px] font-medium uppercase tracking-wider">{config?.nombreComercial || 'Empresa'}</span>
          </div>
        </div>
        <h1 className="font-black text-[22px] mt-4 leading-tight">Postulación a Prácticas Pre-Profesionales</h1>
        <p className="text-blue-100 text-[13px] mt-1.5 opacity-90">Completa tus datos para iniciar el proceso de selección.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex-1 flex flex-col gap-4">

        {/* Tarjeta 1: Datos Personales */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-[15px]">Datos Personales</h2>
          </div>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Nombres</label>
              <input type="text" placeholder="Ej. Juan Carlos" value={nombres} onChange={e => setNombres(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Apellidos</label>
              <input type="text" placeholder="Ej. Pérez Silva" value={apellidos} onChange={e => setApellidos(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400" />
            </div>
            <div className="flex gap-3">
              <div className="flex-[0.4]">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">DNI</label>
                <input type="text" placeholder="8 dígitos" maxLength={8} value={dni} onChange={e => setDni(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400" />
              </div>
              <div className="flex-[0.6]">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Celular</label>
                <input type="tel" placeholder="999 888 777" value={celular} onChange={e => setCelular(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Correo Electrónico</label>
              <input type="email" placeholder="correo@ejemplo.com" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400" />
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Datos Académicos */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-[15px]">Datos Académicos</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Carrera de Estudio</label>
              <div className="relative">
                <select value={carreraId} onChange={e => setCarreraId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 transition-all appearance-none pr-10">
                  <option value="">Selecciona tu carrera...</option>
                  {carreras.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.5 1.5L6 6L10.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-2 block">Semestre al que postula</label>
              <div className="flex gap-2">
                {['S4', 'S5', 'S6'].map(sem => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSemestre(sem)}
                    className={`flex-1 py-3 rounded-xl text-[14px] font-bold transition-all ${semestre === sem
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-100'
                        : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 scale-95'
                      }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pb-8 pt-2">
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all text-[15px]">
            <Send size={18} />
            Enviar Postulación
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-3 px-4 leading-tight">
            Al enviar este formulario, confirmas que los datos ingresados son correctos y válidos.
          </p>
        </div>
      </form>
    </div>
  )
}
