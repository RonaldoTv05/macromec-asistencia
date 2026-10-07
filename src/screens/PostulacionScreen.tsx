import { useState, useEffect } from 'react'
import { ArrowLeft, GraduationCap, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
// ── Sanitización ────────────────────────────────────────────────
function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

// ============================================================
// POSTULACIÓN SCREEN — Formulario Público (RF-13)
// ============================================================

export default function PostulacionScreen({

  onVolver,
}: {
  onVolver: () => void
}) {
  const carreras = useAppStore((s) => s.carreras)
  const addPostulacion = useAppStore((s) => s.addPostulacion)
  
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [dni, setDni] = useState('')
  const [celular, setCelular] = useState('')
  const [correo, setCorreo] = useState('')
  const [carreraId, setCarreraId] = useState('')
  const [semestre, setSemestre] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [edad, setEdad] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (fechaNacimiento) {
      const hoy = new Date()
      const cumple = new Date(fechaNacimiento)
      let e = hoy.getFullYear() - cumple.getFullYear()
      const m = hoy.getMonth() - cumple.getMonth()
      if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
        e--
      }
      setEdad(e)
    } else {
      setEdad(null)
    }
  }, [fechaNacimiento])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombres.trim() || !apellidos.trim() || !dni.trim() || !celular.trim() || !correo.trim() || !carreraId || !semestre || !fechaNacimiento) {
      toast.error('Todos los campos son obligatorios')
      return
    }

    if (dni.length !== 8) {
      toast.error('El DNI debe tener 8 dígitos')
      return
    }

    if (celular.length !== 9) {
      toast.error('El celular debe tener 9 dígitos')
      return
    }

    setEnviando(true)
    await new Promise((r) => setTimeout(r, 800))

    const nuevoPostulante = {
      id: Date.now().toString(),
      nombres: sanitize(nombres),
      apellidos: sanitize(apellidos),
      dni: sanitize(dni),
      celular: sanitize(celular),
      correo: sanitize(correo),
      carreraId,
      semestre,
      fechaNacimiento,
      edad: edad || undefined,
      fechaPostulacion: new Date().toISOString(),
      estado: 'pendiente' as const,
      observaciones: '',
    }

    addPostulacion(nuevoPostulante)
    setEnviando(false)
    toast.success('¡Postulación enviada con éxito! Te contactaremos pronto.')
    onVolver()
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 60%, #1e40af 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px',
        paddingTop: 'max(60px, env(safe-area-inset-top))',
        paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
        <button
          onClick={onVolver}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: '10px 16px',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={16} />
          Volver al Login
        </button>
      </div>

      {/* Branding */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
          }}
        >
          <GraduationCap size={28} color="white" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>
          Postula a MACROMEC
        </div>
        <div style={{ fontSize: 12, color: 'rgba(147,197,253,0.8)', marginTop: 4 }}>
          Completa tus datos para iniciar tu proceso de prácticas
        </div>
      </div>

      {/* Formulario */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '28px 24px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Nombres */}
            <div>
              <label style={labelStyle}>Nombres</label>
              <input
                type="text"
                placeholder="Ej. Carlos Daniel"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                maxLength={60}
                style={inputStyle}
              />
            </div>

            {/* Apellidos */}
            <div>
              <label style={labelStyle}>Apellidos</label>
              <input
                type="text"
                placeholder="Ej. Pérez Gómez"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                maxLength={60}
                style={inputStyle}
              />
            </div>

            {/* DNI */}
            <div>
              <label style={labelStyle}>DNI</label>
              <input
                type="text"
                placeholder="8 dígitos"
                value={dni}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '')
                  if (v.length <= 8) setDni(v)
                }}
                maxLength={8}
                inputMode="numeric"
                style={inputStyle}
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Fecha de Nacimiento</label>
                {edad !== null && (
                  <span className="bg-blue-100 text-blue-800 text-[12px] px-2 py-0.5 rounded-full font-bold">
                    {edad} años
                  </span>
                )}
              </div>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                style={{
                  ...inputStyle,
                  color: fechaNacimiento ? 'white' : 'rgba(148,163,184,0.6)',
                }}
              />
            </div>

            {/* Celular */}
            <div>
              <label style={labelStyle}>Celular</label>
              <input
                type="text"
                placeholder="9 dígitos"
                value={celular}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '')
                  if (v.length <= 9) setCelular(v)
                }}
                maxLength={9}
                inputMode="numeric"
                style={inputStyle}
              />
            </div>

            {/* Correo */}
            <div>
              <label style={labelStyle}>Correo</label>
              <input
                type="email"
                placeholder="correo@senati.pe"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                maxLength={80}
                style={inputStyle}
              />
            </div>

            {/* Carrera */}
            <div>
              <label style={labelStyle}>Carrera</label>
              <select
                value={carreraId}
                onChange={(e) => setCarreraId(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  color: carreraId ? 'white' : 'rgba(148,163,184,0.6)',
                }}
              >
                <option value="" style={{ color: '#64748b' }}>-- Selecciona tu carrera --</option>
                {carreras.map((c) => (
                  <option key={c.id} value={c.id} style={{ color: '#1e293b' }}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Semestre */}
            <div>
              <label style={labelStyle}>Semestre</label>
              <select
                value={semestre}
                onChange={(e) => setSemestre(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  color: semestre ? 'white' : 'rgba(148,163,184,0.6)',
                }}
              >
                <option value="" style={{ color: '#64748b' }}>-- Selecciona ciclo --</option>
                <option value="S4" style={{ color: '#1e293b' }}>S4</option>
                <option value="S5" style={{ color: '#1e293b' }}>S5</option>
                <option value="S6" style={{ color: '#1e293b' }}>S6</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={enviando}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '15px 0',
              background: enviando
                ? 'rgba(16,185,129,0.5)'
                : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              color: 'white',
              cursor: enviando ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: enviando ? 'none' : '0 4px 20px rgba(16,185,129,0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            {enviando ? (
              'Enviando…'
            ) : (
              <>
                <Send size={17} />
                Enviar Postulación
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 24,
          textAlign: 'center',
          fontSize: 11,
          color: 'rgba(148,163,184,0.5)',
        }}
      >
        MACROMEC © 2026 — Prácticas Pre-Profesionales
      </div>
    </div>
  )
}

// ── Estilos reutilizables ────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(148,163,184,0.9)',
  marginBottom: 6,
  letterSpacing: '0.4px',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.08)',
  border: '1.5px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 14,
  color: 'white',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
}
