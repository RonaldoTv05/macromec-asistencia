import React, { useState } from 'react'
import {
  Briefcase,
  Calendar,
  CreditCard,
  GraduationCap,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldAlert,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import type {
  Carrera,
  ModalidadBase,
  PerfilUsuarioLive,
  TipoUsuarioPerfil,
} from '../types'

export interface ModalAdminEditarUsuarioProps {
  abierto: boolean
  usuarioId: string | null
  tipoUsuario: TipoUsuarioPerfil
  onCerrar: () => void
  onGuardado?: (mensaje: string) => void
}

const MODALIDADES: ModalidadBase[] = ['Presencial', 'Semipresencial', 'Virtual']

const TIPO_LABEL: Record<TipoUsuarioPerfil, string> = {
  PRACTICANTE: 'Practicante',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Administrador',
  GERENCIA: 'Administrador',
}

export default function ModalAdminEditarUsuario({
  abierto,
  usuarioId,
  tipoUsuario,
  onCerrar,
  onGuardado,
}: ModalAdminEditarUsuarioProps) {
  // Suscripciones reactivas al estado vivo del store
  useAppStore((s) => s.practicantes)
  useAppStore((s) => s.monitores)
  useAppStore((s) => s.usuariosSistema)
  const carreras = useAppStore((s) => s.carreras)
  const getUsuarioById = useAppStore((s) => s.getUsuarioById)
  const adminEditarUsuario = useAppStore((s) => s.adminEditarUsuario)

  if (!abierto || !usuarioId) return null

  const usuarioLive = getUsuarioById(usuarioId)
  if (!usuarioLive) return null

  const tipoEfectivo = usuarioLive.tipoUsuario || tipoUsuario

  return (
    <div
      id="modal-admin-editar-usuario-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
      className="fixed inset-0 z-[2100] bg-slate-900/60 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in duration-150"
    >
      <ModalAdminEditarUsuarioForm
        key={`${usuarioLive.id}-${tipoEfectivo}-${usuarioLive.dni}-${usuarioLive.password || ''}`}
        usuarioLive={usuarioLive}
        tipoUsuario={tipoEfectivo}
        carreras={carreras}
        onCerrar={onCerrar}
        onSave={(payload) => {
          adminEditarUsuario(usuarioLive.id, tipoEfectivo, payload)
          onGuardado?.(
            `Datos y credenciales de ${payload.nombres} actualizados`
          )
          onCerrar()
        }}
      />
    </div>
  )
}

function ModalAdminEditarUsuarioForm({
  usuarioLive,
  tipoUsuario,
  carreras,
  onCerrar,
  onSave,
}: {
  usuarioLive: PerfilUsuarioLive
  tipoUsuario: TipoUsuarioPerfil
  carreras: Carrera[]
  onCerrar: () => void
  onSave: (payload: {
    nombres: string
    dni: string
    carrera?: string
    carreraId?: string
    modalidad?: ModalidadBase
    modalidadBase?: ModalidadBase
    telefono: string
    correo: string
    fechaNacimiento: string
    password: string
  }) => void
}) {
  const [nombres, setNombres] = useState(usuarioLive.nombres || '')
  const [dni, setDni] = useState(usuarioLive.dni || '')
  const [carrera, setCarrera] = useState(usuarioLive.carrera || '')
  const [carreraId, setCarreraId] = useState(usuarioLive.carreraId || '')
  const [modalidad, setModalidad] = useState<ModalidadBase>(
    usuarioLive.modalidad || 'Presencial'
  )
  const [telefono, setTelefono] = useState(usuarioLive.telefono || '')
  const [correo, setCorreo] = useState(usuarioLive.correo || '')
  const [fechaNacimiento, setFechaNacimiento] = useState(
    usuarioLive.fechaNacimiento || ''
  )
  const [password, setPassword] = useState(
    usuarioLive.password || usuarioLive.dni || ''
  )
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const nombresClean = nombres.trim()
    const dniClean = dni.trim()
    const carreraClean = carrera.trim()
    const correoClean = correo.trim()
    const telClean = telefono.trim()
    const passClean = password.trim()

    if (nombresClean.length < 2) {
      setError('Ingresa nombres y apellidos válidos.')
      return
    }
    if (dniClean.length < 8) {
      setError('El DNI debe tener al menos 8 caracteres.')
      return
    }
    if (correoClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoClean)) {
      setError('El formato del correo electrónico no es válido.')
      return
    }
    if (passClean.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.')
      return
    }

    onSave({
      nombres: nombresClean,
      dni: dniClean,
      carrera: carreraClean,
      carreraId: carreraId || undefined,
      ...(tipoUsuario === 'PRACTICANTE'
        ? { modalidad, modalidadBase: modalidad }
        : {}),
      telefono: telClean,
      correo: correoClean,
      fechaNacimiento: fechaNacimiento.trim(),
      password: passClean,
    })
  }

  const tieneCarreraCustom =
    tipoUsuario === 'PRACTICANTE' &&
    carrera.trim().length > 0 &&
    !carreras.some(
      (c) =>
        c.id === carreraId ||
        c.nombre.toLowerCase() === carrera.trim().toLowerCase()
    )

  return (
    <div
      id="modal-admin-editar-usuario-sheet"
      className="w-full max-w-[430px] bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
    >
      {/* Cabecera */}
      <div className="relative px-5 pt-3 pb-4 border-b border-slate-100 shrink-0">
        <button
          id="btn-cerrar-admin-editar"
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar modal"
          className="absolute right-4 top-3.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center border-none cursor-pointer shrink-0 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Línea de arrastre, insignia azul de ROL y Nombre Completo actual */}
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-1 rounded-full bg-slate-200 mb-3" />
          <div
            id="admin-edit-header-badges"
            className="flex items-center justify-center"
          >
            <span className="inline-flex items-center text-[11px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              {TIPO_LABEL[tipoUsuario].toUpperCase()}
            </span>
          </div>
          <h3
            id="admin-edit-header-title"
            className="m-0 mt-2 px-6 text-lg font-extrabold text-slate-900 leading-snug break-words"
          >
            {usuarioLive.nombres}
          </h3>
        </div>
      </div>

      {/* Formulario scrollable */}
      <form
        id="form-admin-editar-usuario"
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5"
      >
        {/* Nombres */}
        <div>
          <label
            htmlFor="admin-edit-nombres"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
          >
            <UserIcon size={13} className="text-blue-600" />
            Nombres y Apellidos
          </label>
          <input
            id="admin-edit-nombres"
            type="text"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            placeholder="Nombres completos"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        {/* DNI (+ Modalidad exclusiva para Practicantes) */}
        <div
          className={
            tipoUsuario === 'PRACTICANTE'
              ? 'grid grid-cols-2 gap-3'
              : 'grid grid-cols-1'
          }
        >
          <div>
            <label
              htmlFor="admin-edit-dni"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
            >
              <CreditCard size={13} className="text-blue-600" />
              DNI (Usuario)
            </label>
            <input
              id="admin-edit-dni"
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="8 dígitos"
              maxLength={12}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {tipoUsuario === 'PRACTICANTE' && (
            <div>
              <label
                htmlFor="admin-edit-modalidad"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
              >
                <Briefcase size={13} className="text-blue-600" />
                Modalidad
              </label>
              <select
                id="admin-edit-modalidad"
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as ModalidadBase)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              >
                {MODALIDADES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Carrera o Área */}
        <div>
          <label
            htmlFor="admin-edit-carrera"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
          >
            <GraduationCap size={13} className="text-blue-600" />
            {tipoUsuario === 'PRACTICANTE' ? 'Carrera' : 'Área / Carrera'}
          </label>
          {tipoUsuario === 'PRACTICANTE' ? (
            <select
              id="admin-edit-carrera"
              value={
                carreras.find(
                  (c) =>
                    c.id === carreraId ||
                    c.nombre.toLowerCase() === carrera.trim().toLowerCase()
                )?.id || '__custom__'
              }
              onChange={(e) => {
                const selected = carreras.find((c) => c.id === e.target.value)
                if (selected) {
                  setCarreraId(selected.id)
                  setCarrera(selected.nombre)
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              {tieneCarreraCustom && (
                <option value="__custom__">{carrera}</option>
              )}
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="admin-edit-carrera"
              type="text"
              value={carrera}
              onChange={(e) => setCarrera(e.target.value)}
              placeholder="Área de supervisión"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          )}
        </div>

        {/* Teléfono + Fecha de nacimiento */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="admin-edit-telefono"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
            >
              <Phone size={13} className="text-blue-600" />
              Teléfono
            </label>
            <input
              id="admin-edit-telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="999888777"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="admin-edit-fecha"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
            >
              <Calendar size={13} className="text-blue-600" />
              Nacimiento
            </label>
            <input
              id="admin-edit-fecha"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Correo */}
        <div>
          <label
            htmlFor="admin-edit-correo"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"
          >
            <Mail size={13} className="text-blue-600" />
            Correo Institucional
          </label>
          <input
            id="admin-edit-correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="usuario@institucion.edu.pe"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        {/* Bloque de Seguridad / Contraseña en texto plano (Solo Admin) */}
        <div className="bg-amber-50/75 border border-amber-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="admin-edit-password"
              className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900"
            >
              <KeyRound size={14} className="text-amber-600" />
              Contraseña de Acceso (Texto visible)
            </label>
            <button
              type="button"
              onClick={() => setPassword(dni.trim())}
              className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg px-2 py-0.5 cursor-pointer transition-colors"
            >
              Igualar al DNI
            </button>
          </div>

          <input
            id="admin-edit-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña del usuario"
            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
          />

          <p className="m-0 text-[11px] font-medium text-amber-800/90 leading-snug">
            Visible únicamente para Gerencia/Soporte. Al guardar, el acceso y el
            mensaje de WhatsApp usarán este DNI y esta contraseña.
          </p>
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <ShieldAlert size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Pie */}
      <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 grid grid-cols-2 gap-2.5 shrink-0">
        <button
          id="btn-cancelar-admin-editar"
          type="button"
          onClick={onCerrar}
          className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer transition-colors"
        >
          Cancelar
        </button>
        <button
          id="btn-guardar-admin-editar"
          type="submit"
          form="form-admin-editar-usuario"
          className="py-2.5 px-4 rounded-xl border-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
        >
          <Save size={15} />
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}
