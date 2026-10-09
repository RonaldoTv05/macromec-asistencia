import { useState } from 'react'
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Edit3,
  Search,
  X,
  Plus,
  Key,
  Smartphone,
  Wifi,
  FolderOpen,
  FileText,
  Check,
  Download,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore, enviarCredencialesWhatsApp } from '../store/useAppStore'
import type { EstadoLaboral, Practicante, RetiroData, User, Postulante } from '../types'

// ── Sanitización ───────────────────────────────────────────────
function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// ── Badge de estado laboral ────────────────────────────────────
function BadgeEstado({ estado }: { estado: EstadoLaboral }) {
  if (estado === 'retirado') {
    return (
      <span className="bg-slate-200 text-slate-500 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
        RETIRADO
      </span>
    )
  }
  return (
    <span className="bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
      ACTIVO
    </span>
  )
}

// ── Tarjeta de colaborador ─────────────────────────────────────
function TarjetaColaborador({
  practicante,
  onEditarEstado,
  onClick,
}: {
  practicante: Practicante
  onEditarEstado: (p: Practicante) => void
  onClick: (p: Practicante) => void
}) {
  const isRetirado = practicante.estadoLaboral === 'retirado'
  const docsSubidos = Object.values(practicante.documentos || {}).filter(Boolean).length

  return (
    <div
      onClick={() => onClick(practicante)}
      className={`rounded-[14px] p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all duration-200 border ${isRetirado ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}
    >
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 ${isRetirado ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-br from-blue-900 to-blue-600 text-white'}`}>
        {practicante.nombre[0]}
        {practicante.apellido?.[0] || ''}
      </div>

      {/* Datos */}
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-bold mb-0.5 truncate ${isRetirado ? 'text-slate-400' : 'text-slate-800'}`}>
          {practicante.nombre} {practicante.apellido}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <BadgeEstado estado={practicante.estadoLaboral} />
            <span className="text-[10px] text-slate-400 capitalize">
              {practicante.modalidadBase}
            </span>
          </div>

          {/* Badge Expediente */}
          {docsSubidos === 5 ? (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Expediente Completo</span>
          ) : (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Doc: {docsSubidos}/5</span>
          )}
        </div>

        {/* Info de retiro */}
        {isRetirado && practicante.retiro && (
          <div className="text-[10px] text-slate-500 mt-1 italic">
            Indefinido · {practicante.retiro.motivo.slice(0, 30)}…
          </div>
        )}
      </div>

      {/* Botón editar */}
      <button
        id={`btn-editar-estado-${practicante.id}`}
        onClick={(e) => { e.stopPropagation(); onEditarEstado(practicante); }}
        className="bg-slate-100 border-none rounded-[10px] px-2.5 py-2 cursor-pointer flex items-center gap-1 text-[11px] font-bold text-blue-900 shrink-0"
      >
        <Edit3 size={13} />
        Editar
      </button>
    </div>
  )
}

// ── Tarjeta de Supervisor ─────────────────────────────────────
function TarjetaSupervisor({ supervisor, onEditar }: { supervisor: any, onEditar: (s: any) => void }) {
  const isRetirado = supervisor.estado === 'Retirado' || supervisor.estado === 'Suspendido'

  const handleCredencialesWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const numeroLimpio = supervisor.celular?.replace(/\D/g, '') || supervisor.tel?.replace(/\D/g, '') || '';
    const numeroFinal = numeroLimpio.startsWith('51') ? numeroLimpio : `51${numeroLimpio}`;
    const mensaje = `Hola ${supervisor.nombre}, tu acceso al Sistema MACROMEC es. Usuario: ${supervisor.dni} Clave: ${supervisor.dni}`;
    window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <div className={`rounded-[14px] p-3 flex items-center gap-3 border ${isRetirado ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 ${isRetirado ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-br from-indigo-900 to-indigo-600 text-white'}`}>
        {supervisor.avatarIniciales || supervisor.nombre.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold mb-0.5 flex items-center gap-2">
          <span className={`truncate ${isRetirado ? 'text-slate-500' : 'text-slate-800'}`}>{supervisor.nombre}</span>
          {isRetirado ? (
            <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase">RETIRADO</span>
          ) : (
            <span className="bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase">ACTIVO</span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 mb-0.5">
          DNI: {supervisor.dni} • Cel: {supervisor.celular || supervisor.tel}
        </div>
        <div className="text-[11px] text-slate-400 font-medium truncate">
          {supervisor.area || supervisor.carrera || 'Supervisor'}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={handleCredencialesWhatsapp}
            className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 text-[12px] py-1.5 rounded-lg flex items-center justify-center gap-1 font-semibold"
          >
            <Smartphone size={14} />
            Credenciales
          </button>
          <button
            onClick={() => onEditar(supervisor)}
            className="flex-1 border border-slate-200 text-slate-600 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[12px] font-semibold hover:bg-slate-50"
          >
            <Edit3 size={14} />
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de Registro Supervisor ───────────────────────────────
function ModalRegistroSupervisor({
  onCerrar,
}: {
  onCerrar: () => void
}) {
  const addUsuario = useAppStore((s) => s.addUsuario)
  const [nombre, setNombre] = useState('')
  const [dni, setDni] = useState('')
  const [tel, setTel] = useState('')
  const [cargo, setCargo] = useState('')
  const [correoGmail, setCorreoGmail] = useState('')

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !dni.trim() || !tel.trim() || !cargo.trim() || !correoGmail.trim()) {
      toast.error('Todos los campos son obligatorios')
      return
    }

    const pass = Math.random().toString(36).slice(-6)

    const newSupervisor = {
      id: `usr-sup-${Date.now()}`,
      username: dni.trim(),
      password: pass,
      nombre: sanitize(nombre),
      rol: 'SUPERVISOR',
      email: `${dni.trim()}@macromec.pe`,
      correoGmail: sanitize(correoGmail),
      dni: sanitize(dni),
      tel: sanitize(tel),
      carrera: sanitize(cargo),
      avatarIniciales: nombre.trim().slice(0, 2).toUpperCase()
    } as any

    addUsuario(newSupervisor)

    toast.promise(
      enviarCredencialesWhatsApp(newSupervisor.tel, newSupervisor.nombre, pass, newSupervisor.rol),
      {
        loading: 'Enviando WhatsApp...',
        success: 'Credenciales enviadas',
        error: 'Error'
      }
    )

    onCerrar()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/55 z-[100] backdrop-blur-[4px]" onClick={onCerrar} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-[20px] px-5 pt-6 pb-8 z-[110]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-bold text-[18px] text-slate-800">
            Nuevo Supervisor
          </div>
          <button onClick={onCerrar} className="bg-slate-100 border-none rounded-full w-8 h-8 flex items-center justify-center text-slate-500 cursor-pointer">
            <X size={17} />
          </button>
        </div>
        <form onSubmit={handleGuardar} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Nombres y Apellidos</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] bg-white outline-none focus:border-slate-400" placeholder="Ej. Juan Pérez" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">DNI</label>
            <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] bg-white outline-none focus:border-slate-400" placeholder="8 dígitos" maxLength={8} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">N° de Celular</label>
            <input type="text" value={tel} onChange={(e) => setTel(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] bg-white outline-none focus:border-slate-400" placeholder="Ej. +51 999 888 777" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Área / Carreras a cargo</label>
            <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] bg-white outline-none focus:border-slate-400" placeholder="Ej. Mantenimiento / Electricidad Industrial" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Correo de Gmail</label>
            <input type="email" value={correoGmail} onChange={(e) => setCorreoGmail(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] bg-white outline-none focus:border-slate-400" placeholder="ej.correo@gmail.com" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 border-none cursor-pointer text-white font-bold py-3.5 rounded-xl mt-2 text-[14px]">
            Guardar Supervisor
          </button>
        </form>
      </div>
    </>
  )
}

// ── Modal de edición de estado laboral ────────────────────────

type EstadoFormType = 'activo' | 'retirado'

interface ModalEdicionState {
  open: boolean
  practicante: Practicante | null
}

function ModalEdicionEstado({
  state,
  onCerrar,
}: {
  state: ModalEdicionState
  onCerrar: () => void
}) {
  const setEstadoLaboral = useAppStore((s) => s.setEstadoLaboral)
  const p = state.practicante

  const [estadoSeleccionado, setEstadoSeleccionado] =
    useState<EstadoFormType>(
      (p?.estadoLaboral as EstadoFormType) ?? 'activo',
    )

  // Retiro
  const [motivoRetiro, setMotivoRetiro] = useState(
    p?.retiro?.motivo ?? '',
  )

  if (!p) return null

  const handleGuardar = () => {
    if (estadoSeleccionado === 'retirado') {
      if (!motivoRetiro.trim()) {
        toast.error('El motivo de retiro es obligatorio')
        return
      }
      const retiro: RetiroData = {
        motivo: sanitize(motivoRetiro),
        fechaInicio: new Date().toISOString().split('T')[0],
      }
      setEstadoLaboral(p.id, 'retirado', { retiro })
      toast.success(
        `🚫 ${p.nombre} ${p.apellido} ha sido retirado — Motivo guardado`,
      )
    } else {
      setEstadoLaboral(p.id, 'activo')
      toast.success(`✅ ${p.nombre} ${p.apellido} restaurado como Activo`)
    }
    onCerrar()
  }

  const opciones: {
    value: EstadoFormType
    label: string
    emoji: string
    desc: string
    bg: string
    border: string
  }[] = [
      {
        value: 'activo',
        label: 'Activo',
        emoji: '✅',
        desc: 'Operatividad normal en el sistema',
        bg: '#f0fdf4',
        border: '#059669',
      },
      {
        value: 'retirado',
        label: 'Retiro',
        emoji: '🚫',
        desc: 'Bloquea operatividad y retira al alumno indefinidamente',
        bg: '#f8fafc',
        border: '#94a3b8',
      },
    ]

  return (
    <>
      {/* Overlay */}
      <div
        id="modal-estado-overlay"
        onClick={onCerrar}
        className="fixed inset-0 bg-black/55 z-[100] backdrop-blur-[4px]"
      />

      {/* Sheet */}
      <div
        id="modal-estado-sheet"
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-[20px] px-5 pt-6 pb-8 z-[110]"
      >
        <div className="flex flex-col h-full max-h-[80vh] overflow-y-auto pr-1">
          {/* Cabecera */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Edit3 size={20} />
              </div>
              <div className="font-bold text-[18px] text-slate-800">
                {p.nombre} {p.apellido}
              </div>
            </div>
            <button
              id="btn-cerrar-modal-estado"
              onClick={onCerrar}
              className="bg-slate-100 border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-slate-500"
            >
              <X size={17} />
            </button>
          </div>

          {/* Opciones de estado */}
          <div className="flex flex-col gap-2.5 my-4">
            {opciones.map((opt) => (
              <button
                key={opt.value}
                id={`opt-estado-${opt.value}`}
                onClick={() => setEstadoSeleccionado(opt.value)}
                className={`w-full text-left p-3.5 rounded-xl border-[1.5px] cursor-pointer flex items-center gap-3 transition-all duration-150 ${estadoSeleccionado === opt.value
                  ? `border-slate-400 bg-slate-50`
                  : 'border-slate-200 bg-white'
                  }`}
              >
                <span className="text-[22px] shrink-0">{opt.emoji}</span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-slate-800">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {opt.desc}
                  </div>
                </div>
                {estadoSeleccionado === opt.value && (
                  <CheckCircle2 size={18} className="text-slate-500 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Formulario extra: Retiro */}
          {estadoSeleccionado === 'retirado' && (
            <div className="bg-slate-50 rounded-xl p-3.5 mb-4 flex flex-col gap-3">
              <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">
                Detalles de Retiro
              </div>

              {/* Motivo obligatorio */}
              <div>
                <label
                  htmlFor="input-motivo-retiro"
                  className="text-[11px] font-bold text-slate-600 block mb-1.5"
                >
                  Motivo *
                </label>
                <textarea
                  id="input-motivo-retiro"
                  value={motivoRetiro}
                  onChange={(e) => setMotivoRetiro(e.target.value)}
                  placeholder="Describe el motivo del retiro…"
                  rows={3}
                  maxLength={300}
                  className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] text-slate-800 resize-none outline-none font-sans bg-white focus:border-slate-400"
                />
              </div>

              {/* Aviso estático */}
              <div className="text-[11px] text-slate-500 italic mt-1">
                Estás retirando al alumno de manera indefinida
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2.5">
            <button
              id="btn-cancelar-modal-estado"
              onClick={onCerrar}
              className="flex-1 py-3.5 bg-slate-100 border-none rounded-xl text-[14px] font-semibold text-slate-500 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-estado"
              className="flex-1 py-3.5 bg-blue-600 border-none rounded-xl text-[14px] font-bold text-white cursor-pointer"
              onClick={handleGuardar}
            >
              Guardar Estado
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function BottomSheetEvaluacion({
  postulante,
  carrera,
  onCerrar
}: {
  postulante: Postulante;
  carrera?: { id: string, nombre: string };
  onCerrar: () => void
}) {
  const updatePostulacion = useAppStore(s => s.updatePostulacion)
  const removePostulacion = useAppStore(s => s.removePostulacion)
  const addPracticante = useAppStore(s => s.addPracticante)
  const monitores = useAppStore(s => s.monitores)
  const carrerasGlobal = useAppStore(s => s.carreras)

  const [observaciones, setObservaciones] = useState(postulante.observaciones)
  const [vistaContratacion, setVistaContratacion] = useState(false)
  const [monitorId, setMonitorId] = useState('')
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual' | 'semipresencial'>('semipresencial')
  const [periodo, setPeriodo] = useState('2026-20')
  const [cicloActual, setCicloActual] = useState(postulante.semestre || 'S5')
  const [carreraIdSeleccionada, setCarreraIdSeleccionada] = useState(postulante.carreraId || '')

  const [edicionHabilitada, setEdicionHabilitada] = useState(false)

  const handleProgramarEntrevista = () => {
    updatePostulacion(postulante.id, { estado: 'entrevistado' })
    toast.success('Estado actualizado a Entrevistado')
  }

  const handleSaveObservaciones = () => {
    updatePostulacion(postulante.id, { observaciones })
    toast.success('Observaciones guardadas')
  }

  const handleRechazar = () => {
    const text = encodeURIComponent(`Hola ${postulante.nombres}, gracias por postular a Macromec. Lamentablemente en esta ocasión...`)
    window.open(`https://wa.me/51${postulante.celular}?text=${text}`, '_blank')
    removePostulacion(postulante.id)
    toast.error('Postulante rechazado y descartado')
    onCerrar()
  }

  const handleContratar = () => {
    if (!monitorId) {
      toast.error('Debes asignar un monitor')
      return
    }

    const passGenerada = Math.random().toString(36).slice(-6)

    const nuevoPracticante: Practicante = {
      id: `prac-${Date.now()}`,
      nombre: postulante.nombres,
      apellido: postulante.apellidos,
      email: postulante.correo,
      fechaNacimiento: postulante.fechaNacimiento || '2000-01-01',
      dni: postulante.dni,
      celular: postulante.celular,
      carrera: 'Especialidad Asignada',
      tel: postulante.celular,
      carreraId: carreraIdSeleccionada,
      semestre: cicloActual,
      monitorId: monitorId,
      modalidadBase: modalidad as 'Presencial' | 'Semipresencial' | 'Virtual',
      horasSemanalesTarget: 30,
      historial: [],
      semanasHojaFisica: [],
      entregaHojaFisica: false,
      almuerzosConfirmados: [],
      estadoLaboral: 'activo',
      fechaIngreso: new Date().toISOString().split('T')[0],
      password: passGenerada,
      hikvisionSync: false,
    }

    addPracticante(nuevoPracticante)
    removePostulacion(postulante.id)

    toast.promise(
      enviarCredencialesWhatsApp(nuevoPracticante.tel || '', nuevoPracticante.nombre, passGenerada, 'PRACTICANTE'),
      {
        loading: 'Enviando WhatsApp...',
        success: 'Credenciales enviadas',
        error: 'Error'
      }
    )

    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCerrar} />
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[20px] p-5 h-[85vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">

        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-[18px] leading-tight">{postulante.nombres} {postulante.apellidos}</h3>
            <span className="text-[12px] text-slate-500 font-medium">DNI: {postulante.dni} • Cel: {postulante.celular}</span>
          </div>
          <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        {!vistaContratacion ? (
          <div className="flex-1 flex flex-col gap-5 overflow-y-auto pb-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1 text-[13px]">
              <span className="text-slate-600"><strong>Carrera:</strong> {carrera?.nombre || 'N/A'}</span>
              <span className="text-slate-600"><strong>Semestre:</strong> {postulante.semestre}</span>
              <span className="text-slate-600"><strong>Correo:</strong> {postulante.correo}</span>
            </div>

            <a
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Entrevista+Prácticas+-+${encodeURIComponent(postulante.nombres)}&details=Postulante+para+${encodeURIComponent(carrera?.nombre || '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={handleProgramarEntrevista}
              className="w-full bg-blue-50 text-blue-700 py-3.5 rounded-xl text-[14px] font-bold flex justify-center items-center gap-2 hover:bg-blue-100 transition-colors"
            >
              <Calendar size={18} /> Programar Entrevista
            </a>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-slate-600 flex items-center justify-between">
                Observaciones de la entrevista
                <button onClick={handleSaveObservaciones} className="text-blue-600 text-[11px]">Guardar</button>
              </label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                onBlur={handleSaveObservaciones}
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                placeholder="Escribe tus notas aquí..."
              />
            </div>

            <div className="mt-auto flex gap-2 pt-2">
              <button
                onClick={handleRechazar}
                className="flex-1 bg-red-50 text-red-600 font-bold py-3.5 rounded-xl flex items-center justify-center gap-1 active:bg-red-100 transition-colors text-[14px]"
              >
                Rechazar
              </button>
              <button
                onClick={() => setVistaContratacion(true)}
                className="flex-[1.5] bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-1 shadow-sm shadow-emerald-500/30 active:bg-emerald-600 transition-colors text-[14px]"
              >
                Aprobar Contratación
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-5 overflow-y-auto pb-6 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 mb-2 relative">
              <h4 className="font-bold text-[14px]">Confirmar Ingreso</h4>
              <p className="text-[12px] opacity-80 mt-0.5">Verifica los datos y asigna modalidad y supervisor.</p>
              <div className="mt-2">
                <span onClick={() => setEdicionHabilitada(!edicionHabilitada)} className="text-blue-600 text-[13px] underline cursor-pointer">
                  {edicionHabilitada ? 'Deshabilitar edición' : 'Habilitar edición de datos base'}
                </span>
              </div>
            </div>

            {/* Resumen Read-Only del postulante (RF-18) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Datos del Postulante</div>
              <span className="text-[13px] text-slate-600"><strong>Nombres:</strong> {postulante.nombres}</span>
              <span className="text-[13px] text-slate-600"><strong>Apellidos:</strong> {postulante.apellidos}</span>
              <span className="text-[13px] text-slate-600"><strong>DNI:</strong> {postulante.dni}</span>
            </div>

            {/* Carrera */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-2 block">Carrera</label>
              <select
                disabled={!edicionHabilitada}
                value={carreraIdSeleccionada}
                onChange={e => setCarreraIdSeleccionada(e.target.value)}
                className={`w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-emerald-500/40 ${!edicionHabilitada ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 text-slate-700'}`}
              >
                {carrerasGlobal.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Periodo de Ingreso */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-2 block">Periodo de Ingreso</label>
              <select
                disabled={!edicionHabilitada}
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
                className={`w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-emerald-500/40 ${!edicionHabilitada ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 text-slate-700'}`}
              >
                <option value="2026-10">2026-10</option>
                <option value="2026-20">2026-20</option>
              </select>
            </div>

            {/* Ciclo Actual */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-2 block">Semestre Actual</label>
              <select
                disabled={!edicionHabilitada}
                value={cicloActual}
                onChange={e => setCicloActual(e.target.value)}
                className={`w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-emerald-500/40 ${!edicionHabilitada ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 text-slate-700'}`}
              >
                <option value="S4">S4</option>
                <option value="S5">S5</option>
                <option value="S6">S6</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-2 block">Asignar Monitor (Supervisor)</label>
              <select
                value={monitorId}
                onChange={e => setMonitorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[14px] text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="">-- Seleccionar --</option>
                {monitores.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-2 block">Modalidad Base</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setModalidad('presencial')}
                  className={`text-[12px] sm:text-[13px] font-bold py-2.5 rounded-xl transition-all text-center leading-tight ${modalidad === 'presencial'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  Presencial
                </button>
                <button
                  type="button"
                  onClick={() => setModalidad('semipresencial')}
                  className={`text-[12px] sm:text-[13px] font-bold py-2.5 rounded-xl transition-all text-center leading-tight ${modalidad === 'semipresencial'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  Semipresencial
                </button>
                <button
                  type="button"
                  onClick={() => setModalidad('virtual')}
                  className={`text-[12px] sm:text-[13px] font-bold py-2.5 rounded-xl transition-all text-center leading-tight ${modalidad === 'virtual'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  Virtual
                </button>
              </div>
            </div>

            <div className="mt-auto pt-2 flex gap-2">
              <button
                onClick={() => setVistaContratacion(false)}
                className="bg-slate-100 text-slate-600 font-bold py-3.5 px-4 rounded-xl active:bg-slate-200 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleContratar}
                className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-md shadow-emerald-600/30 active:scale-[0.98] transition-all text-[15px] flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Registrar Practicante
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BottomSheetPracticante({
  practicante,
  onCerrar,
}: {
  practicante: Practicante
  onCerrar: () => void
}) {
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [isSyncingHikvision, setIsSyncingHikvision] = useState(false);

  const handleReenviarCredenciales = () => {
    setIsSendingWhatsapp(true);

    // Limpiar el número de teléfono (quitar espacios, '+' y asegurar que sea válido)
    const numeroLimpio = practicante.tel?.replace(/\D/g, '') || '';
    const numeroFinal = numeroLimpio.startsWith('51') ? numeroLimpio : `51${numeroLimpio}`;

    // Armar el mensaje dinámico
    const mensaje = `Hola ${practicante.nombre}, tu acceso al Sistema de Asistencia MACROMEC es. Usuario: ${practicante.dni} Clave: ${practicante.dni}`;
    const mensajeEncodeado = encodeURIComponent(mensaje);

    // URL universal de WhatsApp
    const whatsappUrl = `https://wa.me/${numeroFinal}?text=${mensajeEncodeado}`;

    // Pequeña pausa visual antes de abrir la pestaña
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
      setIsSendingWhatsapp(false);
    }, 800);
  };

  const handleSincronizarHikvision = async () => {
    setIsSyncingHikvision(true);
    try {
      // Futuro endpoint NestJS -> Python ISAPI Recolector
      // await axios.post('/api/hikvision/forzar-sincronizacion');
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Marcaciones sincronizadas con el terminal Hikvision');
    } catch (error) {
      alert('Error al conectar con el terminal en la red local');
    } finally {
      setIsSyncingHikvision(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCerrar} />
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[20px] p-5 h-auto max-h-[85vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">

        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-[18px] leading-tight">{practicante.nombre} {practicante.apellido}</h3>
            <span className="text-[12px] text-slate-500 font-medium">DNI: {practicante.dni} • Cel: {practicante.tel}</span>
          </div>
          <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="mb-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Gestión de Acceso y Credenciales</span>
            <button
              onClick={handleReenviarCredenciales}
              disabled={isSendingWhatsapp}
              className="w-full h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isSendingWhatsapp ? 'Conectando con Evolution API...' : '📱 Reenviar Credenciales por WhatsApp'}
            </button>
          </div>

          <div className="mb-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Control de Asistencia Biométrico</span>
            <button
              onClick={handleSincronizarHikvision}
              disabled={isSyncingHikvision}
              className="w-full h-12 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isSyncingHikvision ? 'Consultando ISAPI...' : '📡 Sincronizar Hikvision API'}
            </button>
            <p className="text-[10px] text-slate-400 mt-2 leading-tight">
              El sistema sincroniza automáticamente cada 5 minutos. Usa este botón solo para forzar una extracción manual inmediata.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <FolderOpen size={15} /> REVISIÓN DE EXPEDIENTE
            </h4>
            <div className="flex flex-col gap-2.5">
              {[
                { key: 'cartaPresentacion', label: 'Carta de Presentación' },
                { key: 'evidenciaFormulario', label: 'Evidencia de Formulario' },
                { key: 'cartaAceptacionFirmada', label: 'Carta de Aceptación' },
                { key: 'convenioFirmado', label: 'Convenio Firmado' },
                { key: 'registroVinculacion', label: 'Registro de Vinculación' },
              ].map(doc => {
                const docValue = (practicante.documentos as any)?.[doc.key]
                return (
                  <div key={doc.key} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {docValue ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check size={12} className="text-emerald-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <XCircle size={12} className="text-red-500" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-slate-700 truncate">{doc.label}</span>
                        {docValue ? (
                          <span className="text-[10px] text-slate-400 truncate" title={docValue}>{docValue}</span>
                        ) : (
                          <span className="text-[10px] text-red-400">Falta entregar</span>
                        )}
                      </div>
                    </div>
                    {docValue && (
                      <button
                        onClick={() => toast.success(`Descargando ${docValue}...`)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Descargar Archivo"
                      >
                        <Download size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function BottomSheetSupervisor({
  supervisor,
  onCerrar,
}: {
  supervisor: any
  onCerrar: () => void
}) {
  const practicantes = useAppStore(s => s.practicantes);
  const asignarMonitor = useAppStore(s => s.asignarMonitor);
  const removerMonitor = useAppStore(s => s.removerMonitor);
  const cambiarEstadoSupervisor = useAppStore(s => s.cambiarEstadoSupervisor);

  const [estado, setEstado] = useState(supervisor.estado || 'Activo');
  const [motivo, setMotivo] = useState(supervisor.motivoSuspension || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);

  const practicantesActuales = practicantes.filter(p => p.monitorId === supervisor.id);
  const practicantesLibres = practicantes.filter(p => !p.monitorId || p.monitorId === null);

  const handleGuardarEstado = async () => {
    setIsUpdating(true);
    await new Promise(r => setTimeout(r, 800));
    cambiarEstadoSupervisor(supervisor.id, estado, motivo);
    toast.success('Estado del supervisor actualizado');
    setIsUpdating(false);
    onCerrar();
  };

  const handleRemover = async (practicanteId: string) => {
    setIsAssigning(practicanteId);
    await new Promise(r => setTimeout(r, 600));
    removerMonitor(practicanteId);
    toast.success('Practicante removido del cargo');
    setIsAssigning(null);
  };

  const handleAsignar = async (practicanteId: string) => {
    setIsAssigning(practicanteId);
    await new Promise(r => setTimeout(r, 600));
    asignarMonitor(practicanteId, supervisor.id);
    toast.success('Practicante asignado exitosamente');
    setIsAssigning(null);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCerrar} />
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[20px] p-5 h-auto max-h-[85vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">

        <div className="flex items-center justify-between mb-5 shrink-0 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-[18px] leading-tight">{supervisor.nombre}</h3>
            <span className="text-[12px] text-slate-500 font-medium">{supervisor.area || supervisor.carrera || 'Supervisor'}</span>
          </div>
          <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        {/* BLOQUE A: ESTADO DEL SUPERVISOR */}
        <div className="mb-6">
          <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-3">Estado del Supervisor</h4>
          <div className="flex gap-3 mb-3">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${estado === 'Activo' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <input type="radio" name="estado" value="Activo" checked={estado === 'Activo'} onChange={() => setEstado('Activo')} className="hidden" />
              <span className={`text-[14px] font-bold ${estado === 'Activo' ? 'text-emerald-700' : 'text-slate-500'}`}>Activo</span>
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${estado === 'Suspendido' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'}`}>
              <input type="radio" name="estado" value="Suspendido" checked={estado === 'Suspendido'} onChange={() => setEstado('Suspendido')} className="hidden" />
              <span className={`text-[14px] font-bold ${estado === 'Suspendido' ? 'text-red-700' : 'text-slate-500'}`}>Suspender</span>
            </label>
          </div>

          {estado === 'Suspendido' && (
            <div className="mt-3 mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
              <label className="text-xs font-bold text-red-700 uppercase mb-1 block">Motivo de Suspensión</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Inactividad, fin de contrato..."
                className="w-full text-sm p-2 rounded border border-red-200 outline-none focus:ring-2 focus:ring-red-400 bg-white"
                rows={2}
              />
            </div>
          )}

          <button onClick={handleGuardarEstado} disabled={isUpdating} className="w-full bg-slate-800 text-white font-bold h-12 rounded-xl text-[14px] disabled:opacity-70 transition-all flex items-center justify-center mt-2">
            {isUpdating ? 'Guardando en Base de Datos...' : 'Guardar Estado'}
          </button>
        </div>

        {/* BLOQUE B: GESTIÓN DE PRACTICANTES A CARGO */}
        <div>
          <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-3">Gestión de Practicantes</h4>

          <div className="mb-4">
            <h5 className="text-[11px] font-bold text-slate-400 mb-2">Practicantes Actuales ({practicantesActuales.length})</h5>
            <div className="flex flex-col gap-2">
              {practicantesActuales.length === 0 && <div className="text-[12px] text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">Sin practicantes a cargo</div>}
              {practicantesActuales.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[12px] font-bold shrink-0">
                      {p.nombre[0]}{p.apellido?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-slate-700 truncate">{p.nombre} {p.apellido}</div>
                      <div className="text-[10px] text-slate-400 truncate">{p.carreraId}</div>
                    </div>
                  </div>
                  <button onClick={() => handleRemover(p.id)} disabled={isAssigning === p.id} className="bg-red-50 text-red-600 p-1.5 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-[11px] font-bold text-slate-400 mb-2">Asignar Nuevo Practicante (Libres: {practicantesLibres.length})</h5>
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {practicantesLibres.length === 0 && <div className="text-[12px] text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">No hay practicantes libres</div>}
              {practicantesLibres.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[12px] font-bold shrink-0">
                      {p.nombre[0]}{p.apellido?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-slate-600 truncate">{p.nombre} {p.apellido}</div>
                      <div className="text-[10px] text-slate-400 truncate">{p.carreraId}</div>
                    </div>
                  </div>
                  <button onClick={() => handleAsignar(p.id)} disabled={isAssigning === p.id} className="bg-blue-100 text-blue-600 text-[11px] font-bold px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 shrink-0">
                    {isAssigning === p.id ? '...' : 'Añadir'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// ============================================================
// ADMIN MÓDULO — Gestión de Personal (solo GERENCIA)
// ============================================================

export default function AdminModuloScreen() {
  const practicantes = useAppStore((s) => s.practicantes)
  const usuariosSistema = useAppStore((s) => s.usuariosSistema)
  const postulaciones = useAppStore((s) => s.postulaciones)
  const carreras = useAppStore((s) => s.carreras)
  const addPostulacion = useAppStore((s) => s.addPostulacion)

  const [vistaActiva, setVistaActiva] = useState<'postulantes' | 'practicantes' | 'supervisores'>('postulantes')
  const [modalSupervisorOpen, setModalSupervisorOpen] = useState(false)
  const [supervisorActivo, setSupervisorActivo] = useState<any>(null)
  const [postulanteActivo, setPostulanteActivo] = useState<Postulante | null>(null)
  const [practicanteActivo, setPracticanteActivo] = useState<Practicante | null>(null)
  const [query, setQuery] = useState('')
  const [ordenAscendente, setOrdenAscendente] = useState(true)
  const [modalEdicion, setModalEdicion] = useState<ModalEdicionState>({
    open: false,
    practicante: null,
  })

  const handleSimularPostulacion = () => {
    const carreraId = carreras.length > 0 ? carreras[0].id : 'carrera-default'
    const nuevoPostulante: Postulante = {
      id: `postulante-${Date.now()}`,
      nombres: "Carlos Daniel",
      apellidos: "Pérez Gómez",
      dni: "74839201",
      celular: "987654321",
      correo: "carlos.perez@senati.pe",
      carreraId: carreraId,
      semestre: "S5",
      fechaPostulacion: new Date().toISOString(),
      estado: 'pendiente',
      observaciones: ""
    }
    addPostulacion(nuevoPostulante)
    toast.success('Postulante de prueba generado')
  }

  // Filtrar Practicantes
  const filtradosPracticantes = practicantes
    .filter((p) => {
      const texto = `${p.nombre} ${p.apellido} ${p.dni ?? ''}`.toLowerCase()
      return texto.includes(query.toLowerCase())
    })
    .sort((a, b) => {
      const nameA = `${a.nombre} ${a.apellido}`
      const nameB = `${b.nombre} ${b.apellido}`
      return ordenAscendente
        ? nameA.localeCompare(nameB, 'es')
        : nameB.localeCompare(nameA, 'es')
    })

  // Filtrar Supervisores (leyendo directamente de Monitores en lugar de usuariosSistema)
  const supervisores = useAppStore((s) => s.monitores || [])
  const filtradosSupervisores = supervisores
    .filter((u) => {
      const texto = `${u.nombre} ${u.dni ?? ''}`.toLowerCase()
      return texto.includes(query.toLowerCase())
    })
    .sort((a, b) => {
      return ordenAscendente
        ? a.nombre.localeCompare(b.nombre, 'es')
        : b.nombre.localeCompare(a.nombre, 'es')
    })

  const totalActivos = practicantes.filter(
    (p) => p.estadoLaboral === 'activo',
  ).length
  const totalRetirados = practicantes.filter(
    (p) => p.estadoLaboral === 'retirado',
  ).length

  return (
    <div className="flex flex-col gap-3 pb-8">
      <div className="font-bold text-[14px] text-slate-900">
        ⚙️ Admin — Gestión de Personal
      </div>

      {/* FASE 1: Toggle Vistas */}
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1 mb-2">
        <button
          onClick={() => { setVistaActiva('postulantes'); setQuery('') }}
          className={`flex-1 border-none cursor-pointer py-2 text-[13px] font-bold rounded-lg transition-all ${vistaActiva === 'postulantes'
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-500 bg-transparent'
            }`}
        >
          Postulantes
        </button>
        <button
          onClick={() => { setVistaActiva('practicantes'); setQuery('') }}
          className={`flex-1 border-none cursor-pointer py-2 text-[13px] font-bold rounded-lg transition-all ${vistaActiva === 'practicantes'
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-500 bg-transparent'
            }`}
        >
          Practicantes
        </button>
        <button
          onClick={() => { setVistaActiva('supervisores'); setQuery('') }}
          className={`flex-1 border-none cursor-pointer py-2 text-[13px] font-bold rounded-lg transition-all ${vistaActiva === 'supervisores'
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-500 bg-transparent'
            }`}
        >
          Supervisores
        </button>
      </div>

      {vistaActiva === 'postulantes' ? (
        <div className="flex flex-col gap-2">
          {postulaciones.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-[13px] flex flex-col items-center gap-3">
              <p>No hay postulaciones pendientes.</p>
              <button
                onClick={handleSimularPostulacion}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-[13px] hover:bg-blue-100 transition-colors"
              >
                + Simular Postulación de Prueba
              </button>
            </div>
          ) : (
            postulaciones.map(p => {
              const carrera = carreras.find(c => c.id === p.carreraId)
              return (
                <div
                  key={p.id}
                  onClick={() => setPostulanteActivo(p)}
                  className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 border-l-4 border-l-amber-400 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex flex-col pr-2">
                    <span className="font-bold text-[13px] text-slate-800">{p.nombres} {p.apellidos}</span>
                    <span className="text-[11px] text-slate-500 truncate">{carrera?.nombre || 'Carrera Desconocida'} ({p.semestre})</span>
                  </div>
                  <div className="shrink-0">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${p.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {p.estado === 'pendiente' ? 'Pendiente' : 'Entrevistado'}
                    </span>
                  </div>
                </div>
              )
            })
          )}

          {postulaciones.length > 0 && (
            <div className="flex justify-center mt-2">
              <button
                onClick={handleSimularPostulacion}
                className="text-blue-500 font-bold text-[12px] bg-slate-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
              >
                + Simular Postulación de Prueba
              </button>
            </div>
          )}

          {postulanteActivo && (
            <BottomSheetEvaluacion
              postulante={postulanteActivo}
              carrera={carreras.find(c => c.id === postulanteActivo.carreraId)}
              onCerrar={() => setPostulanteActivo(null)}
            />
          )}
        </div>
      ) : vistaActiva === 'practicantes' ? (
        <>
          {/* Resumen rápido */}
          <div className="flex gap-2">
            <div className="flex-1 bg-emerald-100 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-emerald-800 font-bold uppercase">
                Activos
              </div>
              <div className="text-[22px] font-extrabold text-emerald-600 mt-1">
                {totalActivos}
              </div>
            </div>
            <div className="flex-1 bg-slate-100 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">
                Retirados
              </div>
              <div className="text-[22px] font-extrabold text-slate-500 mt-1">
                {totalRetirados}
              </div>
            </div>
          </div>

          {/* Buscador + Ordenar */}
          <div className="flex gap-2.5">
            <div className="flex-1 relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="input-buscar-admin"
                type="text"
                placeholder="Nombre, apellido o DNI…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] outline-none bg-white focus:border-slate-400"
              />
            </div>
            <button
              id="btn-toggle-orden"
              onClick={() => setOrdenAscendente((v) => !v)}
              title={ordenAscendente ? 'Ordenar Z–A' : 'Ordenar A–Z'}
              className="bg-white border-[1.5px] border-slate-200 rounded-xl px-3.5 cursor-pointer flex items-center gap-1.5 text-[12px] font-bold text-blue-900 shrink-0"
            >
              <ArrowUpDown size={15} />
              {ordenAscendente ? 'A–Z' : 'Z–A'}
            </button>
          </div>

          {/* Contador de resultados */}
          <div className="text-[12px] text-slate-400 pl-0.5">
            {filtradosPracticantes.length} colaborador{filtradosPracticantes.length !== 1 ? 'es' : ''}{' '}
            encontrado{filtradosPracticantes.length !== 1 ? 's' : ''}
          </div>

          {/* Lista de colaboradores */}
          {filtradosPracticantes.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-[13px]">
              Sin resultados para "{query}"
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtradosPracticantes.map((p) => (
                <TarjetaColaborador
                  key={p.id}
                  practicante={p}
                  onEditarEstado={(pr) =>
                    setModalEdicion({ open: true, practicante: pr })
                  }
                  onClick={(pr) => setPracticanteActivo(pr)}
                />
              ))}
            </div>
          )}

          {/* Modal edición */}
          {modalEdicion.open && (
            <ModalEdicionEstado
              state={modalEdicion}
              onCerrar={() =>
                setModalEdicion({ open: false, practicante: null })
              }
            />
          )}

          {/* BottomSheet Practicante */}
          {practicanteActivo && (
            <BottomSheetPracticante
              practicante={practicanteActivo}
              onCerrar={() => setPracticanteActivo(null)}
            />
          )}
        </>
      ) : (
        <>
          {/* Vista Supervisores */}

          {/* Buscador + Ordenar */}
          <div className="flex gap-2.5">
            <div className="flex-1 relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Nombre o DNI…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] outline-none bg-white focus:border-slate-400"
              />
            </div>
            <button
              onClick={() => setOrdenAscendente((v) => !v)}
              title={ordenAscendente ? 'Ordenar Z–A' : 'Ordenar A–Z'}
              className="bg-white border-[1.5px] border-slate-200 rounded-xl px-3.5 cursor-pointer flex items-center gap-1.5 text-[12px] font-bold text-blue-900 shrink-0"
            >
              <ArrowUpDown size={15} />
              {ordenAscendente ? 'A–Z' : 'Z–A'}
            </button>
          </div>

          <div className="text-[12px] text-slate-400 pl-0.5">
            {filtradosSupervisores.length} supervisor{filtradosSupervisores.length !== 1 ? 'es' : ''}{' '}
            encontrado{filtradosSupervisores.length !== 1 ? 's' : ''}
          </div>

          {filtradosSupervisores.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-[13px]">
              Sin resultados para "{query}"
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtradosSupervisores.map((sup) => (
                <TarjetaSupervisor key={sup.id} supervisor={sup} onEditar={(s) => setSupervisorActivo(s)} />
              ))}
            </div>
          )}

          {supervisorActivo && (
            <BottomSheetSupervisor
              supervisor={supervisorActivo}
              onCerrar={() => setSupervisorActivo(null)}
            />
          )}

          <button
            onClick={() => setModalSupervisorOpen(true)}
            className="w-full mt-4 bg-indigo-600 border-none cursor-pointer text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-bold text-[14px]"
          >
            <Plus size={18} />
            Registrar Nuevo Supervisor
          </button>

          {modalSupervisorOpen && (
            <ModalRegistroSupervisor onCerrar={() => setModalSupervisorOpen(false)} />
          )}
        </>
      )}
    </div>
  )
}
