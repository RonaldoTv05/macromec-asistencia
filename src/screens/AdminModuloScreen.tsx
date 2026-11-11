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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  History,
  Lock,
  UserCog,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  abrirWhatsAppCredenciales,
  enviarCredencialesWhatsApp,
  useAppStore,
} from '../store/useAppStore'
import ModalAdminEditarUsuario from '../components/ModalAdminEditarUsuario'
import ModalNuevoSupervisor from '../components/ModalNuevoSupervisor'
import {
  esSupervisorSuspendido,
  getPeriodoContext,
  perteneceAPeriodo,
} from '../utils/periodoHelpers'
import type {
  EstadoGlobalPracticante,
  EstadoLaboral,
  Practicante,
  RetiroData,
  TipoUsuarioPerfil,
  User,
  Postulante,
} from '../types'

// ── Sanitización ───────────────────────────────────────────────
function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// ── Badge de estado global / laboral ───────────────────────────
function BadgeEstado({
  estado,
  estadoGlobal,
}: {
  estado: EstadoLaboral
  estadoGlobal?: EstadoGlobalPracticante
}) {
  const code: EstadoGlobalPracticante =
    estadoGlobal || (estado === 'retirado' ? 'RETIRADO' : 'ACTIVO')

  if (code === 'RETIRADO') {
    return (
      <span className="bg-red-100 text-red-700 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
        RETIRADO
      </span>
    )
  }
  if (code === 'EGRESADO') {
    return (
      <span className="bg-purple-100 text-purple-800 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
        EGRESADO
      </span>
    )
  }
  if (code === 'BAJA') {
    return (
      <span className="bg-rose-100 text-rose-800 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
        BAJA
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
  supervisorSuspendido = false,
  readOnly = false,
  onEditarEstado,
  onClick,
}: {
  practicante: Practicante
  supervisorSuspendido?: boolean
  readOnly?: boolean
  onEditarEstado: (p: Practicante) => void
  onClick: (p: Practicante) => void
}) {
  const isRetirado =
    (practicante.estadoGlobal && practicante.estadoGlobal !== 'ACTIVO') ||
    practicante.estadoLaboral === 'retirado'
  const docsSubidos = [
    practicante.documentos?.cartaPresentacion,
    practicante.documentos?.evidenciaFormulario,
    practicante.documentos?.cartaAceptacionFirmada,
    practicante.documentos?.convenioFirmado,
    practicante.documentos?.registroVinculacion,
  ].filter(Boolean).length

  return (
    <div
      onClick={() => onClick(practicante)}
      className={`rounded-[14px] p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all duration-200 border ${isRetirado ? 'bg-slate-50 border-slate-200 opacity-85' : supervisorSuspendido ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}
    >
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 ${isRetirado ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-br from-blue-900 to-blue-600 text-white'}`}>
        {practicante.nombre[0]}
        {practicante.apellido?.[0] || ''}
      </div>

      {/* Datos */}
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-bold mb-0.5 truncate ${isRetirado ? 'text-slate-600' : 'text-slate-800'}`}>
          {practicante.nombre} {practicante.apellido}
        </div>
        <div className="text-[11px] text-slate-400 truncate font-medium">
          {practicante.carrera} - {practicante.semestre}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <BadgeEstado
              estado={practicante.estadoLaboral}
              estadoGlobal={practicante.estadoGlobal}
            />
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

        {/* Alerta de Supervisor Suspendido */}
        {supervisorSuspendido && !isRetirado && (
          <div className="mt-1.5 inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg px-2 py-0.5 text-[10px] font-extrabold">
            <AlertTriangle size={11} className="shrink-0 text-amber-700" />
            <span>Supervisor Suspendido - Requiere Reasignación</span>
          </div>
        )}

        {/* Info de retiro / baja / egreso */}
        {isRetirado && (practicante.motivoRetiro || practicante.retiro?.motivo) && (
          <div className="text-[10px] text-slate-500 mt-1 italic truncate">
            {(practicante.motivoRetiro || practicante.retiro?.motivo || '').slice(0, 48)}
          </div>
        )}
      </div>

      {/* Botón editar */}
      <button
        id={`btn-editar-estado-${practicante.id}`}
        type="button"
        disabled={readOnly}
        onClick={(e) => {
          e.stopPropagation()
          if (!readOnly) onEditarEstado(practicante)
        }}
        className={`border-none rounded-[10px] px-2.5 py-2 flex items-center gap-1 text-[11px] font-bold shrink-0 ${readOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' : 'bg-slate-100 cursor-pointer text-blue-900'}`}
      >
        <Edit3 size={13} />
        Editar
      </button>
    </div>
  )
}

// ── Tarjeta de Supervisor ─────────────────────────────────────
function TarjetaSupervisor({
  supervisor,
  readOnly = false,
  onEditar,
  onGestionar,
}: {
  supervisor: any
  readOnly?: boolean
  onEditar: (s: any) => void
  onGestionar: (s: any) => void
}) {
  const esSuspendido = esSupervisorSuspendido(supervisor)
  const isRetirado = supervisor.estado === 'Retirado'
  const inactivo = esSuspendido || isRetirado

  const handleCredencialesWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const usuarioLive = useAppStore.getState().getUsuarioById(supervisor.id);
    if (!usuarioLive) {
      toast.error('No se encontraron credenciales activas para este supervisor');
      return;
    }
    abrirWhatsAppCredenciales(usuarioLive);
  };

  return (
    <div
      onClick={() => onGestionar(supervisor)}
      className={`rounded-[14px] p-3 flex items-center gap-3 border cursor-pointer transition-colors ${inactivo ? 'bg-amber-50/40 border-amber-200 opacity-85' : 'bg-white border-slate-200 hover:bg-slate-50/50'}`}
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 ${inactivo ? 'bg-slate-300 text-slate-600' : 'bg-gradient-to-br from-indigo-900 to-indigo-600 text-white'}`}>
        {supervisor.avatarIniciales || supervisor.nombre.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold mb-0.5 flex items-center gap-2">
          <span className={`truncate ${inactivo ? 'text-slate-600' : 'text-slate-800'}`}>{supervisor.nombre}</span>
          {esSuspendido ? (
            <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase">SUSPENDIDO</span>
          ) : isRetirado ? (
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
            id={`btn-credenciales-supervisor-${supervisor.id}`}
            type="button"
            onClick={handleCredencialesWhatsapp}
            className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-semibold cursor-pointer border-none"
          >
            <Smartphone size={13} />
            Credenciales
          </button>
          <button
            id={`btn-gestionar-supervisor-${supervisor.id}`}
            type="button"
            disabled={readOnly}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly) onGestionar(supervisor);
            }}
            className={`flex-1 border border-indigo-200 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold ${readOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 cursor-pointer'}`}
          >
            <UserCog size={13} />
            Gestionar
          </button>
          <button
            id={`btn-editar-supervisor-${supervisor.id}`}
            type="button"
            disabled={readOnly}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly) onEditar(supervisor);
            }}
            className={`border border-slate-200 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold shrink-0 ${readOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50 cursor-pointer bg-white'}`}
          >
            <Edit3 size={13} />
            Editar
          </button>
        </div>
      </div>
    </div>
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
  const getPeriodoActivo = useAppStore(s => s.getPeriodoActivo)
  const getEspecialistaAsignado = useAppStore(s => s.getEspecialistaAsignado)

  const periodoActivo = getPeriodoActivo() || { id: 'per-2026-02', nombre: '2026-02', estado: 'activo' as const }

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

    const passGenerada = postulante.dni.trim()
    const carreraObj = carrerasGlobal.find(c => c.id === carreraIdSeleccionada)
    const espAsignado = getEspecialistaAsignado(carreraIdSeleccionada, cicloActual)
    const peasCarrera = carreraObj?.peas || []

    const nuevoPracticante: Practicante = {
      id: `prac-${Date.now()}`,
      periodo_id: periodoActivo.id,
      periodoId: periodoActivo.id,
      nombre: postulante.nombres,
      apellido: postulante.apellidos,
      email: postulante.correo,
      correo: postulante.correo,
      fechaNacimiento: postulante.fechaNacimiento || '2000-01-01',
      dni: postulante.dni,
      celular: postulante.celular,
      telefono: postulante.celular,
      carrera: carreraObj?.nombre || 'Especialidad Asignada',
      tel: postulante.celular,
      carreraId: carreraIdSeleccionada,
      semestre: cicloActual,
      monitorId: monitorId,
      supervisorId: monitorId,
      modalidadBase: (modalidad === 'presencial' ? 'Presencial' : modalidad === 'semipresencial' ? 'Semipresencial' : 'Virtual') as any,
      horasSemanalesTarget: 30,
      historial: [],
      semanasHojaFisica: [],
      entregaHojaFisica: false,
      almuerzosConfirmados: [],
      estadoGlobal: 'ACTIVO',
      estadoLaboral: 'activo',
      estado: 'activo',
      saldoHorasExtras: 0,
      fechaIngreso: new Date().toISOString().split('T')[0],
      password: passGenerada,
      hikvisionSync: false,
      documentos: {
        cartaPresentacion: null,
        evidenciaFormulario: null,
        cartaAceptacionFirmada: null,
        convenioFirmado: null,
        registroVinculacion: null,
        peaArchivos: peasCarrera.map(p => typeof p === 'string' ? p : p.nombre)
      }
    }

    addPracticante(nuevoPracticante)
    removePostulacion(postulante.id)
    toast.success(`¡${postulante.nombres} inyectado al periodo ${periodoActivo.nombre}!`, {
      description: `Especialista asignado: ${espAsignado ? espAsignado.nombres + ' ' + espAsignado.apellidos : 'General'}`
    })

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
            <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 text-slate-800 p-4 rounded-2xl border border-emerald-200 mb-2 relative flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[15px] text-slate-800 m-0">Aceptación Mágica de Practicante</h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {periodoActivo.nombre}
                </span>
              </div>
              <p className="text-[12px] text-slate-600 m-0 leading-relaxed">
                El practicante será vinculado automáticamente al periodo activo <strong>{periodoActivo.nombre}</strong> con su PEA y especialista en tiempo real.
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
                <span>Especialista: <strong>{getEspecialistaAsignado(carreraIdSeleccionada, cicloActual)?.nombres || 'General'}</strong></span>
                <span>•</span>
                <span onClick={() => setEdicionHabilitada(!edicionHabilitada)} className="text-blue-600 font-bold underline cursor-pointer">
                  {edicionHabilitada ? 'Fijar datos' : 'Editar datos base'}
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
  readOnly = false,
  onCerrar,
  onCambiarEstado,
}: {
  practicante: Practicante
  readOnly?: boolean
  onCerrar: () => void
  onCambiarEstado?: (p: Practicante) => void
}) {
  const monitores = useAppStore((s) => s.monitores || [])
  const practicantes = useAppStore((s) => s.practicantes)
  const asignarMonitor = useAppStore((s) => s.asignarMonitor)
  const practicanteLive = practicantes.find((p) => p.id === practicante.id) || practicante
  const monitorAsignado = monitores.find((m) => m.id === practicanteLive.monitorId)
  const supSuspendido = esSupervisorSuspendido(monitorAsignado)
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [isSyncingHikvision, setIsSyncingHikvision] = useState(false);

  const handleReenviarCredenciales = () => {
    const usuarioLive = useAppStore.getState().getUsuarioById(practicante.id);
    if (!usuarioLive) {
      toast.error('No se encontraron credenciales activas para el practicante');
      return;
    }
    setIsSendingWhatsapp(true);
    abrirWhatsAppCredenciales(usuarioLive);
    setIsSendingWhatsapp(false);
  };

  const handleSincronizarHikvision = async () => {
    setIsSyncingHikvision(true);
    try {
      // Futuro endpoint NestJS -> Python ISAPI Recolector
      // await axios.post('/api/hikvision/forzar-sincronizacion');
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Marcaciones sincronizadas con el terminal Hikvision');
    } catch (error) {
      toast.error('Error al conectar con el terminal en la red local');
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
            <h3 className="font-bold text-slate-800 text-[18px] leading-tight">{practicanteLive.nombre} {practicanteLive.apellido}</h3>
            <span className="text-[12px] text-slate-500 font-medium">DNI: {practicanteLive.dni} • Cel: {practicanteLive.telefono || practicanteLive.celular || practicanteLive.tel}</span>
          </div>
          <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {supSuspendido && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-900 text-[12px] font-extrabold">
                <AlertTriangle size={15} className="shrink-0 text-amber-700" />
                <span>Supervisor Suspendido - Requiere Reasignación</span>
              </div>
              <p className="text-[11px] text-amber-800 m-0">
                El supervisor actual ({monitorAsignado?.nombre}) se encuentra suspendido. Reasigna este practicante a un supervisor activo:
              </p>
              <select
                disabled={readOnly}
                value={practicanteLive.monitorId || ''}
                onChange={(e) => {
                  if (!e.target.value || readOnly) return
                  asignarMonitor(practicanteLive.id, e.target.value)
                  toast.success('Supervisor reasignado correctamente')
                }}
                className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-2 text-[12px] font-bold text-slate-800 outline-none disabled:opacity-60"
              >
                {monitores.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    disabled={esSupervisorSuspendido(m) && m.id !== practicanteLive.monitorId}
                  >
                    {m.nombre} {esSupervisorSuspendido(m) ? '(Suspendido)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {practicanteLive.estadoGlobal && practicanteLive.estadoGlobal !== 'ACTIVO' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Estado: {practicanteLive.estadoGlobal}</span>
                <span className="text-[10px] font-semibold text-slate-500">Registros intactos: {practicanteLive.historial?.length || 0} días</span>
              </div>
              {(practicanteLive.motivoRetiro || practicanteLive.retiro?.motivo) && (
                <span className="text-[11px] text-slate-500">
                  Motivo: {practicanteLive.motivoRetiro || practicanteLive.retiro?.motivo}
                </span>
              )}
            </div>
          )}

          <div className="mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Gestión de Acceso y Credenciales</span>
            <button
              id={`btn-reenviar-credenciales-${practicanteLive.id}`}
              type="button"
              onClick={handleReenviarCredenciales}
              disabled={isSendingWhatsapp || readOnly}
              className="w-full h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-none"
            >
              {isSendingWhatsapp ? 'Abriendo WhatsApp...' : '📱 Reenviar Credenciales por WhatsApp'}
            </button>
          </div>

          {onCambiarEstado && (
            <div className="mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Ciclo de Vida Laboral</span>
              <button
                id={`btn-cambiar-estado-${practicanteLive.id}`}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  if (readOnly) return;
                  onCerrar();
                  onCambiarEstado(practicanteLive);
                }}
                className="w-full h-11 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Edit3 size={14} />
                Cambiar Estado Laboral (Activo / Retirado)
              </button>
            </div>
          )}

          <div className="mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Control de Asistencia Biométrico</span>
            <button
              onClick={handleSincronizarHikvision}
              disabled={isSyncingHikvision || readOnly}
              className="w-full h-12 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
  readOnly = false,
  onCerrar,
}: {
  supervisor: any
  readOnly?: boolean
  onCerrar: () => void
}) {
  const practicantes = useAppStore(s => s.practicantes);
  const monitores = useAppStore(s => s.monitores || []);
  const periodos = useAppStore(s => s.periodos || []);
  const periodoVisualizacionId = useAppStore(s => s.periodoVisualizacionId);
  const { periodoActivo, periodoVisualizacionId: periodoVisId } = getPeriodoContext(periodos, periodoVisualizacionId);
  const asignarMonitor = useAppStore(s => s.asignarMonitor);
  const removerMonitor = useAppStore(s => s.removerMonitor);
  const cambiarEstadoSupervisor = useAppStore(s => s.cambiarEstadoSupervisor);

  const [estado, setEstado] = useState(supervisor.estado || 'Activo');
  const [motivo, setMotivo] = useState(supervisor.motivoSuspension || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);

  const practicantesDelPeriodo = practicantes.filter(
    (p) =>
      perteneceAPeriodo(p, periodoVisId, periodoActivo?.id || 'per-2026-02') &&
      (p.estadoGlobal || 'ACTIVO') === 'ACTIVO' &&
      p.estadoLaboral !== 'retirado',
  );
  const practicantesActuales = practicantesDelPeriodo.filter(p => p.monitorId === supervisor.id);
  const practicantesLibres = practicantesDelPeriodo.filter(p => {
    if (!p.monitorId || p.monitorId === null) return true;
    if (p.monitorId === supervisor.id) return false;
    const supDeP = monitores.find(m => m.id === p.monitorId);
    return esSupervisorSuspendido(supDeP);
  });

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

          <button onClick={handleGuardarEstado} disabled={isUpdating || readOnly} className="w-full bg-slate-800 text-white font-bold h-12 rounded-xl text-[14px] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center mt-2">
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
                      <div className="text-[11px] text-slate-400 truncate font-medium">{p.carrera} - {p.semestre}</div>
                    </div>
                  </div>
                  <button onClick={() => handleRemover(p.id)} disabled={isAssigning === p.id || readOnly} className="bg-red-50 text-red-600 p-1.5 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0">
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
                      <div className="text-[11px] text-slate-400 truncate font-medium">{p.carrera} - {p.semestre}</div>
                    </div>
                  </div>
                  <button onClick={() => handleAsignar(p.id)} disabled={isAssigning === p.id || readOnly} className="bg-blue-100 text-blue-600 text-[11px] font-bold px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 shrink-0">
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
  const todosPracticantes = useAppStore((s) => s.practicantes)
  const postulaciones = useAppStore((s) => s.postulaciones)
  const carreras = useAppStore((s) => s.carreras)
  const periodos = useAppStore((s) => s.periodos || [])
  const periodoVisualizacionId = useAppStore((s) => s.periodoVisualizacionId)
  const monitores = useAppStore((s) => s.monitores || [])
  const addPostulacion = useAppStore((s) => s.addPostulacion)

  const [vistaActiva, setVistaActiva] = useState<'postulantes' | 'practicantes' | 'supervisores'>('practicantes')
  const [modalSupervisorOpen, setModalSupervisorOpen] = useState(false)
  const [supervisorActivo, setSupervisorActivo] = useState<any>(null)
  const [postulanteActivo, setPostulanteActivo] = useState<Postulante | null>(null)
  const [practicanteActivo, setPracticanteActivo] = useState<Practicante | null>(null)
  const [retiradosOpen, setRetiradosOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [ordenAscendente, setOrdenAscendente] = useState(true)
  const [modalEdicion, setModalEdicion] = useState<ModalEdicionState>({
    open: false,
    practicante: null,
  })
  const [usuarioEditAdmin, setUsuarioEditAdmin] = useState<{
    id: string
    tipoUsuario: TipoUsuarioPerfil
  } | null>(null)

  const {
    periodoActivo,
    periodoVisualizado,
    periodoVisualizacionId: periodoVisId,
    esPeriodoPasado,
  } = getPeriodoContext(periodos, periodoVisualizacionId)

  // Filtro relacional estricto al periodo seleccionado en la Máquina del Tiempo
  const practicantes = todosPracticantes.filter((p) =>
    perteneceAPeriodo(p, periodoVisId, periodoActivo?.id || 'per-2026-02'),
  )

  const handleSimularPostulacion = () => {
    if (esPeriodoPasado) return
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

  const coincideBusqueda = (p: Practicante) => {
    const texto = `${p.nombre} ${p.apellido} ${p.dni ?? ''}`.toLowerCase()
    return texto.includes(query.toLowerCase())
  }

  const ordenarPracticantes = (a: Practicante, b: Practicante) => {
    const nameA = `${a.nombre} ${a.apellido}`
    const nameB = `${b.nombre} ${b.apellido}`
    return ordenAscendente
      ? nameA.localeCompare(nameB, 'es')
      : nameB.localeCompare(nameA, 'es')
  }

  const esRetiradoOInactivo = (p: Practicante) =>
    p.estadoGlobal === 'RETIRADO' ||
    p.estadoGlobal === 'BAJA' ||
    (p.estadoLaboral === 'retirado' && p.estadoGlobal !== 'EGRESADO')

  const filtradosActivos = practicantes
    .filter((p) => !esRetiradoOInactivo(p))
    .filter((p) => (esPeriodoPasado ? true : (p.estadoGlobal || 'ACTIVO') === 'ACTIVO'))
    .filter(coincideBusqueda)
    .sort(ordenarPracticantes)

  const filtradosRetirados = practicantes
    .filter((p) => esRetiradoOInactivo(p))
    .filter(coincideBusqueda)
    .sort(ordenarPracticantes)

  const monitorSuspendidoPorPracticante = (p: Practicante) => {
    const monitor = monitores.find((m) => m.id === p.monitorId)
    return esSupervisorSuspendido(monitor)
  }

  const practicantesSinSupActivo = practicantes.filter(
    (p) =>
      !esRetiradoOInactivo(p) &&
      (p.estadoGlobal || 'ACTIVO') === 'ACTIVO' &&
      monitorSuspendidoPorPracticante(p),
  )

  // Filtrar Supervisores (leyendo directamente de Monitores)
  const filtradosSupervisores = monitores
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
    (p) => (p.estadoGlobal || 'ACTIVO') === 'ACTIVO' && p.estadoLaboral !== 'retirado',
  ).length
  const totalRetirados = practicantes.filter((p) => esRetiradoOInactivo(p)).length

  return (
    <div className="flex flex-col gap-3 pb-8">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-[14px] text-slate-900">
          ⚙️ Admin — Gestión de Personal
        </div>
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          Ciclo {periodoVisualizado?.nombre || ''}
        </span>
      </div>

      {esPeriodoPasado && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center gap-2 text-amber-900 text-[11px] font-bold">
          <Lock size={14} className="shrink-0 text-amber-700" />
          <span>
            Modo Histórico ({periodoVisualizado?.nombre}) — Solo Lectura. Los cambios y contrataciones están deshabilitados.
          </span>
        </div>
      )}

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

          {practicantesSinSupActivo.length > 0 && !esPeriodoPasado && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center gap-2 text-amber-900 text-[11px] font-bold">
              <AlertTriangle size={15} className="shrink-0 text-amber-700" />
              <span>
                {practicantesSinSupActivo.length} practicante{practicantesSinSupActivo.length === 1 ? '' : 's'} con Supervisor Suspendido - Requiere Reasignación (toca su tarjeta para reasignar).
              </span>
            </div>
          )}

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

          {/* Contador de resultados activos */}
          <div className="text-[12px] text-slate-400 pl-0.5">
            {filtradosActivos.length} colaborador{filtradosActivos.length !== 1 ? 'es' : ''}{' '}
            encontrado{filtradosActivos.length !== 1 ? 's' : ''}
          </div>

          {/* Lista principal de activos / históricos */}
          {filtradosActivos.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-[13px] bg-white rounded-xl border border-slate-100">
              {query ? `Sin colaboradores activos para "${query}"` : 'No hay colaboradores activos en este periodo.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtradosActivos.map((p) => (
                <TarjetaColaborador
                  key={p.id}
                  practicante={p}
                  supervisorSuspendido={monitorSuspendidoPorPracticante(p)}
                  readOnly={esPeriodoPasado}
                  onEditarEstado={(pr) =>
                    !esPeriodoPasado &&
                    setUsuarioEditAdmin({ id: pr.id, tipoUsuario: 'PRACTICANTE' })
                  }
                  onClick={(pr) => setPracticanteActivo(pr)}
                />
              ))}
            </div>
          )}

          {/* Acordeón colapsable de Alumnos Retirados (conservando asistencia, HE y documentos intactos) */}
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
            <button
              id="btn-acordeon-retirados"
              type="button"
              onClick={() => setRetiradosOpen((prev) => !prev)}
              className="w-full px-3.5 py-3 flex items-center justify-between bg-slate-100/70 hover:bg-slate-100 border-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <History size={15} className="text-slate-600" />
                <span className="text-[12px] font-extrabold text-slate-700">
                  Alumnos Retirados
                </span>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {filtradosRetirados.length}
                </span>
              </div>
              {retiradosOpen ? (
                <ChevronUp size={16} className="text-slate-500" />
              ) : (
                <ChevronDown size={16} className="text-slate-500" />
              )}
            </button>

            {retiradosOpen && (
              <div className="p-3 flex flex-col gap-2 border-t border-slate-200 bg-white">
                {filtradosRetirados.length === 0 ? (
                  <div className="text-center py-4 text-[12px] text-slate-400 italic">
                    No hay alumnos retirados en este periodo.
                  </div>
                ) : (
                  filtradosRetirados.map((p) => (
                    <TarjetaColaborador
                      key={p.id}
                      practicante={p}
                      readOnly={esPeriodoPasado}
                      onEditarEstado={(pr) =>
                        !esPeriodoPasado &&
                        setUsuarioEditAdmin({ id: pr.id, tipoUsuario: 'PRACTICANTE' })
                      }
                      onClick={(pr) => setPracticanteActivo(pr)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Modal edición */}
          {modalEdicion.open && !esPeriodoPasado && (
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
              readOnly={esPeriodoPasado}
              onCerrar={() => setPracticanteActivo(null)}
              onCambiarEstado={(pr) =>
                !esPeriodoPasado && setModalEdicion({ open: true, practicante: pr })
              }
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
                <TarjetaSupervisor
                  key={sup.id}
                  supervisor={sup}
                  readOnly={esPeriodoPasado}
                  onEditar={(s) =>
                    !esPeriodoPasado &&
                    setUsuarioEditAdmin({ id: s.id, tipoUsuario: 'SUPERVISOR' })
                  }
                  onGestionar={(s) => setSupervisorActivo(s)}
                />
              ))}
            </div>
          )}

          {supervisorActivo && (
            <BottomSheetSupervisor
              supervisor={supervisorActivo}
              readOnly={esPeriodoPasado}
              onCerrar={() => setSupervisorActivo(null)}
            />
          )}

          <button
            type="button"
            disabled={esPeriodoPasado}
            onClick={() => !esPeriodoPasado && setModalSupervisorOpen(true)}
            className="w-full mt-4 bg-indigo-600 border-none cursor-pointer text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Registrar Nuevo Supervisor
          </button>

          {modalSupervisorOpen && !esPeriodoPasado && (
            <ModalNuevoSupervisor onCerrar={() => setModalSupervisorOpen(false)} />
          )}
        </>
      )}

      {/* Modal Universal de Edición Admin (Acceso Total + Contraseña Visible) */}
      <ModalAdminEditarUsuario
        abierto={Boolean(usuarioEditAdmin) && !esPeriodoPasado}
        usuarioId={usuarioEditAdmin?.id ?? null}
        tipoUsuario={usuarioEditAdmin?.tipoUsuario ?? 'PRACTICANTE'}
        onCerrar={() => setUsuarioEditAdmin(null)}
        onGuardado={(msg) => toast.success(msg)}
      />
    </div>
  )
}
