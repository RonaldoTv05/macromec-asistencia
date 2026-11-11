import React, { useRef, useState } from 'react'
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  CreditCard,
  Edit3,
  GraduationCap,
  LogOut,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import type { Rol, TipoUsuarioPerfil } from '../types'

export interface MiPerfilModalProps {
  abierto: boolean
  onCerrar: () => void
}

const ROL_BADGE: Record<Rol, { label: string; badgeClass: string }> = {
  PRACTICANTE: {
    label: 'Practicante',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  SUPERVISOR: {
    label: 'Supervisor',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  GERENCIA: {
    label: 'Administrador',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
}

const MAX_SIZE_BYTES = 1.5 * 1024 * 1024

function resolveTipoUsuario(rol: Rol): TipoUsuarioPerfil {
  if (rol === 'PRACTICANTE') return 'PRACTICANTE'
  if (rol === 'SUPERVISOR') return 'SUPERVISOR'
  return 'ADMIN'
}

export default function MiPerfilModal({ abierto, onCerrar }: MiPerfilModalProps) {
  const usuario = useAppStore((s) => s.usuarioActual)
  const practicantes = useAppStore((s) => s.practicantes)
  const monitores = useAppStore((s) => s.monitores || [])
  const getUsuarioById = useAppStore((s) => s.getUsuarioById)
  const actualizarMiPerfil = useAppStore((s) => s.actualizarMiPerfil)
  const updatePerfil = useAppStore((s) => s.updatePerfil)
  const logout = useAppStore((s) => s.logout)
  const datosEmpresa = useAppStore((s) => s.datosEmpresa)

  const [isEditing, setIsEditing] = useState(false)
  const [nombresInput, setNombresInput] = useState('')
  const [correoInput, setCorreoInput] = useState('')
  const [telefonoInput, setTelefonoInput] = useState('')
  const [fechaInput, setFechaInput] = useState('')
  const [errores, setErrores] = useState<{
    nombres?: string
    correo?: string
    telefono?: string
  }>({})
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [fotoError, setFotoError] = useState<string | null>(null)
  const [compresionando, setCompresionando] = useState(false)
  const inputFileRef = useRef<HTMLInputElement>(null)

  if (!abierto || !usuario) return null

  // Suscripción reactiva a cambios en el registro vivo
  const perfilLive = getUsuarioById(usuario.id)
  const practicanteLive =
    usuario.rol === 'PRACTICANTE'
      ? practicantes.find((p) => p.id === usuario.id)
      : undefined
  const monitorLive =
    usuario.rol === 'SUPERVISOR'
      ? monitores.find((m) => m.id === usuario.id)
      : undefined

  const nombresLive =
    perfilLive?.nombres ||
    `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() ||
    usuario.username
  const correoLive =
    perfilLive?.correo || usuario.correo || usuario.email || ''
  const telefonoLive =
    perfilLive?.telefono ||
    usuario.telefono ||
    usuario.tel ||
    usuario.celular ||
    ''
  const dniLive = perfilLive?.dni || usuario.dni || ''
  const fechaLive =
    perfilLive?.fechaNacimiento || usuario.fechaNacimiento || ''
  const carreraAreaLive =
    perfilLive?.carrera ||
    (usuario.rol === 'PRACTICANTE'
      ? [practicanteLive?.carrera || usuario.carrera, practicanteLive?.semestre || usuario.semestre]
          .filter(Boolean)
          .join(' - ')
      : usuario.rol === 'SUPERVISOR'
        ? monitorLive?.area || usuario.area || 'Supervisión Técnica'
        : usuario.cargo || usuario.area || 'Gerencia y Administración')

  const iniciales = String(nombresLive)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('')

  const rolUsuario: Rol = (usuario.rol as Rol) || 'PRACTICANTE'
  const rolMeta = ROL_BADGE[rolUsuario]
  const tipoUsuario = resolveTipoUsuario(rolUsuario)

  const handleClose = () => {
    setIsEditing(false)
    setErrores({})
    setToastMsg(null)
    setFotoError(null)
    onCerrar()
  }

  const handleEnterEdit = () => {
    setNombresInput(nombresLive)
    setCorreoInput(correoLive)
    setTelefonoInput(telefonoLive)
    setFechaInput(fechaLive)
    setErrores({})
    setToastMsg(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setErrores({})
    setIsEditing(false)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErr: { nombres?: string; correo?: string; telefono?: string } = {}
    const nombresClean = nombresInput.trim()
    const correoClean = correoInput.trim()
    const telClean = telefonoInput.trim()

    if (nombresClean.length < 2) {
      nextErr.nombres = 'Ingresa tus nombres y apellidos completos'
    }
    if (correoClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoClean)) {
      nextErr.correo = 'Ingresa un correo electrónico válido'
    }
    if (telClean && telClean.replace(/\D/g, '').length < 7) {
      nextErr.telefono = 'Ingresa un número de teléfono válido'
    }

    if (Object.keys(nextErr).length > 0) {
      setErrores(nextErr)
      return
    }

    actualizarMiPerfil(usuario.id, tipoUsuario, {
      nombres: nombresClean,
      correo: correoClean,
      telefono: telClean,
      fechaNacimiento: fechaInput.trim(),
    })

    setErrores({})
    setIsEditing(false)
    setToastMsg('Datos personales actualizados correctamente')
    window.setTimeout(() => setToastMsg(null), 3000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoError(null)

    if (!file.type.startsWith('image/')) {
      setFotoError('Solo se permiten imágenes JPG o PNG.')
      return
    }
    if (file.size > MAX_SIZE_BYTES * 2) {
      setFotoError('La imagen es demasiado pesada (máximo 3 MB).')
      return
    }

    setCompresionando(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 400
        let width = img.width
        let height = img.height
        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width
          width = MAX_DIM
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height
          height = MAX_DIM
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.72)
          updatePerfil({ fotoHikvision: compressed })
          setToastMsg('Foto biométrica actualizada')
          window.setTimeout(() => setToastMsg(null), 3000)
        }
        setCompresionando(false)
      }
      img.onerror = () => {
        setFotoError('No se pudo procesar la imagen seleccionada.')
        setCompresionando(false)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    if (inputFileRef.current) inputFileRef.current.value = ''
  }

  const handleLogout = () => {
    handleClose()
    logout()
  }

  return (
    <div
      id="perfil-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      className="fixed inset-0 z-[2000] bg-slate-900/55 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in duration-150"
    >
      <div
        id="perfil-modal-sheet"
        className="w-full max-w-[430px] bg-slate-50 rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Handle + Cabecera */}
        <div className="bg-white border-b border-slate-100 px-5 pt-2.5 pb-4 shrink-0">
          <div className="flex justify-center mb-2.5">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-sm">
                {iniciales || 'US'}
              </div>
              <div className="min-w-0">
                <h2 className="m-0 text-base font-extrabold text-slate-900 leading-tight truncate">
                  {nombresLive}
                </h2>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${rolMeta.badgeClass}`}
                  >
                    <Shield size={11} />
                    {rolMeta.label}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {isEditing ? 'Editando perfil' : 'Mi Perfil'}
                  </span>
                </div>
              </div>
            </div>

            <button
              id="btn-cerrar-perfil"
              type="button"
              onClick={handleClose}
              aria-label="Cerrar perfil"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center border-none cursor-pointer shrink-0 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toast inline */}
        {toastMsg && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shrink-0">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!isEditing ? (
            <>
              {/* Tarjetas limpias de datos personales (solo lectura) */}
              <div className="space-y-2.5">
                <TarjetaDatoPerfil
                  icono={<UserIcon size={15} className="text-blue-600" />}
                  label="Nombres"
                  valor={nombresLive}
                />
                <TarjetaDatoPerfil
                  icono={<Mail size={15} className="text-blue-600" />}
                  label="Correo Institucional"
                  valor={correoLive || 'No registrado'}
                />
                <TarjetaDatoPerfil
                  icono={<Phone size={15} className="text-blue-600" />}
                  label="Teléfono"
                  valor={telefonoLive || 'No registrado'}
                />
                <TarjetaDatoPerfil
                  icono={
                    usuario.rol === 'PRACTICANTE' ? (
                      <GraduationCap size={15} className="text-blue-600" />
                    ) : (
                      <Briefcase size={15} className="text-blue-600" />
                    )
                  }
                  label={usuario.rol === 'PRACTICANTE' ? 'Carrera' : 'Carrera / Área'}
                  valor={carreraAreaLive || '—'}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <TarjetaDatoPerfil
                    icono={<CreditCard size={15} className="text-blue-600" />}
                    label="DNI"
                    valor={dniLive || '—'}
                  />
                  <TarjetaDatoPerfil
                    icono={<Calendar size={15} className="text-blue-600" />}
                    label="Fecha de Nacimiento"
                    valor={fechaLive || 'No registrada'}
                  />
                </div>
              </div>

              {/* Bloque informativo de empresa + foto biométrica para practicante */}
              {usuario.rol === 'PRACTICANTE' && (
                <div className="pt-1 space-y-2.5">
                  <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera size={13} className="text-blue-600" />
                        Foto Biométrica (Hikvision)
                      </span>
                      {usuario.fotoHikvision && (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        {usuario.fotoHikvision ? (
                          <img
                            src={usuario.fotoHikvision}
                            alt="Foto Hikvision"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera size={18} className="text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <input
                          ref={inputFileRef}
                          id="fotoHikvision"
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="fotoHikvision"
                          className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                            compresionando
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer'
                          }`}
                        >
                          {compresionando
                            ? 'Procesando...'
                            : usuario.fotoHikvision
                              ? 'Cambiar foto'
                              : 'Subir foto'}
                        </label>
                      </div>
                    </div>

                    {fotoError && (
                      <p className="m-0 text-[11px] font-semibold text-red-600">
                        {fotoError}
                      </p>
                    )}
                  </div>

                  {datosEmpresa && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400" />
                        Sede Empresarial
                      </div>
                      <p className="m-0 text-xs font-bold text-slate-800">
                        {datosEmpresa.razonSocial}
                      </p>
                      <p className="m-0 mt-0.5 text-[11px] text-slate-500 font-medium">
                        RUC {datosEmpresa.ruc} • {datosEmpresa.direccion}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <form id="form-mi-perfil" onSubmit={handleSave} className="space-y-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-2xs">
                <div>
                  <label
                    htmlFor="edit-nombre"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5"
                  >
                    <UserIcon size={13} className="text-blue-600" />
                    Nombres
                  </label>
                  <input
                    id="edit-nombre"
                    type="text"
                    value={nombresInput}
                    onChange={(e) => {
                      setNombresInput(e.target.value)
                      if (errores.nombres) setErrores((p) => ({ ...p, nombres: undefined }))
                    }}
                    placeholder="Nombres y apellidos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  {errores.nombres && (
                    <p className="m-0 mt-1 text-[11px] font-semibold text-red-600">
                      {errores.nombres}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="edit-email"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5"
                  >
                    <Mail size={13} className="text-blue-600" />
                    Correo
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    value={correoInput}
                    onChange={(e) => {
                      setCorreoInput(e.target.value)
                      if (errores.correo) setErrores((p) => ({ ...p, correo: undefined }))
                    }}
                    placeholder="correo@institucion.edu.pe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  {errores.correo && (
                    <p className="m-0 mt-1 text-[11px] font-semibold text-red-600">
                      {errores.correo}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="edit-tel"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5"
                  >
                    <Phone size={13} className="text-blue-600" />
                    Teléfono
                  </label>
                  <input
                    id="edit-tel"
                    type="tel"
                    value={telefonoInput}
                    onChange={(e) => {
                      setTelefonoInput(e.target.value)
                      if (errores.telefono) setErrores((p) => ({ ...p, telefono: undefined }))
                    }}
                    placeholder="999 888 777"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  {errores.telefono && (
                    <p className="m-0 mt-1 text-[11px] font-semibold text-red-600">
                      {errores.telefono}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="edit-fecha"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5"
                  >
                    <Calendar size={13} className="text-blue-600" />
                    Fecha de Nacimiento
                  </label>
                  <input
                    id="edit-fecha"
                    type="date"
                    value={fechaInput}
                    onChange={(e) => setFechaInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Pie fijo con acciones */}
        <div className="bg-white border-t border-slate-100 px-4 py-3.5 shrink-0">
          {!isEditing ? (
            <div className="flex flex-col gap-2">
              <button
                id="btn-editar-datos"
                type="button"
                onClick={handleEnterEdit}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-blue-600 bg-white hover:bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Edit3 size={15} />
                Editar Datos
              </button>

              <button
                id="btn-cerrar-sesion"
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut size={15} />
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="btn-cancelar-edicion"
                type="button"
                onClick={handleCancelEdit}
                className="py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                id="btn-guardar-cambios"
                type="submit"
                form="form-mi-perfil"
                className="py-2.5 px-4 rounded-xl border-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm cursor-pointer transition-colors shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TarjetaDatoPerfil({
  icono,
  label,
  valor,
}: {
  icono: React.ReactNode
  label: string
  valor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/75 px-3.5 py-2.5 flex items-center gap-3 shadow-2xs">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        {icono}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </div>
        <div className="text-[13px] font-bold text-slate-800 truncate mt-0.5">
          {valor || '—'}
        </div>
      </div>
    </div>
  )
}
