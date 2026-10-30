import { useEffect } from 'react'
import { Toaster } from 'sonner'
import BottomNav from './components/layout/BottomNav'
import Header from './components/layout/Header'
import { GraduationCap, LogOut } from 'lucide-react'
import { useAppStore } from './store/useAppStore'
import LoginScreen from './screens/LoginScreen'
import HoyScreen from './screens/HoyScreen'
import HorariosScreen from './screens/HorariosScreen'
import GeneralScreen from './screens/GeneralScreen'
import ReportesScreen from './screens/ReportesScreen'
import AdminModuloScreen from './screens/AdminModuloScreen'

const HEADER_HEIGHT = 120

export default function App() {
  // ── 1. DECLARACIÓN ESTRICTA DE HOOKS EN LA PARTE SUPERIOR (Sin returns previos) ──
  const usuarioActual = useAppStore((s) => s.usuarioActual)
  const tabActiva = useAppStore((s) => s.tabActiva)
  const periodos = useAppStore((s) => s.periodos)
  const logout = useAppStore((s) => s.logout)

  const rol = usuarioActual?.rol

  // 🛡️ Seguridad RBAC: Protección de URLs y sincronización de roles
  useEffect(() => {
    if (!usuarioActual) return

    const syncUrlAndRole = () => {
      const hash = (typeof window !== 'undefined' ? window.location.hash : '').toLowerCase()
      if (rol === 'PRACTICANTE') {
        if (hash.includes('general') || hash.includes('report') || hash.includes('admin')) {
          if (typeof window !== 'undefined') window.location.hash = '#/hoy'
          useAppStore.getState().setTabActiva('hoy')
        }
      } else if (rol === 'GERENCIA' || (usuarioActual as any)?.role === 'ADMIN' || (usuarioActual as any)?.rol === 'ADMIN') {
        if (hash.includes('general')) useAppStore.getState().setTabActiva('general')
        else if (hash.includes('report')) useAppStore.getState().setTabActiva('reportes')
        else if (hash.includes('admin')) useAppStore.getState().setTabActiva('admin')
        else if (hash.includes('hoy') || hash.includes('inicio')) useAppStore.getState().setTabActiva('hoy')
      }
    }

    syncUrlAndRole()
    window.addEventListener('hashchange', syncUrlAndRole)
    return () => window.removeEventListener('hashchange', syncUrlAndRole)
  }, [rol, usuarioActual])

  // Si un PRACTICANTE tiene activa una pestaña administrativa por estado previo, forzar a Inicio
  useEffect(() => {
    if (rol === 'PRACTICANTE' && (tabActiva === 'general' || tabActiva === 'reportes' || tabActiva === 'admin')) {
      useAppStore.getState().setTabActiva('hoy')
    }
  }, [rol, tabActiva])

  // ── 2. ESTADOS DERIVADOS ──
  const periodoActivo = periodos?.find(p => p.estado === 'activo') || periodos?.[0]
  const hoyISO = new Date().toISOString().split('T')[0]
  const finCicloSuperado = Boolean(periodoActivo?.fechaFin && hoyISO > periodoActivo.fechaFin)

  // ── 3. RESOLVER PANTALLA SEGÚN ROL Y TAB ──
  function renderScreen() {
    // 🛡️ Restricción Estricta RBAC: PRACTICANTE nunca debe acceder a general, reportes ni admin
    if (rol === 'PRACTICANTE' && (tabActiva === 'general' || tabActiva === 'reportes' || tabActiva === 'admin')) {
      return <HoyScreen />
    }

    if (tabActiva === 'hoy') return <HoyScreen />

    // PRACTICANTE
    if (rol === 'PRACTICANTE' && tabActiva === 'horarios') {
      return <HorariosScreen />
    }

    // SUPERVISOR
    if (rol === 'SUPERVISOR' && tabActiva === 'reportes') {
      return <ReportesScreen />
    }

    // GERENCIA / ADMIN
    const esAdmin =
      rol === 'GERENCIA' ||
      (usuarioActual as any)?.rol === 'ADMIN' ||
      (usuarioActual as any)?.role === 'ADMIN' ||
      (usuarioActual as any)?.role === 'GERENCIA'

    if (esAdmin) {
      if (tabActiva === 'reportes') return <ReportesScreen />
      if (tabActiva === 'general') return <GeneralScreen />
      if (tabActiva === 'admin') return <AdminModuloScreen />
    }

    // Fallback: siempre muestra Inicio
    return <HoyScreen />
  }

  // ── 4. RENDERIZADO FINAL CONDICIONAL (DESPUÉS DE TODOS LOS HOOKS) ──
  if (!usuarioActual) {
    return (
      <>
        <LoginScreen />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13,
              maxWidth: 400,
            },
          }}
        />
      </>
    )
  }

  // Bloqueo de Sesión por Fin de Ciclo (Exclusivo PRACTICANTE)
  if (rol === 'PRACTICANTE' && finCicloSuperado) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 60%, #1e40af 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <div
          style={{
            maxWidth: 390,
            width: '100%',
            background: 'white',
            borderRadius: 24,
            padding: '36px 24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={32} />
          </div>

          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#2563EB',
                background: '#EFF6FF',
                padding: '4px 12px',
                borderRadius: 999,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Periodo {periodoActivo?.nombre || ''} Concluido
            </span>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 900,
                color: '#1E293B',
                margin: '14px 0 8px 0',
                lineHeight: 1.3,
              }}
            >
              Fin de periodo, muchas gracias y felices vacaciones
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              El ciclo académico finalizó el {periodoActivo?.fechaFin}. El acceso a las actividades y registro de asistencia ha sido cerrado para practicantes.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '12px 20px',
              borderRadius: 12,
              background: '#F1F5F9',
              color: '#475569',
              fontSize: 13,
              fontWeight: 700,
              border: '1px solid #E2E8F0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
        <Toaster position="top-center" richColors />
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 430,
        margin: '0 auto',
        minHeight: '100dvh',
        background: '#F8FAFC',
        position: 'relative',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <Header />

      {/* Contenido principal */}
      <main
        style={{
          paddingTop: HEADER_HEIGHT,
          paddingBottom:
            'calc(max(28px, env(safe-area-inset-bottom)) + 76px)',
          paddingLeft: 16,
          paddingRight: 16,
          overflowY: 'auto',
          minHeight: '100dvh',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ paddingTop: 12, paddingBottom: 8 }}>
          {renderScreen()}
        </div>
      </main>

      <BottomNav />

      {/* Toast provider */}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            maxWidth: 400,
          },
        }}
      />
    </div>
  )
}
