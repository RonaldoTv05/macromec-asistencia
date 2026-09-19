import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Edit3,
  LogOut,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../../store/useAppStore'

// ── Sanitización contra XSS ──────────────────────────────────
function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/[&"'`]/g, '').trim()
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validarTel(tel: string): boolean {
  return /^\+?\d[\d\s\-]{7,14}$/.test(tel)
}

// ============================================================
// MODAL / SHEET DE PERFIL DE USUARIO
// ============================================================

interface PerfilModalProps {
  abierto: boolean
  onCerrar: () => void
}

export default function PerfilModal({ abierto, onCerrar }: PerfilModalProps) {
  const usuario = useAppStore((s) => s.usuarioActual)
  const updatePerfil = useAppStore((s) => s.updatePerfil)
  const logout = useAppStore((s) => s.logout)

  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Form state (local, sólo se aplica al guardar)
  const [formNombre, setFormNombre] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTel, setFormTel] = useState('')
  const [formCarrera, setFormCarrera] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})

  // Sincronizar form con usuario actual al abrir
  useEffect(() => {
    if (abierto && usuario) {
      setFormNombre(usuario.nombre)
      setFormEmail(usuario.email)
      setFormTel(usuario.tel)
      setFormCarrera(usuario.carrera)
      setEditando(false)
      setErrores({})
    }
  }, [abierto, usuario])

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [abierto])

  if (!usuario) return null

  const validar = () => {
    const errs: Record<string, string> = {}
    if (!formNombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!validarEmail(formEmail)) errs.email = 'Correo inválido'
    if (formTel && !validarTel(formTel)) errs.tel = 'Teléfono inválido'
    return errs
  }

  const handleGuardar = async () => {
    const errs = validar()
    if (Object.keys(errs).length > 0) {
      setErrores(errs)
      return
    }
    setGuardando(true)
    await new Promise((r) => setTimeout(r, 500))
    updatePerfil({
      nombre: sanitize(formNombre),
      email: sanitize(formEmail),
      tel: sanitize(formTel),
      carrera: sanitize(formCarrera),
      avatarIniciales:
        sanitize(formNombre)
          .split(' ')
          .slice(0, 2)
          .map((n) => n[0])
          .join('')
          .toUpperCase() || usuario.avatarIniciales,
    })
    setGuardando(false)
    setEditando(false)
    setErrores({})
    toast.success('Datos actualizados correctamente')
  }

  const handleLogout = () => {
    logout()
    onCerrar()
    toast.info('Sesión cerrada — Hasta pronto')
  }

  const ROL_LABEL: Record<string, string> = {
    PRACTICANTE: 'Practicante',
    SUPERVISOR: 'Supervisor',
    GERENCIA: 'Gerencia',
  }

  return (
    <>
      {/* Overlay */}
      <div
        id="perfil-modal-overlay"
        onClick={() => { if (!editando) onCerrar() }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
          opacity: abierto ? 1 : 0,
          pointerEvents: abierto ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          backdropFilter: 'blur(4px)',
        }}
        aria-hidden={!abierto}
      />

      {/* Sheet deslizable desde abajo */}
      <div
        id="perfil-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Perfil de usuario"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: abierto
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(100%)',
          width: '100%',
          maxWidth: '430px',
          zIndex: 101,
          background: 'white',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.2)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Drag indicator */}
        <div style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              background: '#e2e8f0',
              display: 'inline-block',
            }}
          />
        </div>

        {/* Header del sheet */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px 0',
          }}
        >
          <div>
            <div
              style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}
            >
              Mi Perfil
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              Datos de tu cuenta institucional
            </div>
          </div>
          <button
            id="btn-cerrar-perfil"
            onClick={onCerrar}
            aria-label="Cerrar"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar grande + nombre */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 0 16px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 800,
              color: 'white',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
              marginBottom: 10,
            }}
          >
            {usuario.avatarIniciales}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            {usuario.nombre}
          </div>
          <div
            style={{
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Shield size={12} style={{ color: '#2563EB' }} />
            <span
              style={{
                fontSize: 12,
                color: '#2563EB',
                fontWeight: 600,
              }}
            >
              {ROL_LABEL[usuario.rol]}
            </span>
            <span
              style={{
                fontSize: 10,
                color: '#94a3b8',
                background: '#f1f5f9',
                borderRadius: 6,
                padding: '1px 6px',
                fontWeight: 500,
              }}
            >
              @{usuario.username}
            </span>
          </div>
        </div>

        {/* Cuerpo: datos personales */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editando ? (
            // ── Modo edición ────────────────────────────────
            <>
              <CampoEditable
                id="edit-nombre"
                label="Nombres y Apellidos"
                icono={<User size={15} />}
                valor={formNombre}
                onChange={(v) => {
                  setFormNombre(v)
                  setErrores((e) => ({ ...e, nombre: '' }))
                }}
                error={errores.nombre}
                placeholder="Tu nombre completo"
              />
              <CampoEditable
                id="edit-email"
                label="Correo Institucional"
                icono={<Mail size={15} />}
                valor={formEmail}
                onChange={(v) => {
                  setFormEmail(v)
                  setErrores((e) => ({ ...e, email: '' }))
                }}
                error={errores.email}
                placeholder="correo@macromec.pe"
                type="email"
              />
              <CampoEditable
                id="edit-tel"
                label="Teléfono"
                icono={<Phone size={15} />}
                valor={formTel}
                onChange={(v) => {
                  setFormTel(v)
                  setErrores((e) => ({ ...e, tel: '' }))
                }}
                error={errores.tel}
                placeholder="+51 9XX XXX XXX"
                type="tel"
              />
              <CampoEditable
                id="edit-carrera"
                label="Carrera / Área"
                icono={<Shield size={15} />}
                valor={formCarrera}
                onChange={setFormCarrera}
                placeholder="Tu carrera o área"
              />

              {/* Botones edición */}
              <div
                style={{ display: 'flex', gap: 10, marginTop: 4 }}
              >
                <button
                  id="btn-cancelar-edicion"
                  onClick={() => {
                    setEditando(false)
                    setErrores({})
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-cambios"
                  onClick={handleGuardar}
                  disabled={guardando}
                  style={{
                    flex: 2,
                    padding: '12px 0',
                    background: guardando
                      ? '#93c5fd'
                      : 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'white',
                    cursor: guardando ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {guardando ? (
                    'Guardando…'
                  ) : (
                    <>
                      <Save size={15} />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            // ── Modo lectura ────────────────────────────────
            <>
              <FilaDato
                icono={<User size={15} style={{ color: '#2563EB' }} />}
                label="Nombres y Apellidos"
                valor={usuario.nombre}
              />
              <FilaDato
                icono={<Mail size={15} style={{ color: '#2563EB' }} />}
                label="Correo Institucional"
                valor={usuario.email}
              />
              <FilaDato
                icono={<Phone size={15} style={{ color: '#2563EB' }} />}
                label="Teléfono"
                valor={usuario.tel}
              />
              <FilaDato
                icono={<Shield size={15} style={{ color: '#2563EB' }} />}
                label="Carrera / Área"
                valor={usuario.carrera}
              />
              <FilaDato
                icono={<CheckCircle2 size={15} style={{ color: '#059669' }} />}
                label="DNI"
                valor={usuario.dni}
              />

              {/* Botón editar */}
              <button
                id="btn-editar-datos"
                onClick={() => setEditando(true)}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1E3A8A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <Edit3 size={15} />
                Editar Datos
              </button>
            </>
          )}

          {/* Separador */}
          <div
            style={{
              height: 1,
              background: '#f1f5f9',
              marginTop: 4,
              marginBottom: 4,
            }}
          />

          {/* Cerrar Sesión */}
          <button
            id="btn-cerrar-sesion"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '13px 0',
              background: '#fff5f5',
              border: '1.5px solid #fecaca',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              color: '#dc2626',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LogOut size={15} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  )
}

// ── Sub-componente: fila de dato en modo lectura ─────────────
function FilaDato({
  icono,
  label,
  valor,
}: {
  icono: React.ReactNode
  label: string
  valor: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 12px',
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #f1f5f9',
      }}
    >
      <div
        style={{
          marginTop: 1,
          flexShrink: 0,
          width: 28,
          height: 28,
          background: '#eff6ff',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icono}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: '#94a3b8',
            fontWeight: 500,
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#1e293b',
            fontWeight: 600,
            wordBreak: 'break-all',
          }}
        >
          {valor || '—'}
        </div>
      </div>
    </div>
  )
}

// ── Sub-componente: campo de edición controlado ──────────────
function CampoEditable({
  id,
  label,
  icono,
  valor,
  onChange,
  error,
  placeholder,
  type = 'text',
}: {
  id: string
  label: string
  icono: React.ReactNode
  valor: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: '#475569',
          marginBottom: 6,
          letterSpacing: '0.3px',
        }}
      >
        {icono}
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={valor}
        placeholder={placeholder}
        maxLength={100}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '11px 14px',
          borderRadius: 10,
          border: error
            ? '1.5px solid #fca5a5'
            : '1.5px solid #e2e8f0',
          fontSize: 14,
          color: '#1e293b',
          outline: 'none',
          boxSizing: 'border-box',
          background: error ? '#fff5f5' : 'white',
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#2563EB'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#fca5a5' : '#e2e8f0'
        }}
      />
      {error && (
        <div
          style={{
            fontSize: 11,
            color: '#dc2626',
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
