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
  { key: 'reportes', label: 'Informes', Icon: BarChart2 },
]

const TABS_GERENCIA: TabDef[] = [
  { key: 'hoy', label: 'Inicio', Icon: Home },
  { key: 'reportes', label: 'Reportes', Icon: BarChart2 },
  { key: 'general', label: 'General', Icon: Grid3X3 },
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
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white/95 backdrop-blur-[16px] border-t border-slate-200/80 flex items-center justify-around pt-2 pb-[max(28px,env(safe-area-inset-bottom))]"
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
            className={`flex-1 flex flex-col items-center gap-[3px] bg-transparent border-none cursor-pointer p-1.5 rounded-xl transition-all duration-150 ${
              isActive ? 'text-blue-900' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <Icon
                size={22}
                className="transition-all duration-150"
                style={{ strokeWidth: isActive ? 2.5 : 1.8 }}
              />
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-[0.3px] transition-all duration-150 ${
                isActive ? 'font-bold' : 'font-medium'
              }`}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
