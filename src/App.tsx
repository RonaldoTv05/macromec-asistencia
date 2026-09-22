import { Toaster } from 'sonner'
import BottomNav from './components/layout/BottomNav'
import Header from './components/layout/Header'
import { useAppStore } from './store/useAppStore'
import LoginScreen from './screens/LoginScreen'
import HoyScreen from './screens/HoyScreen'
import HorariosScreen from './screens/HorariosScreen'
import GeneralScreen from './screens/GeneralScreen'
import ReportesScreen from './screens/ReportesScreen'
import AdminModuloScreen from './screens/AdminModuloScreen'

// ── Altura del header fijo (safe area + logo row) ────────────
// paddingTop (safe-area ~59px) + logo row (~58px) = ~117px con margen
const HEADER_HEIGHT = 120

// ============================================================
// APP ROOT — Auth Guard + Routing por rol
// ============================================================

export default function App() {
  const usuarioActual = useAppStore((s) => s.usuarioActual)
  const tabActiva = useAppStore((s) => s.tabActiva)

  // ── Guard de autenticación ──────────────────────────────────
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

  const rol = usuarioActual.rol

  // ── Resolver pantalla activa según rol y tab ────────────────
  function renderScreen() {
    if (tabActiva === 'hoy') return <HoyScreen />

    // PRACTICANTE
    if (rol === 'PRACTICANTE' && tabActiva === 'horarios') {
      return <HorariosScreen />
    }

    // SUPERVISOR
    if (rol === 'SUPERVISOR' && tabActiva === 'reportes') {
      return <ReportesScreen />
    }

    // GERENCIA
    if (rol === 'GERENCIA' && tabActiva === 'reportes') {
      return <ReportesScreen />
    }
    if (rol === 'GERENCIA' && tabActiva === 'general') {
      return <GeneralScreen />
    }
    if (rol === 'GERENCIA' && tabActiva === 'admin') {
      return <AdminModuloScreen />
    }

    // Fallback: siempre muestra Inicio
    return <HoyScreen />
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
