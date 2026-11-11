import React, { useState } from 'react'
import {
  Briefcase,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { normalizarTelefonoPeru, useAppStore } from '../store/useAppStore'

export interface ModalNuevoSupervisorProps {
  onCerrar: () => void
}

const SANITIZE = (value: string): string => value.replace(/<[^>]*>/g, '').trim()

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

function generarPasswordTemporal(longitud = 8): string {
  const bytes = new Uint8Array(longitud)
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join('')
  }
  return Math.random().toString(36).slice(-longitud)
}

export default function ModalNuevoSupervisor({
  onCerrar,
}: ModalNuevoSupervisorProps) {
  const addUsuario = useAppStore((s) => s.addUsuario)
  const monitores = useAppStore((s) => s.monitores || [])
  const usuariosSistema = useAppStore((s) => s.usuariosSistema || [])

  const [nombres, setNombres] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [area, setArea] = useState('')
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const nombresClean = SANITIZE(nombres)
    const dniClean = SANITIZE(dni).replace(/\D/g, '')
    const telefonoClean = SANITIZE(telefono)
    const areaClean = SANITIZE(area)
    const correoClean = SANITIZE(correo)

    if (nombresClean.length < 2) {
      setError('Ingresa los nombres y apellidos del supervisor.')
      return
    }
    if (!/^\d{8}$/.test(dniClean)) {
      setError('El DNI debe contener exactamente 8 dígitos.')
      return
    }
    if (telefonoClean.replace(/\D/g, '').length < 7) {
      setError('Ingresa un N° de Celular válido para enviar sus credenciales.')
      return
    }
    if (areaClean.length < 2) {
      setError('Especifica el área o carreras a cargo.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoClean)) {
      setError('Ingresa un correo institucional válido.')
      return
    }

    const yaExiste =
      monitores.some((m) => m.dni === dniClean) ||
      usuariosSistema.some((u) => u.dni === dniClean || u.username === dniClean)
    if (yaExiste) {
      setError('Ya existe un usuario registrado con ese DNI.')
      return
    }

    const passwordTemporal = generarPasswordTemporal(8)
    const iniciales = nombresClean
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('')

    const nuevoSupervisor = {
      id: `sup-${Date.now()}`,
      username: dniClean,
      password: passwordTemporal,
      nombre: nombresClean,
      nombres: nombresClean,
      rol: 'SUPERVISOR' as const,
      email: correoClean,
      correo: correoClean,
      correoGmail: correoClean,
      dni: dniClean,
      tel: telefonoClean,
      telefono: telefonoClean,
      fechaNacimiento: '',
      carrera: areaClean,
      area: areaClean,
      avatarIniciales: iniciales || 'SP',
    }

    addUsuario(nuevoSupervisor as any)

    const mensaje = `Hola ${nuevoSupervisor.nombres}, bienvenido al equipo MACROMEC.\n\nTus credenciales como Supervisor han sido generadas:\n👤 Usuario: ${nuevoSupervisor.dni}\n🔑 Contraseña temporal: ${nuevoSupervisor.password}\n\nIngresa al sistema para gestionar a tus practicantes.`
    const encodedMensaje = encodeURIComponent(mensaje)
    const telefonoLimpio = normalizarTelefonoPeru(nuevoSupervisor.telefono)
    window.open(
      `https://wa.me/51${telefonoLimpio}?text=${encodedMensaje}`,
      '_blank'
    )

    toast.success(`Supervisor ${nombresClean} registrado`, {
      description: 'Se abrió WhatsApp con sus credenciales de acceso.',
    })

    onCerrar()
  }

  return (
    <div
      id="modal-nuevo-supervisor-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
      className="fixed inset-0 z-[1100] bg-slate-900/55 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in duration-150"
    >
      <div
        id="modal-nuevo-supervisor-sheet"
        className="w-full max-w-[430px] bg-white rounded-t-3xl px-5 pt-3 pb-7 max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-2.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
              <ShieldCheck size={11} />
              Alta e Invitación WhatsApp
            </span>
            <h3 className="m-0 text-lg font-extrabold text-slate-800">
              Nuevo Supervisor
            </h3>
          </div>
          <button
            id="btn-cerrar-nuevo-supervisor"
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar registro de supervisor"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border-none flex items-center justify-center text-slate-500 cursor-pointer shrink-0 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Formulario */}
        <form
          id="form-nuevo-supervisor"
          onSubmit={handleGuardar}
          className="flex-1 overflow-y-auto flex flex-col gap-3.5 pr-0.5"
        >
          <div>
            <label
              htmlFor="nuevo-sup-nombres"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
            >
              <UserIcon size={13} className="text-indigo-600" />
              Nombres y Apellidos
            </label>
            <input
              id="nuevo-sup-nombres"
              type="text"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              placeholder="Ej. Carlos Mendoza Ríos"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="nuevo-sup-dni"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
              >
                <CreditCard size={13} className="text-indigo-600" />
                DNI (8 dígitos)
              </label>
              <input
                id="nuevo-sup-dni"
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) =>
                  setDni(e.target.value.replace(/\D/g, '').slice(0, 8))
                }
                placeholder="8 dígitos"
                maxLength={8}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="nuevo-sup-telefono"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
              >
                <Phone size={13} className="text-indigo-600" />
                N° de Celular
              </label>
              <input
                id="nuevo-sup-telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="999 888 777"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="nuevo-sup-area"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
            >
              <Briefcase size={13} className="text-indigo-600" />
              Área / Carreras a cargo
            </label>
            <input
              id="nuevo-sup-area"
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ej. Mantenimiento / Electricidad Industrial"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="nuevo-sup-correo"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
            >
              <Mail size={13} className="text-indigo-600" />
              Correo Institucional
            </label>
            <input
              id="nuevo-sup-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="supervisor@macromec.pe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-3.5 py-2.5 text-[11px] font-medium text-emerald-900 leading-snug">
            Al guardar, se generará una contraseña temporal segura y se abrirá
            WhatsApp automáticamente para compartir los accesos.
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              {error}
            </div>
          )}

          <button
            id="btn-guardar-nuevo-supervisor"
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 border-none cursor-pointer text-white font-bold py-3.5 rounded-xl mt-1 text-sm transition-colors shadow-xs"
          >
            Guardar Supervisor
          </button>
        </form>
      </div>
    </div>
  )
}

