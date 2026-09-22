import { useState } from 'react'
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Edit3,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
import type { EstadoLaboral, Practicante, RetiroData } from '../types'

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
}: {
  practicante: Practicante
  onEditarEstado: (p: Practicante) => void
}) {
  const isRetirado = practicante.estadoLaboral === 'retirado'

  return (
    <div className={`rounded-[14px] p-3 flex items-center gap-3 transition-opacity duration-200 border ${isRetirado ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}>
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 ${isRetirado ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-br from-blue-900 to-blue-600 text-white'}`}>
        {practicante.nombre[0]}
        {practicante.apellido[0]}
      </div>

      {/* Datos */}
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-bold mb-0.5 truncate ${isRetirado ? 'text-slate-400' : 'text-slate-800'}`}>
          {practicante.nombre} {practicante.apellido}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <BadgeEstado estado={practicante.estadoLaboral} />
          <span className="text-[10px] text-slate-400 capitalize">
            {practicante.modalidadBase}
          </span>
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
        onClick={() => onEditarEstado(practicante)}
        style={{
          background: '#f1f5f9',
          border: 'none',
          borderRadius: 10,
          padding: '8px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          color: '#1E3A8A',
          flexShrink: 0,
        }}
      >
        <Edit3 size={13} />
        Editar
      </button>
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

// ============================================================
// ADMIN MÓDULO — Gestión de Personal (solo GERENCIA)
// ============================================================

export default function AdminModuloScreen() {
  const practicantes = useAppStore((s) => s.practicantes)

  const [query, setQuery] = useState('')
  const [ordenAscendente, setOrdenAscendente] = useState(true)
  const [modalEdicion, setModalEdicion] = useState<ModalEdicionState>({
    open: false,
    practicante: null,
  })

  // Filtrar por nombre, apellido o DNI
  const filtrados = practicantes
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

  const totalActivos = practicantes.filter(
    (p) => p.estadoLaboral === 'activo',
  ).length
  const totalRetirados = practicantes.filter(
    (p) => p.estadoLaboral === 'retirado',
  ).length

  return (
    <div className="flex flex-col gap-3">
      <div className="font-bold text-[14px] text-slate-900">
        ⚙️ Admin — Gestión de Personal
      </div>

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
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[1.5px] border-slate-200 text-[13px] outline-none bg-white"
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
        {filtrados.length} colaborador{filtrados.length !== 1 ? 'es' : ''}{' '}
        encontrado{filtrados.length !== 1 ? 's' : ''}
      </div>

      {/* Lista de colaboradores */}
      {filtrados.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-[13px]">
          Sin resultados para "{query}"
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((p) => (
            <TarjetaColaborador
              key={p.id}
              practicante={p}
              onEditarEstado={(pr) =>
                setModalEdicion({ open: true, practicante: pr })
              }
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
    </div>
  )
}
