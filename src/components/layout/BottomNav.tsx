import {
  BarChart2,
  CalendarDays,
  CheckSquare,
  Grid3X3,
  Home,
  Settings,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Tab } from '../../store/useAppStore'

// ── Definición de tabs por rol ────────────────────────────────
type TabDef = {
  key: Tab
  label: string
  Icon: React.ElementType
}

const TABS_PRACTICANTE: TabDef[] = [
  { key: 'hoy', label: 'Inicio', Icon: Home },
  { key: 'horarios', label: 'Horarios', Icon: CalendarDays },
]

const TABS_SUPERVISOR: TabDef[] = [
  { key: 'hoy', label: 'Inicio', Icon: Home },
  { key: 'horarios', label: 'Horarios', Icon: CalendarDays },
  { key: 'general', label: 'General', Icon: Grid3X3 },
]

const TABS_GERENCIA: TabDef[] = [
  { key: 'hoy', label: 'Inicio', Icon: Home },
  { key: 'reportes', label: 'Reportes', Icon: BarChart2 },
  { key: 'admin', label: 'Admin', Icon: Settings },
]

// ── Resolver tabs según rol ───────────────────────────────────
function getTabsParaRol(rol: string | null | undefined): TabDef[] {
  if (rol === 'SUPERVISOR') return TABS_SUPERVISOR
  if (rol === 'GERENCIA') return TABS_GERENCIA
  return TABS_PRACTICANTE
}

// ============================================================
// BOTTOM NAVIGATION — RBAC por rol
// ============================================================

export default function BottomNav() {
  const tabActiva = useAppStore((s) => s.tabActiva)
  const setTabActiva = useAppStore((s) => s.setTabActiva)
  const rolActivo = useAppStore((s) => s.rolActivo)

  const tabs = getTabsParaRol(rolActivo)

  return (
    <nav
      role="navigation"
      aria-label="Navegación principal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '430px',
        zIndex: 50,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(226,232,240,0.8)',
        paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 8,
      }}
    >
      {tabs.map(({ key, label, Icon }) => {
        const isActive = tabActiva === key
        return (
          <button
            key={key}
            id={`tab-btn-${key}`}
            onClick={() => setTabActiva(key)}
            aria-label={`Ir a ${label}`}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 4px',
              borderRadius: 12,
              transition: 'all 0.15s ease',
              color: isActive ? '#1E3A8A' : '#94a3b8',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon
                size={22}
                style={{
                  transition: 'all 0.15s ease',
                  strokeWidth: isActive ? 2.5 : 1.8,
                }}
              />
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#2563EB',
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.3px',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
