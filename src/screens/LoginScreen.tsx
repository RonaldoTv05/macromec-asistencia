import { useState } from 'react'
import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'

// ── Helpers de sanitización ──────────────────────────────────
function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// ============================================================
// LOGIN SCREEN — Mobile-First iPhone 15 Pro Max
// ============================================================

export default function LoginScreen() {
  const login = useAppStore((s) => s.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const u = sanitize(username)
    const p = sanitize(password)

    if (!u || !p) {
      setError('Completa todos los campos')
      return
    }

    setCargando(true)
    // Simular latencia de red (UX premium)
    await new Promise((r) => setTimeout(r, 700))

    const ok = login(u, p)
    setCargando(false)

    if (!ok) {
      setError('Usuario o contraseña incorrectos')
      toast.error('Credenciales inválidas — Verifica tus datos')
    } else {
      toast.success('¡Bienvenido al Sistema MACROMEC!')
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 60%, #1e40af 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px',
        paddingTop: 'max(80px, env(safe-area-inset-top))',
        paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decoración de fondo */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: -80,
          left: -60,
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo y branding */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 900,
            color: 'white',
            boxShadow: '0 8px 32px rgba(37,99,235,0.5)',
            letterSpacing: '-1px',
          }}
        >
          M
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '1.5px',
              lineHeight: 1,
            }}
          >
            MACROMEC
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(147,197,253,0.8)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            Sistema de Asistencia
          </div>
        </div>
      </div>

      {/* Tarjeta de login */}
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '32px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'white',
            marginBottom: 6,
            marginTop: 0,
          }}
        >
          Iniciar Sesión
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'rgba(148,163,184,0.9)',
            marginBottom: 28,
            marginTop: 0,
          }}
        >
          Ingresa tus credenciales institucionales
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Campo: Usuario */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="login-username"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(148,163,184,0.9)',
                marginBottom: 8,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Usuario
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(148,163,184,0.6)',
                }}
              />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                placeholder="Tu usuario"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('')
                }}
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: error
                    ? '1.5px solid rgba(239,68,68,0.6)'
                    : '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  fontSize: 15,
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(59,130,246,0.7)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error
                    ? 'rgba(239,68,68,0.6)'
                    : 'rgba(255,255,255,0.1)'
                }}
              />
            </div>
          </div>

          {/* Campo: Contraseña */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(148,163,184,0.9)',
                marginBottom: 8,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(148,163,184,0.6)',
                }}
              />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 40px',
                  background: 'rgba(255,255,255,0.08)',
                  border: error
                    ? '1.5px solid rgba(239,68,68,0.6)'
                    : '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  fontSize: 15,
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(59,130,246,0.7)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error
                    ? 'rgba(239,68,68,0.6)'
                    : 'rgba(255,255,255,0.1)'
                }}
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'rgba(148,163,184,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div
              role="alert"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 13,
                color: '#fca5a5',
                fontWeight: 500,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Botón de submit */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={cargando}
            style={{
              width: '100%',
              padding: '15px 0',
              background: cargando
                ? 'rgba(37,99,235,0.5)'
                : 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              color: 'white',
              cursor: cargando ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: cargando ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
              letterSpacing: '0.3px',
            }}
          >
            {cargando ? (
              <>
                <SpinnerIcon />
                Verificando…
              </>
            ) : (
              <>
                <LogIn size={17} />
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 32,
          textAlign: 'center',
          fontSize: 11,
          color: 'rgba(148,163,184,0.5)',
          letterSpacing: '0.5px',
        }}
      >
        MACROMEC © 2026 — Sistema de Asistencia Interno
      </div>
    </div>
  )
}

// ── Spinner animado ──────────────────────────────────────────
function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
