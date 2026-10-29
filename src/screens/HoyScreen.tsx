
import { useState, useMemo } from 'react'
import type { Modalidad, ArchivoPea } from '../types'
import { descargarArchivoBase64, SAMPLE_PEA_PDF_BASE64 } from '../utils/fileUtils'
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart2,
  Check,
  CheckCircle2,
  Clock,
  Clipboard,
  Download,
  FileText,
  FolderOpen,
  TrendingUp,
  Upload,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  History,
  X,
  Cake,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import {
  HORAS_SEMANA_ACTUAL,
  SEMANA_ANTERIOR_LABEL,
  HORAS_SEMANA_ANTERIOR,
} from '../data/mockData'
import { toast } from 'sonner'


// ── Sub-componentes comunes ────────────────────────────────────

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3 ${className}`}
    >
      {children}
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div
      className="rounded-[14px] px-4 py-[14px] flex flex-col gap-2 flex-1 min-w-0"
      style={{ background: color }}
    >
      <div className="text-white/70 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold tracking-[0.5px] uppercase leading-tight">
          {label}
        </span>
      </div>
      <div className="text-[28px] font-extrabold text-white leading-none">
        {value}
      </div>
    </div>
  )
}

// ============================================================
// ============================================================
// DASHBOARD PRACTICANTE
// ============================================================



function DashboardPracticante() {
  const usuario = useAppStore((s) => s.usuarioActual)
  const practicantes = useAppStore((s) => s.practicantes)
  const extraHoursBalances = useAppStore((s) => s.extraHoursBalances)
  const uploadDocumento = useAppStore((s) => s.uploadDocumento)
  const plantilla = useAppStore((s) => s.plantillaAceptacion)
  const carreras = useAppStore((s) => s.carreras || [])
  const monitores = useAppStore((s) => s.monitores || [])

  const getEspecialistaAsignado = useAppStore(s => s.getEspecialistaAsignado);

  const practicanteCompleto = practicantes.find(p => p.dni === usuario?.dni) || practicantes[0];
  const especialistaObjeto = getEspecialistaAsignado(practicanteCompleto.carreraId || practicanteCompleto.carrera, practicanteCompleto.semestre);
  const nombreEspecialista = especialistaObjeto ? `${especialistaObjeto.nombres} ${especialistaObjeto.apellidos}` : 'Especialista por asignar';

  const supervisorAsignado = monitores.find(m => m.id === practicanteCompleto?.monitorId);
  const nombreSupervisor = supervisorAsignado ? supervisorAsignado.nombre : 'Supervisor no asignado';

  // Normalización de semestre (ej. "VI Semestre" -> "S6")
  const normalizeSemestre = (s: string) => {
    if (!s) return 'S4';
    const upper = s.toUpperCase().trim();
    if (upper.includes('IV') || upper === 'S4') return 'S4';
    if (upper.includes('VI') || upper === 'S6') return 'S6';
    if (upper.includes('V') || upper === 'S5') return 'S5';
    return upper;
  };
  const cicloEstudiante = normalizeSemestre(practicanteCompleto.semestre);

  const carreraPracticante = carreras.find(c =>
    c.id === practicanteCompleto.carreraId ||
    c.nombre === practicanteCompleto.carrera ||
    c.nombre === usuario?.carrera ||
    c.id === usuario?.carrera
  );

  // PEAs vinculados directamente a la carrera del practicante (con Base64 real y descargable)
  const peasCarrera = useMemo<ArchivoPea[]>(() => {
    if (!carreraPracticante) return [];
    const list: ArchivoPea[] = [];
    if (carreraPracticante.peas && Array.isArray(carreraPracticante.peas)) {
      carreraPracticante.peas.forEach((p, idx) => {
        if (!p) return;
        if (typeof p === 'string') {
          list.push({
            id: `pea-${idx}`,
            nombre: p,
            base64: SAMPLE_PEA_PDF_BASE64,
            tipoMime: 'application/pdf',
          });
        } else {
          list.push({
            ...p,
            base64: p.base64 || SAMPLE_PEA_PDF_BASE64,
            tipoMime: p.tipoMime || 'application/pdf',
          });
        }
      });
    }
    if (list.length === 0 && carreraPracticante.peaArchivos && Array.isArray(carreraPracticante.peaArchivos)) {
      carreraPracticante.peaArchivos.forEach((nombre, idx) => {
        if (!nombre) return;
        list.push({
          id: `pea-legacy-${idx}`,
          nombre,
          base64: SAMPLE_PEA_PDF_BASE64,
          tipoMime: 'application/pdf',
        });
      });
    }
    return list;
  }, [carreraPracticante]);
  const [expedienteOpen, setExpedienteOpen] = useState(false);

  const p = practicanteCompleto;
  const idActual = p.id;
  const saldoHE = useAppStore(state => {
    const pActual = state.practicantes.find(pr => pr.id === idActual);
    if (pActual?.saldoHorasExtras !== undefined) return pActual.saldoHorasExtras;
    const b = state.extraHoursBalances.find(b => b.practicanteId === idActual);
    return b?.horasDisponibles || 0;
  });

  const [fechaRegistroModal, setFechaRegistroModal] = useState<string | null>(null)

  const pct = Math.round((HORAS_SEMANA_ACTUAL / 30) * 100)

  if (!p || !usuario) return null

  // ── Cálculo de los 7 días de la semana actual (Lunes a Domingo) ──
  const bloquesSemana = useMemo(() => {
    const d = new Date()
    const diaSemanaNum = d.getDay() === 0 ? 7 : d.getDay() // Lunes=1, ..., Domingo=7
    const lunes = new Date(d)
    lunes.setDate(d.getDate() - (diaSemanaNum - 1))
    lunes.setHours(0, 0, 0, 0)

    const DIAS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const DIAS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    let sumaHoras = 0

    const dias = Array.from({ length: 7 }, (_, idx) => {
      const fechaObj = new Date(lunes)
      fechaObj.setDate(lunes.getDate() + idx)
      const yyyy = fechaObj.getFullYear()
      const mm = String(fechaObj.getMonth() + 1).padStart(2, '0')
      const dd = String(fechaObj.getDate()).padStart(2, '0')
      const fStr = `${yyyy}-${mm}-${dd}`

      const fHoyStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const esHoy = fStr === fHoyStr

      const reg = p.historial.find((h) => h.fecha === fStr)
      const asist = p.asistencia?.[fStr]

      const diaConfig = (p.horarioVigente || p.horarioAprobado || p.horarioActual)?.dias?.find(
        (x) => x.dia.toLowerCase() === DIAS_FULL[idx].toLowerCase()
      )
      let modDiaria = diaConfig?.modalidadDiaria || (diaConfig?.modalidad === 'libre' ? 'Libre' : diaConfig?.modalidad === 'virtual' ? 'Virtual' : 'Presencial')
      if (!diaConfig) {
        modDiaria = (idx === 5 || idx === 6) ? 'Libre' : 'Presencial'
      }

      const est = (reg?.estado || asist?.estado?.toUpperCase()) as string | undefined
      const faltaCubierta = asist?.faltaCubierta === true || reg?.estado === 'COMPENSADO' || reg?.estado === 'FALTA_CUBIERTA' || reg?.horasExtrasAplicadas === true

      let tipoBloque: 'check-verde' | 'check-rojo' | 'x-roja' | 'libre' | 'pendiente' = 'pendiente'
      let horasBloque = 0

      if (faltaCubierta) {
        tipoBloque = 'check-rojo' // Comodín (HE): Check Rojo (6h cumplidas)
        horasBloque = 6
      } else if (est === 'ASISTIO' || est === 'TARDANZA' || est === 'CAMPO') {
        tipoBloque = 'check-verde' // Asistencia cumplida: Check Verde (6h)
        horasBloque = 6
      } else if (est === 'FALTA') {
        tipoBloque = 'x-roja' // Falta: 'X' Roja (0h)
        horasBloque = 0
      } else if (est === 'LIBRE' || (modDiaria === 'Libre' && !est)) {
        tipoBloque = 'libre'
        horasBloque = 0
      } else {
        tipoBloque = 'pendiente' // Pendiente laborable: '?' gris
        horasBloque = 0
      }

      sumaHoras += horasBloque

      return {
        diaShort: DIAS_SHORT[idx],
        numeroDia: dd,
        fechaStr: fStr,
        esHoy,
        tipoBloque,
        horasBloque,
      }
    })

    return { dias, sumaHoras }
  }, [p.historial, p.asistencia, p.horarioVigente, p.horarioAprobado, p.horarioActual])

  // FASE 1: LÓGICA DE REVELACIÓN PROGRESIVA DE DÍAS (TIEMPO REAL)
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  // Feriados y Semestres
  const semestres = useAppStore.getState().semestres;
  const semestreActivo = semestres[0];
  const esFeriadoHoy = semestreActivo?.feriados?.find(f => f.fecha === fechaHoy);
  const diaSemanaHoy = hoy.getDay() === 0 ? 7 : hoy.getDay();

  const diasAMostrar: Date[] = [];
  for (let i = 1; i <= diaSemanaHoy; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (diaSemanaHoy - i));
    diasAMostrar.push(d);
  }

  // FASE 2: CONEXIÓN CON EL HORARIO Y REGISTROS DEL STORE
  const horarioActivo = (p.horarioVigente && (p.horarioVigente.estado === 'Aprobado' || p.horarioVigente.estado === 'aprobado'))
    ? p.horarioVigente
    : (p.horarioAprobado && (p.horarioAprobado.estado === 'Aprobado' || p.horarioAprobado.estado === 'aprobado'))
      ? p.horarioAprobado
      : (p.horarioActual && (p.horarioActual.estado === 'Aprobado' || p.horarioActual.estado === 'aprobado'))
        ? p.horarioActual
        : undefined;

  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const nombreDiaHoy = diasNombres[hoy.getDay()];
  const diaConfigHoy = horarioActivo?.dias?.find(d => d.dia.toLowerCase() === nombreDiaHoy.toLowerCase());

  let modalidadDiaHorarioHoy: 'Presencial' | 'Virtual' | 'Libre' = 'Presencial';
  if (diaConfigHoy) {
    if (diaConfigHoy.modalidadDiaria) modalidadDiaHorarioHoy = diaConfigHoy.modalidadDiaria;
    else if (diaConfigHoy.modalidad) {
      const m = diaConfigHoy.modalidad.toLowerCase();
      modalidadDiaHorarioHoy = m === 'virtual' ? 'Virtual' : m === 'libre' ? 'Libre' : 'Presencial';
    }
  } else {
    modalidadDiaHorarioHoy = (hoy.getDay() === 0 || hoy.getDay() === 6) ? 'Libre' : 'Presencial';
  }

  const regHoy = p.historial.find(r => r.fecha === fechaHoy);
  const asistenciaHoy = p.asistencia?.[fechaHoy];
  const estadoGerenciaHoy = regHoy?.estado || (asistenciaHoy?.estado ? (
    asistenciaHoy.estado === 'Asistió' ? 'ASISTIO' :
      asistenciaHoy.estado === 'Tardanza' ? 'TARDANZA' :
        asistenciaHoy.estado === 'Falta' ? 'FALTA' :
          asistenciaHoy.estado === 'Campo' ? 'CAMPO' :
            asistenciaHoy.estado === 'Libre' ? 'LIBRE' : 'PENDIENTE'
  ) : undefined);

  // ¿Es día libre efectivo hoy?
  // Si Gerencia asignó estado explícito (ASISTIO/TARDANZA/FALTA/CAMPO), el día libre queda anulado y habilitado para registrar.
  // Si Gerencia asignó LIBRE o si por horario semanal es Libre sin cambio de Gerencia, se mantiene como descanso.
  const esDiaLibreHoy = estadoGerenciaHoy
    ? estadoGerenciaHoy === 'LIBRE'
    : (modalidadDiaHorarioHoy === 'Libre');

  const SEMANA_ACTUAL = diasAMostrar.map(d => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const fechaStr = `${yyyy}-${mm}-${dd}`

    const registro = p.historial.find(r => r.fecha === fechaStr)
    const asistencia = p.asistencia?.[fechaStr]

    const nombreDiaD = diasNombres[d.getDay()]
    const diaConfigD = horarioActivo?.dias?.find(x => x.dia.toLowerCase() === nombreDiaD.toLowerCase())
    let modHorarioD: 'Presencial' | 'Virtual' | 'Libre' = 'Presencial'
    if (diaConfigD?.modalidadDiaria) modHorarioD = diaConfigD.modalidadDiaria
    else if (diaConfigD?.modalidad) {
      const m = diaConfigD.modalidad.toLowerCase()
      modHorarioD = m === 'virtual' ? 'Virtual' : m === 'libre' ? 'Libre' : 'Presencial'
    } else {
      modHorarioD = (d.getDay() === 0 || d.getDay() === 6) ? 'Libre' : 'Presencial'
    }

    const estadoGerenciaD = registro?.estado || (asistencia?.estado ? (
      asistencia.estado === 'Asistió' ? 'ASISTIO' :
        asistencia.estado === 'Tardanza' ? 'TARDANZA' :
          asistencia.estado === 'Falta' ? 'FALTA' :
            asistencia.estado === 'Campo' ? 'CAMPO' :
              asistencia.estado === 'Libre' ? 'LIBRE' : 'PENDIENTE'
    ) : undefined)

    const esLibreD = estadoGerenciaD ? estadoGerenciaD === 'LIBRE' : (modHorarioD === 'Libre')

    if (registro) {
      return {
        ...registro,
        esLibre: esLibreD,
      }
    }
    return {
      fecha: fechaStr,
      estado: esLibreD ? ('LIBRE' as const) : ('PENDIENTE' as const),
      codigoHoja: esLibreD ? ('L' as const) : ('-' as const),
      horaIngreso: '',
      fuente: 'TERMINAL' as const,
      esLibre: esLibreD,
    }
  })

  // FASE 3: UI STRICTA EN TAILWIND CSS
  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case 'ASISTIO': return 'bg-emerald-100 text-emerald-800'
      case 'TARDANZA': return 'bg-amber-100 text-amber-800'
      case 'FALTA': return 'bg-red-100 text-red-800'
      case 'COMPENSADO': return 'bg-blue-100 text-blue-800'
      case 'FALTA_CUBIERTA': return 'bg-emerald-50 text-emerald-800'
      case 'SEMINARIO': return 'bg-sky-100 text-sky-800'
      case 'CAMPO': return 'bg-purple-100 text-purple-800'
      case 'LIBRE': return 'bg-slate-50 text-slate-600'
      default: return 'bg-slate-100 text-slate-500' // PENDIENTE
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Tarjeta de perfil del día ── */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center text-[18px] font-bold text-white shrink-0">
            {usuario.avatarIniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] text-slate-900 mb-0.5 flex items-center justify-between">
              <span className="truncate">{usuario.nombre}</span>
              {saldoHE > 0 && (
                <span className="bg-gradient-to-r from-blue-700 to-blue-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs shrink-0 ml-2">
                  HE: {saldoHE}h
                </span>
              )}
            </div>
            <div className="text-[12px] text-slate-500">
              {usuario.carrera || p.carrera || 'Sin carrera'} ·{' '}
              <span className="font-semibold text-blue-900 capitalize">
                {usuario?.modalidadBase || p?.modalidadBase || 'Semipresencial'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-2">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-semibold uppercase">Carrera SENATI</span>
            <span className="text-sm font-medium text-slate-800">{usuario?.carrera || 'Sin carrera registrada'}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 mt-2">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-semibold uppercase">Especialista (SENATI)</span>
              <span className="text-sm font-medium text-blue-700">{nombreEspecialista}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-semibold uppercase">Supervisor (MACROMEC)</span>
              <span className="text-sm font-medium text-green-700">{nombreSupervisor}</span>
            </div>
          </div>
        </div>

        {/* Badges de estado */}
        <div className="flex gap-2 flex-wrap">
          {/* Estado de hoy */}
          {(() => {
            if (esDiaLibreHoy) {
              return (
                <span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-[12px] font-bold flex items-center gap-1.5">
                  ☕ Día de descanso
                </span>
              )
            }
            const hoyActual = SEMANA_ACTUAL.find((d) => d.fecha === fechaHoy)
            if (hoyActual?.estado === 'ASISTIO') {
              return (
                <span className="bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-[12px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  ASISTIÓ — {hoyActual.horaIngreso || '08:05'}
                </span>
              )
            }
            if (esFeriadoHoy) {
              return (
                <span className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-[12px] font-bold flex items-center gap-1">
                  🏖️ Feriado: {esFeriadoHoy.motivo}
                </span>
              )
            }
            return (
              <span className="bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-[12px] font-bold flex items-center gap-1">
                <span className="animate-pulse">!</span> Sin registro hoy
              </span>
            )
          })()}

          {/* Almuerzo confirmado */}
          {p.almuerzosConfirmados.includes(fechaHoy) && (
            <span className="bg-blue-50 text-blue-800 rounded-full px-3 py-1 text-[12px] font-semibold">
              🍽️ Almuerzo confirmado
            </span>
          )}

          {/* Badge horas extras */}
          {saldoHE > 0 && (
            <span className="bg-gradient-to-br from-blue-900 to-blue-600 text-white rounded-full px-3 py-1 text-[12px] font-bold flex items-center gap-1">
              <Zap size={12} />
              +{saldoHE}h extras disponibles
            </span>
          )}
        </div>
      </Card>


      {/* ── Barra de Progreso Semanal Horizontal (7 segmentos) ── */}
      <Card className="p-4 gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-700" />
            <span className="font-bold text-[13px] text-slate-900">Progreso Semanal</span>
          </div>
          <div className="text-[12px] font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            = {bloquesSemana.sumaHoras}/{p.horasSemanalesTarget || horarioActivo?.totalHoras || 30}h
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {bloquesSemana.dias.map((d) => (
            <div
              key={d.fechaStr}
              className={`flex flex-col items-center justify-between py-2 rounded-xl border transition-all ${d.esHoy ? 'ring-2 ring-blue-500 ring-offset-1 font-bold' : ''
                } ${d.tipoBloque === 'check-verde'
                  ? 'bg-emerald-50/80 border-emerald-300'
                  : d.tipoBloque === 'check-rojo'
                    ? 'bg-red-50/80 border-red-300'
                    : d.tipoBloque === 'x-roja'
                      ? 'bg-red-50/60 border-red-200'
                      : d.tipoBloque === 'libre'
                        ? 'bg-slate-100/70 border-slate-200 text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${d.esHoy ? 'text-blue-700' : 'text-slate-500'
                }`}>
                {d.diaShort}
              </span>

              <div className="h-6 flex items-center justify-center my-0.5">
                {d.tipoBloque === 'check-verde' && (
                  <Check size={18} className="text-emerald-600 stroke-[3]" />
                )}
                {d.tipoBloque === 'check-rojo' && (
                  <Check size={18} className="text-red-600 stroke-[3]" />
                )}
                {d.tipoBloque === 'x-roja' && (
                  <X size={17} className="text-red-500 stroke-[2.5]" />
                )}
                {d.tipoBloque === 'libre' && (
                  <span className="font-extrabold text-[12px] text-slate-400">L</span>
                )}
                {d.tipoBloque === 'pendiente' && (
                  <span className="font-bold text-[14px] text-slate-400">?</span>
                )}
              </div>

              <span className={`text-[10px] font-semibold mt-1 ${d.esHoy ? 'text-blue-800 font-extrabold' : 'text-slate-400'
                }`}>
                {d.numeroDia}
              </span>
            </div>
          ))}
        </div>
      </Card>



      {/* ── Historial Reciente ── */}
      <div className="font-bold text-[14px] text-slate-900 pl-0.5 mt-2">
        Historial Reciente — Semana Actual
      </div>

      <div className="flex flex-col gap-3 mt-1">
        {SEMANA_ACTUAL.length === 0 ? (
          <div className="text-[13px] text-slate-400 italic text-center py-4">No hay historial esta semana.</div>
        ) : (
          SEMANA_ACTUAL.map((d) => {
            const isLibre = d.esLibre || d.estado === 'LIBRE'
            if (isLibre) {
              return (
                <div
                  key={d.fecha}
                  className="bg-slate-50/80 rounded-xl border border-slate-200/60 p-3 flex items-center gap-3 w-full opacity-70 select-none cursor-default"
                >
                  <div
                    className="w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center text-[12px] font-extrabold bg-slate-100 text-slate-500"
                  >
                    L
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-slate-700">
                      {formatFecha(d.fecha)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Día de descanso
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-500"
                  >
                    Libre
                  </span>
                </div>
              )
            }

            return (
              <button
                key={d.fecha}
                onClick={() => setFechaRegistroModal(d.fecha)}
                className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 w-full text-left active:bg-slate-50 transition-colors cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center text-[12px] font-extrabold ${getBadgeClass(d.estado)}`}
                >
                  {d.codigoHoja}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-slate-800">
                    {formatFecha(d.fecha)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {d.horaIngreso
                      ? `Ingreso: ${d.horaIngreso}`
                      : 'Sin registro de ingreso'}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getBadgeClass(d.estado)}`}
                >
                  {d.estado === 'ASISTIO'
                    ? 'ASISTIÓ'
                    : d.estado.replace(/_/g, ' ')}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* ── Tarjeta Plan de Aprendizaje (PEA) — Según carrera del practicante (Descarga Real Base64) ── */}
      {(() => {
        const handleDescargarArchivo = (pea: ArchivoPea) => {
          descargarArchivoBase64(
            pea.base64 || SAMPLE_PEA_PDF_BASE64,
            pea.nombre,
            pea.tipoMime || 'application/pdf'
          );
        };

        return (
          <Card className="mt-3">
            {/* Cabecera */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-[14px] text-slate-900 leading-tight">
                    Plan de Aprendizaje (PEA)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {carreraPracticante?.nombre || practicanteCompleto.carrera || 'Carrera SENATI'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                {peasCarrera.length} PDF{peasCarrera.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Documentos PEA de la Carrera con Descarga Real Base64 */}
            <div className="flex flex-col gap-2 mt-2">
              {peasCarrera.length > 0 ? (
                peasCarrera.map((pea, idx) => (
                  <div
                    key={pea.id || `${pea.nombre}-${idx}`}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-slate-800 truncate" title={pea.nombre}>
                          {pea.nombre}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          PEA oficial de la Carrera · Descargable
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDescargarArchivo(pea)}
                      className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 shadow-xs transition-colors cursor-pointer active:scale-95"
                    >
                      <Download size={13} />
                      Descargar
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1">
                  <span className="text-[12px] font-medium text-slate-500">
                    Sin PEA cargado para esta carrera
                  </span>
                  <span className="text-[10px] text-slate-400">
                    El Plan Específico de Aprendizaje aún no ha sido adjuntado en la configuración de la carrera.
                  </span>
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* ── Expediente Documentario (RF-28 a RF-37) ── */}
      {(() => {
        const docs = p.documentos ?? { cartaPresentacion: null, evidenciaFormulario: null, cartaAceptacionFirmada: null, convenioFirmado: null, registroVinculacion: null }
        const docsSubidos = Object.values(docs).filter(Boolean).length
        const pctDocs = Math.round((docsSubidos / 5) * 100)

        return (
          <Card className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-blue-600" />
                <span className="font-bold text-[14px] text-slate-900">Mi Expediente Documentario</span>
              </div>
              <span className={`text-[12px] font-bold ${docsSubidos === 5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {docsSubidos}/5
              </span>
            </div>

            <div className="h-[8px] bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${docsSubidos === 5 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${pctDocs}%` }}
              />
            </div>

            <button
              onClick={() => setExpedienteOpen(true)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-[14px] flex items-center justify-center gap-2 active:bg-blue-700 transition-colors"
            >
              <FileText size={17} />
              Abrir Expediente
            </button>
          </Card>
        )
      })()}

      {/* Modal Expediente */}
      {expedienteOpen && (
        <ModalExpediente
          practicante={p}
          usuario={usuario}
          plantilla={plantilla}
          onUpload={uploadDocumento}
          onCerrar={() => setExpedienteOpen(false)}
        />
      )}

      {/* BottomSheet Registro Diario */}
      {fechaRegistroModal && (
        <BottomSheetRegistroDiario
          fecha={fechaRegistroModal}
          practicante={p}
          usuarioActual={usuario}
          onClose={() => setFechaRegistroModal(null)}
        />
      )}
    </div>
  )
}

// ── BottomSheet Registro Diario (FASE 2) ────────────────────────
export function BottomSheetRegistroDiario({
  fecha,
  practicante,
  usuarioActual,
  onClose,
  vistaAuditoriaInicial = false
}: {
  fecha: string,
  practicante: import('../types').Practicante,
  usuarioActual: import('../types').User,
  onClose: () => void,
  vistaAuditoriaInicial?: boolean
}) {
  const guardarRegistroDiario = useAppStore(s => s.guardarRegistroDiario)

  const registroActual = practicante.registrosDiarios?.[fecha]
  const heInicial = registroActual?.horasExtras ?? practicante.asistencia?.[fecha]?.horasExtraSupervisor ?? 0
  const [horasExtrasDelDia, setHorasExtrasDelDia] = useState<number>(heInicial)
  const [showHeModal, setShowHeModal] = useState(false)
  const [heSeleccionado, setHeSeleccionado] = useState<number>(horasExtrasDelDia > 0 ? horasExtrasDelDia : 1)
  const [isEditingHe, setIsEditingHe] = useState(false)

  const [actividadesLocales, setActividadesLocales] = useState<import('../types').ActividadDiaria[]>(
    registroActual?.actividades || []
  )
  const [vistaAuditoria, setVistaAuditoria] = useState(vistaAuditoriaInicial)

  const handleGuardarClick = () => {
    if (usuarioActual.rol === 'SUPERVISOR') {
      setShowHeModal(true)
      setIsEditingHe(false)
      return
    }
    // Practicante guarda directamente sin declarar HE
    guardarRegistroDiario(practicante.id, fecha, actividadesLocales, usuarioActual.nombre, 0)
    toast.success('Registro diario guardado')
    onClose()
  }

  const handleConfirmarHe = (heFinal: number) => {
    setHorasExtrasDelDia(heFinal)
    guardarRegistroDiario(practicante.id, fecha, actividadesLocales, usuarioActual.nombre, heFinal)
    if (heFinal > 0) {
      toast.success(`Registro guardado con ${heFinal}h extras (Pendiente de validación de Gerencia)`)
    } else {
      toast.success('Registro diario guardado')
    }
    setShowHeModal(false)
    onClose()
  }

  const handleAddActividad = () => {
    setActividadesLocales([
      ...actividadesLocales,
      { id: Date.now().toString(), descripcion: '', tipo: 'Macromec' }
    ])
  }

  const handleEliminar = (id: string) => {
    setActividadesLocales(actividadesLocales.filter(a => a.id !== id))
  }

  const handleChange = (id: string, campo: keyof import('../types').ActividadDiaria, valor: any) => {
    setActividadesLocales(actividadesLocales.map(a => a.id === id ? { ...a, [campo]: valor } : a))
  }

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="w-full max-w-[430px] mx-auto bg-slate-50 rounded-t-[24px] p-5 max-h-[90vh] overflow-y-auto relative flex flex-col animate-in slide-in-from-bottom-full duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-[18px]">
                {vistaAuditoria ? 'Auditoría de Registro' : 'Registro de Actividades'}
              </h3>
              {usuarioActual.rol === 'SUPERVISOR' && (
                <span className="bg-blue-100 text-blue-700 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-blue-200 shadow-xs">
                  HE: {horasExtrasDelDia}
                </span>
              )}
            </div>
            <span className="text-[13px] text-slate-500">{formatFecha(fecha)} — {practicante.nombre}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Solo se muestra en perfil supervisor */}
            {usuarioActual.rol === 'SUPERVISOR' && (
              <button
                onClick={() => setVistaAuditoria(!vistaAuditoria)}
                className={`p-2 rounded-full transition-colors ${vistaAuditoria ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}
              >
                <History size={20} />
              </button>
            )}
            <button onClick={onClose} className="bg-slate-200 p-2 rounded-full text-slate-600 active:scale-95 transition-transform">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {vistaAuditoria ? (
          <div className="flex flex-col gap-4">
            {!registroActual?.historialVersiones?.length ? (
              <div className="text-center text-slate-400 py-8 text-[13px]">No hay historial de versiones.</div>
            ) : (
              <div className="flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-slate-200">
                {registroActual.historialVersiones.map((v, i) => (
                  <div key={v.id} className="flex gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-white border-2 border-blue-500 shrink-0 z-10 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex-1 shadow-sm">
                      <div className="text-[13px] text-slate-800 font-bold mb-1">
                        {v.accion === 'creado' ? 'Creación' : 'Edición'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Por <span className="font-semibold text-slate-700">{v.autor}</span> a las {new Date(v.fechaEdicion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {actividadesLocales.length === 0 ? (
              <div className="text-center text-slate-400 py-6 text-[13px]">
                {usuarioActual.rol === 'SUPERVISOR'
                  ? 'El aprendiz no ha registrado actividades hoy.'
                  : 'No has añadido ninguna actividad para este día.'}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {actividadesLocales.map((act) => (
                  <div key={act.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <input
                        type="text"
                        placeholder="Descripción de la actividad..."
                        value={act.descripcion}
                        onChange={(e) => handleChange(act.id, 'descripcion', e.target.value)}
                        className="flex-1 bg-transparent text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none w-full"
                      />
                      <button
                        onClick={() => handleEliminar(act.id)}
                        className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <select
                        value={act.tipo}
                        onChange={(e) => handleChange(act.id, 'tipo', e.target.value as 'Macromec' | 'SENATI')}
                        className="bg-slate-100 text-slate-700 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border-none outline-none"
                      >
                        <option value="Macromec">Macromec</option>
                        <option value="SENATI">SENATI</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleAddActividad}
              className="w-full border-2 border-dashed border-slate-300 text-slate-500 font-bold py-3 rounded-xl text-[13px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
            >
              <Plus size={16} />
              {usuarioActual.rol === 'SUPERVISOR' ? 'Agregar/Editar actividades por el alumno' : 'Añadir Trabajo'}
            </button>

            <button
              onClick={handleGuardarClick}
              className="w-full mt-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl text-[14px] flex items-center justify-center gap-2 active:bg-blue-700 transition-transform active:scale-[0.98]"
            >
              <CheckCircle2 size={18} />
              Guardar Registro
            </button>

            {/* Modal dinámico interceptor de Horas Extras para Supervisor */}
            {showHeModal && (
              <div className="fixed inset-0 z-[600] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="bg-blue-100 text-blue-800 font-extrabold text-[11px] px-2.5 py-1 rounded-full">
                      Control de Horas Extras
                    </span>
                    <button onClick={() => setShowHeModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X size={16} />
                    </button>
                  </div>

                  {!isEditingHe ? (
                    <>
                      <h4 className="font-bold text-slate-900 text-base leading-snug">
                        {heInicial > 0
                          ? '¿Desea actualizar las Horas Extras (HE) del estudiante?'
                          : `¿El practicante ${practicante.nombre} hizo horas extras hoy?`}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {heInicial > 0
                          ? `Actualmente tiene registrado ${heInicial}h extras para el día ${formatFecha(fecha)}.`
                          : 'Las horas extras ingresadas serán notificadas al panel de Gerencia para su oficialización.'}
                      </p>

                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmarHe(0)}
                          className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                          No (0h)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingHe(true)}
                          className="py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-xs"
                        >
                          Sí
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base leading-snug">
                          Horas Extras del Día
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Selecciona las horas extras realizadas hoy por {practicante.nombre}:
                        </p>
                      </div>

                      {/* Selector de valores válidos: 1, 1.5, 2, 2.5, 3... */}
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 1.5, 2, 2.5, 3, 3.5, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setHeSeleccionado(val)}
                            className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${heSeleccionado === val
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                          >
                            +{val}h
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 font-bold">Otro valor:</span>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={heSeleccionado}
                          onChange={(e) => setHeSeleccionado(parseFloat(e.target.value) || 0)}
                          className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-sm text-slate-800 outline-none focus:border-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-500">horas extras</span>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingHe(false)}
                          className="py-3 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                        >
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmarHe(heSeleccionado)}
                          className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-sm"
                        >
                          Confirmar HE y Guardar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal Expediente Documentario ────────────────────────────────
const DOC_CONFIG = [
  { key: 'cartaPresentacion', label: 'Carta de Presentación', rf: 'RF-28' },
  { key: 'evidenciaFormulario', label: 'Evidencia del Formulario', rf: 'RF-29' },
  { key: '__generador__', label: '', rf: '' },
  { key: 'cartaAceptacionFirmada', label: 'Carta de Aceptación Firmada', rf: 'RF-34' },
  { key: 'convenioFirmado', label: 'Convenio Firmado', rf: 'RF-35' },
  { key: 'registroVinculacion', label: 'Registro de Vinculación', rf: 'RF-36/37' },
] as const

function ModalExpediente({
  practicante,
  usuario,
  plantilla,
  onUpload,
  onCerrar,
}: {
  practicante: import('../types').Practicante
  usuario: any
  plantilla: import('../types').PlantillaAceptacion
  onUpload: (id: string, key: string, name: string) => void
  onCerrar: () => void
}) {
  const docs = practicante.documentos ?? {
    cartaPresentacion: null, evidenciaFormulario: null,
    cartaAceptacionFirmada: null, convenioFirmado: null,
    registroVinculacion: null,
  }

  const handleDescargarCarta = () => {
    const nombre = usuario?.nombre || practicante.nombre || 'Estudiante'
    const dni = usuario?.dni || practicante.dni || '--------'
    const carrera = usuario?.carrera || practicante.carrera || 'No definida'

    let contenido = plantilla?.contenidoHTML || '<p>Carta de Aceptación</p>'
    contenido = contenido
      .replace('[Nombre estudiante]', nombre)
      .replace('[DNI]', dni)
      .replace('[Carrera]', carrera)

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Carta de Aceptación</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:auto}h1{color:#1E3A8A;font-size:18px}p{line-height:1.6;font-size:14px}</style></head><body><h1>MACROMEC S.A.C. - Carta de Aceptación</h1><p><strong>Estudiante:</strong> ${nombre}</p><p><strong>DNI:</strong> ${dni}</p><p><strong>Carrera:</strong> ${carrera}</p><hr/>${contenido}<br/><p style="margin-top:40px;font-size:12px;color:#666">Documento generado automáticamente por el Sistema MACROMEC © 2026</p></body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Carta_Aceptacion_${nombre.replace(/\s/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Carta de Aceptación descargada correctamente')
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCerrar} />
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[20px] p-5 h-[90vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">

        <div className="flex items-center justify-between mb-3 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-[18px] leading-tight">Expediente Documentario</h3>
            <span className="text-[12px] text-slate-500 font-medium">Sube tus documentos requeridos</span>
          </div>
          <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        {/* Info Fechas de Convenio Sincronizadas */}
        {(() => {
          const semestres = useAppStore(s => s.semestres);
          const semestreActivo = semestres[0];
          return semestreActivo ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-5 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">Plazos Legales del Semestre Activo</span>
              <div className="text-[12px] text-indigo-700 font-medium flex justify-between">
                <span>Inicio de Convenio:</span>
                <span>{semestreActivo.fechaInicioConvenio}</span>
              </div>
              <div className="text-[12px] text-indigo-700 font-medium flex justify-between">
                <span>Fin de Convenio:</span>
                <span>{semestreActivo.fechaFinConvenio}</span>
              </div>
            </div>
          ) : null;
        })()}

        <div className="flex flex-col gap-3 pb-6">
          {DOC_CONFIG.map((item, idx) => {
            if (item.key === '__generador__') {
              return (
                <div key="gen" className="bg-blue-50 p-4 rounded-xl mb-1 border border-blue-100">
                  <div className="text-[12px] font-bold text-blue-700 uppercase tracking-wide mb-2">RF-32/33 — Generador de Carta</div>
                  <p className="text-[12px] text-blue-600 mb-3">Genera automáticamente tu Carta de Aceptación con los datos de tu cuenta.</p>
                  <button
                    onClick={handleDescargarCarta}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-[13px] flex items-center justify-center gap-2 active:bg-blue-700 transition-colors"
                  >
                    <Download size={16} />
                    Descargar Carta de Aceptación
                  </button>
                </div>
              )
            }

            const docKey = item.key as keyof typeof docs
            const value = docs[docKey]
            const inputId = `file-${item.key}-${idx}`

            return (
              <div key={item.key} className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.rf}</span>
                    <div className="text-[13px] font-bold text-slate-800">{item.label}</div>
                  </div>
                  {value ? (
                    <span className="bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                      <Check size={12} /> Subido
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                      Pendiente
                    </span>
                  )}
                </div>

                {value ? (
                  <div className="text-[12px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 truncate">
                    📄 {value}
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      id={inputId}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          onUpload(practicante.id, item.key, file.name)
                          toast.success(`${item.label} subido correctamente`)
                        }
                      }}
                    />
                    <label
                      htmlFor={inputId}
                      className="w-full bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 transition-colors"
                    >
                      <Upload size={15} />
                      Seleccionar archivo
                    </label>
                  </>
                )}

                {item.key === 'registroVinculacion' && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2 text-yellow-800 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>Recuerda solicitar la hoja de asistencia a tu especialista de seguimiento al entregar este registro.</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}// ============================================================
// DASHBOARD SUPERVISOR (NUEVO ROL - DÍA A DÍA)
// ============================================================
function DashboardSupervisor() {
  const todosPracticantes = useAppStore((s) => s.practicantes)
  const usuarioActual = useAppStore((s) => s.usuarioActual)

  // PASO 4: Filtro relacional estricto — el Supervisor solo ve sus practicantes
  const practicantes = usuarioActual
    ? todosPracticantes.filter((p) => p.monitorId === usuarioActual.id)
    : todosPracticantes

  // Requerimiento 1: Estado dinámico con new Date() (sin fechas estáticas hardcodeadas)
  const [fechaActualView, setFechaActualView] = useState<Date>(() => new Date())
  const [practicanteControlModal, setPracticanteControlModal] = useState<string | null>(null)
  const [practicanteRetiradoModal, setPracticanteRetiradoModal] = useState<import('../types').Practicante | null>(null)

  const handlePrevDay = () => {
    setFechaActualView((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }

  const handleNextDay = () => {
    setFechaActualView((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 1)
      return d
    })
  }

  const esHoy = (date: Date): boolean => {
    const hoy = new Date()
    return (
      date.getFullYear() === hoy.getFullYear() &&
      date.getMonth() === hoy.getMonth() &&
      date.getDate() === hoy.getDate()
    )
  }

  // Formato usando Intl.DateTimeFormat nativo ('es-ES')
  const formatFechaTitle = (date: Date): string => {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const formatted = formatter.format(date).replace(',', '')
    return esHoy(date) ? `Hoy (${formatted})` : formatted
  }

  // Ajustar la fecha a YYYY-MM-DD local
  const yyyy = fechaActualView.getFullYear()
  const mm = String(fechaActualView.getMonth() + 1).padStart(2, '0')
  const dd = String(fechaActualView.getDate()).padStart(2, '0')
  const fechaStr = `${yyyy}-${mm}-${dd}`

  const DIAS_SEMANA_MAP = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ] as const

  const nombreDiaActual = DIAS_SEMANA_MAP[fechaActualView.getDay()]

  const getInfoPracticanteDia = (p: import('../types').Practicante) => {
    // ── Lógica Temporal del Estado "Retirado" ──
    const esAlumnoRetirado = p.estado === 'retirado' || p.estadoLaboral === 'retirado'
    let esRetiradoEfectivo = false

    if (esAlumnoRetirado) {
      const fechaRetiroVal = p.fechaRetiro || p.retiro?.fechaInicio
      if (fechaRetiroVal) {
        // Normalización exacta a medianoche (00:00:00) para fechaActualView y fechaRetiro
        const dView = new Date(fechaActualView)
        dView.setHours(0, 0, 0, 0)

        let dRetiro: Date
        if (typeof fechaRetiroVal === 'string' && fechaRetiroVal.includes('-')) {
          const [ry, rm, rd] = fechaRetiroVal.split('T')[0].split('-').map(Number)
          dRetiro = new Date(ry, rm - 1, rd)
        } else {
          dRetiro = new Date(fechaRetiroVal)
        }
        dRetiro.setHours(0, 0, 0, 0)

        // Condición A: fechaActualView >= fechaRetiro -> Retirado (día de retiro y días posteriores)
        // Condición B: fechaActualView < fechaRetiro -> NO retirado (días anteriores al retiro)
        if (dView.getTime() >= dRetiro.getTime()) {
          esRetiradoEfectivo = true
        }
      } else {
        // Fallback preventivo
        esRetiradoEfectivo = true
      }
    }

    if (esRetiradoEfectivo) {
      return {
        tieneHorarioAprobado: false,
        esLibreEfectivo: false,
        esRetirado: true,
        modalidad: 'Presencial' as const,
        estado: 'PENDIENTE' as const,
      }
    }

    const horario = (p.horarioVigente && (p.horarioVigente.estado === 'Aprobado' || p.horarioVigente.estado === 'aprobado'))
      ? p.horarioVigente
      : (p.horarioAprobado && (p.horarioAprobado.estado === 'Aprobado' || p.horarioAprobado.estado === 'aprobado'))
        ? p.horarioAprobado
        : (p.horarioActual && (p.horarioActual.estado === 'Aprobado' || p.horarioActual.estado === 'aprobado'))
          ? p.horarioActual
          : undefined

    const tieneHorarioAprobado = !!horario
    if (!tieneHorarioAprobado) {
      return { tieneHorarioAprobado: false, esLibreEfectivo: false, esRetirado: false, modalidad: 'Presencial' as const, estado: 'PENDIENTE' as const }
    }

    const diaConfig = horario.dias?.find(
      (d) => d.dia.toLowerCase() === nombreDiaActual.toLowerCase()
    )

    let modalidadDiaHorario: 'Presencial' | 'Virtual' | 'Libre' = 'Presencial'
    if (diaConfig) {
      if (diaConfig.modalidadDiaria) {
        modalidadDiaHorario = diaConfig.modalidadDiaria
      } else if (diaConfig.modalidad) {
        const m = diaConfig.modalidad.toLowerCase()
        modalidadDiaHorario = m === 'virtual' ? 'Virtual' : m === 'libre' ? 'Libre' : 'Presencial'
      }
    } else {
      const dayOfWeek = fechaActualView.getDay()
      modalidadDiaHorario = (dayOfWeek === 0 || dayOfWeek === 6) ? 'Libre' : 'Presencial'
    }

    const regHoy = p.historial?.find((h) => h.fecha === fechaStr)
    const asistenciaHoy = p.asistencia?.[fechaStr]

    let estadoGerencia: import('../types').EstadoAsistencia | undefined = regHoy?.estado
    if (!estadoGerencia && asistenciaHoy?.estado) {
      const est = asistenciaHoy.estado.toUpperCase()
      if (est === 'ASISTIÓ' || est === 'ASISTIO') estadoGerencia = 'ASISTIO'
      else if (est === 'TARDANZA') estadoGerencia = 'TARDANZA'
      else if (est === 'FALTA') estadoGerencia = 'FALTA'
      else if (est === 'CAMPO') estadoGerencia = 'CAMPO'
      else if (est === 'LIBRE') estadoGerencia = 'LIBRE'
      else if (est === 'PENDIENTE') estadoGerencia = 'PENDIENTE'
    }

    // Sincronización en Cascada:
    // Si Gerencia asignó estado explícito (ej. ASISTIO, TARDANZA, FALTA, CAMPO), el día libre queda anulado.
    // Si asignó LIBRE, prevalece. Si no hay registro explícito, rige el horario aprobado.
    const esLibreEfectivo = estadoGerencia
      ? estadoGerencia === 'LIBRE'
      : (modalidadDiaHorario === 'Libre')

    let modalidadEfectiva: 'Presencial' | 'Virtual' = 'Presencial'
    if (regHoy?.modalidad && regHoy.modalidad !== 'libre') {
      modalidadEfectiva = regHoy.modalidad === 'virtual' ? 'Virtual' : 'Presencial'
    } else if (modalidadDiaHorario === 'Virtual' || p.modalidadBase === 'Virtual') {
      modalidadEfectiva = 'Virtual'
    }

    return {
      tieneHorarioAprobado: true,
      esLibreEfectivo,
      esRetirado: false,
      modalidad: modalidadEfectiva,
      estado: estadoGerencia || 'PENDIENTE',
    }
  }

  const renderBadges = (p: import('../types').Practicante) => {
    const info = getInfoPracticanteDia(p)

    // Condición Retirado
    if ((info as any).esRetirado) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="bg-red-50 text-red-600 border border-red-200/80 font-bold px-2 py-1 rounded-md text-[10px] whitespace-nowrap">
            Retirado
          </span>
        </div>
      )
    }

    // Condición 1: Sin Horario Aprobado -> mostrar "Horario por activar", ocultando asistencia y modalidades
    if (!info.tieneHorarioAprobado) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="bg-amber-50 text-amber-700 border border-amber-200/70 font-bold px-2 py-1 rounded-md text-[10px] whitespace-nowrap">
            Horario por activar
          </span>
        </div>
      )
    }

    // Condición: Día Libre efectivo -> renderiza badge "Libre" estático (sin "Pendiente")
    if (info.esLibreEfectivo) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded-md text-[10px] whitespace-nowrap">
            Libre
          </span>
        </div>
      )
    }

    // Condición: Día Laborable o Reacción al Cambio de Gerencia
    const isVirtual = info.modalidad === 'Virtual'
    const modLabel = isVirtual ? 'Virtual' : 'Presencial'
    const modColor = isVirtual ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'

    let estLabel = 'Pendiente'
    let estColor = 'bg-slate-100 text-slate-500'

    if (info.estado === 'ASISTIO') {
      estLabel = 'Asistió'
      estColor = 'bg-emerald-100 text-emerald-700'
    } else if (info.estado === 'TARDANZA') {
      estLabel = 'Tardanza'
      estColor = 'bg-amber-100 text-amber-700'
    } else if (info.estado === 'FALTA') {
      estLabel = 'Faltó'
      estColor = 'bg-red-100 text-red-700'
    } else if (info.estado === 'CAMPO') {
      estLabel = 'Campo'
      estColor = 'bg-purple-100 text-purple-700'
    }

    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        <span className={`${modColor} font-bold px-2 py-1 rounded-md text-[10px] whitespace-nowrap`}>
          {modLabel}
        </span>
        <span className={`${estColor} font-bold px-2 py-1 rounded-md text-[10px] whitespace-nowrap`}>
          {estLabel}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="font-bold text-[15px] text-slate-900 px-1">
        Panel de Control (Día a Día)
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <button
            onClick={handlePrevDay}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors border-none cursor-pointer"
            aria-label="Día anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="font-bold text-[14px] text-slate-800 capitalize select-none">
            📅 {formatFechaTitle(fechaActualView)}
          </div>
          <button
            onClick={handleNextDay}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors border-none cursor-pointer"
            aria-label="Día siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {practicantes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-[13px] italic">
            No tienes practicantes asignados actualmente
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {practicantes.map((p) => {
              const info = getInfoPracticanteDia(p)
              const isRetirado = (info as any).esRetirado

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (isRetirado) {
                      setPracticanteRetiradoModal(p)
                      return
                    }
                    if (!info.tieneHorarioAprobado) {
                      toast.info(`El practicante ${p.nombre} aún no tiene un horario aprobado por Gerencia`)
                      return
                    }
                    if (info.esLibreEfectivo) {
                      return
                    }
                    setPracticanteControlModal(p.id)
                  }}
                  className={`border rounded-xl p-2.5 flex flex-col justify-between text-left transition-colors ${isRetirado
                    ? 'bg-red-50/40 border-red-200/60 opacity-80 cursor-pointer'
                    : !info.tieneHorarioAprobado
                      ? 'bg-slate-50 border-slate-100 opacity-85 hover:bg-slate-100 cursor-pointer'
                      : info.esLibreEfectivo
                        ? 'bg-slate-50/70 border-slate-100 opacity-75 cursor-default select-none'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 active:bg-slate-200 cursor-pointer'
                    }`}
                >
                  <div className="font-bold text-[11px] text-slate-900 leading-tight mb-1 truncate w-full">
                    {p.nombre} {p.apellido ? p.apellido.split(' ')[0] : ''}
                  </div>
                  {renderBadges(p)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de solo lectura para practicante retirado (Supervisor) */}
      {practicanteRetiradoModal && (
        <div className="fixed inset-0 z-[500] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Practicante Retirado</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {practicanteRetiradoModal.nombre} {practicanteRetiradoModal.apellido}
                </p>
              </div>
              <span className="bg-red-100 text-red-700 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                Retirado
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Fecha de Retiro</span>
                <span className="text-[13px] font-semibold text-slate-800">
                  {practicanteRetiradoModal.fechaRetiro
                    ? (typeof practicanteRetiradoModal.fechaRetiro === 'string'
                      ? practicanteRetiradoModal.fechaRetiro.split('T')[0]
                      : new Date(practicanteRetiradoModal.fechaRetiro).toISOString().split('T')[0])
                    : (practicanteRetiradoModal.retiro?.fechaInicio || 'Fecha no registrada')}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Motivo de Retiro</span>
                <span className="text-[12px] font-medium text-slate-700 block mt-0.5">
                  {practicanteRetiradoModal.motivoRetiro || practicanteRetiradoModal.retiro?.motivo || 'Sin motivo registrado'}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-[11px] text-amber-800 font-medium text-center">
              ⚠️ El alumno está retirado. El registro de actividades se encuentra bloqueado.
            </div>

            <button
              onClick={() => setPracticanteRetiradoModal(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {practicanteControlModal && usuarioActual && (
        <BottomSheetRegistroDiario
          fecha={fechaStr}
          practicante={practicantes.find((p) => p.id === practicanteControlModal)!}
          usuarioActual={usuarioActual}
          onClose={() => setPracticanteControlModal(null)}
          vistaAuditoriaInicial={false}
        />
      )}
    </div>
  )
}

// ============================================================
function DashboardGerencia() {
  // PASO 4: GERENCIA ve todos los practicantes sin filtro
  const practicantes = useAppStore((s) => s.practicantes)
  const usuario = useAppStore((s) => s.usuarioActual)
  const cambiarModalidadHoy = useAppStore((s) => s.cambiarModalidadHoy)

  const [modalCumplesOpen, setModalCumplesOpen] = useState(false);

  const cumpleañosOrdenados = useMemo(() => {
    if (!practicantes) return [];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hoyActual = new Date();

    return practicantes.map(p => {
      const [year, month, day] = p.fechaNacimiento.split('-');
      const anioNac = parseInt(year, 10);
      const mesIndex = parseInt(month, 10) - 1;
      const diaNum = parseInt(day, 10);

      // Cálculo exacto de la edad actual
      let edad = hoyActual.getFullYear() - anioNac;
      const m = hoyActual.getMonth() - mesIndex;
      if (m < 0 || (m === 0 && hoyActual.getDate() < diaNum)) {
        edad--;
      }

      return {
        id: p.id,
        nombreCompleto: `${p.nombre} ${p.apellido || ''}`.trim(),
        dia: diaNum,
        mesIndex: mesIndex,
        mesTexto: meses[mesIndex],
        edadActual: edad,
        avatar: p.nombre.substring(0, 2).toUpperCase()
      };
    })
      .sort((a, b) => a.mesIndex === b.mesIndex ? a.dia - b.dia : a.mesIndex - b.mesIndex);
  }, [practicantes]);

  const mesActual = new Date().getMonth();
  const cumpleañosEsteMes = cumpleañosOrdenados.filter(c => c.mesIndex === mesActual);
  const borradorDiario = useAppStore((s) => s.borradorDiario)
  const marcarBorrador = useAppStore((s) => s.marcarBorrador)
  const mostrarAlertasFaltantes = useAppStore((s) => s.mostrarAlertasFaltantes)
  const setMostrarAlertasFaltantes = useAppStore((s) => s.setMostrarAlertasFaltantes)
  const confirmarLoteDiario = useAppStore((s) => s.confirmarLoteDiario)

  const HOY = new Date()
  const FECHA_HOY = HOY.toISOString().split('T')[0]
  const tituloHoyCapitalized = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'short' }).format(HOY)

  const [modalNotificar, setModalNotificar] = useState(false)
  const [observaciones, setObservaciones] = useState<Record<string, string>>({})

  // ── KPI: Solicitudes (reactivo desde store) ────────────────
  const pendientes = practicantes.filter(
    (p) => p.horarioPendiente?.estado === 'pendiente_aprobacion',
  )

  const getEstadoActivo = (p: import('../types').Practicante) =>
    borradorDiario[p.id] || p.historial.find((d) => d.fecha === FECHA_HOY)?.estado || 'PENDIENTE'

  // ── KPI: Presentes Hoy = Asistió + Campo + Tardanza (activos) ──
  const presentesHoy = practicantes.filter(
    (p) => {
      if (p.estadoLaboral !== 'activo') return false;
      return ['ASISTIO', 'CAMPO', 'TARDANZA'].includes(getEstadoActivo(p))
    }
  ).length

  // ── Almuerzos: REGLA ESTRICTA ──
  // SÓLO incluye a los practicantes con:
  // 1. horarioAprobado activo
  // 2. modalidadDiaria === 'Presencial' para HOY
  // 3. estadoAsistencia === 'ASISTIO' o 'CAMPO'
  const almuerzosHoy = practicantes.filter((p) => {
    const hActivo = p.horarioVigente || p.horarioAprobado;
    if (p.estadoLaboral !== 'activo' || !hActivo || (hActivo.estado !== 'Aprobado' && hActivo.estado !== 'aprobado')) return false

    const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const nombreDiaHoy = diasNombres[HOY.getDay()]
    const diaHorario = hActivo.dias.find(d => d.dia === nombreDiaHoy)
    const modalidadHoy = diaHorario ? diaHorario.modalidadDiaria : p.modalidadBase

    const estado = getEstadoActivo(p)
    return modalidadHoy === 'Presencial' && (estado === 'ASISTIO' || estado === 'CAMPO')
  })

  const handleCopiarWhatsApp = async () => {
    const lista = almuerzosHoy.map((p) => {
      const estado = getEstadoActivo(p)
      const sufijo = estado === 'CAMPO' ? ' (C)' : ''
      return `• ${p.nombre} ${p.apellido}${sufijo} ✓`
    }).join('\n')
    const msg = `🍽️ *MACROMEC — Almuerzos del día*\n📅 ${tituloHoyCapitalized}\n\n*Total almuerzos confirmados:* ${almuerzosHoy.length}\n\n*Lista de personas con almuerzo:*\n${lista}\n\n_Mensaje generado automáticamente_`
    try {
      await navigator.clipboard.writeText(msg)
      toast.success('📋 Mensaje copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar.')
    }
  }

  const handleMarcar = (id: string, estado: import('../types').EstadoAsistencia) => {
    marcarBorrador(id, estado)
  }

  const handleToggleModalidad = (id: string, modalidadActual: import('../types').Modalidad) => {
    const nueva: import('../types').Modalidad = modalidadActual === 'presencial' ? 'virtual' : 'presencial'
    cambiarModalidadHoy(id, nueva)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Título */}
      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
        Panel de Gerencia
        {usuario && (
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>
            — {usuario.nombre}
          </span>
        )}
      </div>

      {/* ── Banner Cumpleaños (RF-49) ── */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
            <span>🎂</span> Cumpleaños este mes
          </div>
          <button
            onClick={() => setModalCumplesOpen(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-100/50 px-3 py-1 rounded-full"
          >
            Ver todos
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {cumpleañosEsteMes.length > 0 ? (
            cumpleañosEsteMes.map(c => (
              <span key={c.id} className="text-sm font-medium text-indigo-900">
                • {c.nombreCompleto} <span className="text-indigo-500 font-normal">({c.dia} de {c.mesTexto})</span>
              </span>
            ))
          ) : (
            <span className="text-sm text-indigo-400 italic">No hay cumpleaños este mes.</span>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <KpiCard
          label="Solicitudes"
          value={pendientes.length}
          icon={<Clock size={14} />}
          color="linear-gradient(135deg,#1E3A8A,#2563EB)"
        />
        <KpiCard
          label="Presentes Hoy"
          value={presentesHoy}
          icon={<CheckCircle2 size={14} />}
          color="linear-gradient(135deg,#065f46,#059669)"
        />
        <KpiCard
          label="Almuerzos Hoy"
          value={almuerzosHoy.length}
          icon={<Users size={14} />}
          color="linear-gradient(135deg, #10B981, #059669)"
        />

      </div> {/* <-- Este es el cierre que agregaste, está perfecto */}

      {/* 👇 AGREGA ESTAS DOS LÍNEAS QUE FALTABAN 👇 */}
      <Card>
        <div className="flex flex-col gap-3">
          {/* 👆 ===================================== 👆 */}

          {practicantes.map((p) => {
            const reg = p.historial.find((h) => h.fecha === FECHA_HOY)
            // ...
            const estadoHistorial = reg?.estado
            const estadoBorrador = borradorDiario[p.id]
            const estadoActual = estadoBorrador || estadoHistorial || 'PENDIENTE'

            const tieneHEPendiente = p.hePendienteValidacion || Object.values(p.asistencia || {}).some(a => a.hePendienteValidacion === true);
            const mostrarAlerta = tieneHEPendiente || (estadoBorrador && estadoBorrador !== estadoHistorial) ||
              (mostrarAlertasFaltantes && !estadoBorrador && !estadoHistorial)

            // ── Estado laboral bloqueado ──────────────────────
            if (p.estadoLaboral === 'retirado') {
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 opacity-70">
                  <div>
                    <div className="font-semibold text-[13px] text-slate-500">
                      {p.nombre} {p.apellido}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {p.retiro?.motivo ?? 'Sin motivo registrado'}
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-slate-200 text-slate-500 px-2.5 py-1 rounded-full">
                    RETIRADO
                  </span>
                </div>
              )
            }

            // ── Fase 4: Horario no registrado ─────────────────
            const hActivo = p.horarioVigente || p.horarioAprobado;
            const tieneHorarioAprobado = hActivo && (hActivo.estado === 'Aprobado' || hActivo.estado === 'aprobado');

            if (!tieneHorarioAprobado) {
              return (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', opacity: 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {p.nombre} {p.apellido}
                    </div>
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                      Horario no registrado
                    </span>
                  </div>
                </div>
              )
            }

            const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
            const nombreDiaHoy = diasNombres[HOY.getDay()]
            const diaHorario = hActivo!.dias.find(d => d.dia === nombreDiaHoy)
            const modalidadHorarioHoy = diaHorario ? diaHorario.modalidadDiaria : p.modalidadBase

            // Sincronización Inmediata del Estado "Libre":
            // Si el estado de asistencia es LIBRE (asignado por Gerencia) o si no hay registro (PENDIENTE) y el horario es Libre
            const esLibreEfectivo = estadoActual === 'LIBRE' || (estadoActual === 'PENDIENTE' && modalidadHorarioHoy === 'Libre')
            const esVirtual = !esLibreEfectivo && ((reg?.modalidad === 'virtual') || (modalidadHorarioHoy === 'Virtual'))
            const isPresencial = !esLibreEfectivo && !esVirtual

            // ── Practicante ACTIVO ────────────────────────────
            return (
              <div key={p.id} style={{
                display: 'flex', flexDirection: 'column', padding: '10px 12px',
                background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
              }}>
                {/* Fila nombre + modalidad diaria */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {p.nombre} {p.apellido}
                      {tieneHEPendiente && (
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-extrabold text-[12px] animate-pulse" title="Horas Extras enviadas por supervisor pendientes de validación">
                          !
                        </span>
                      )}
                      {mostrarAlerta && !tieneHEPendiente && <span className="text-red-500 font-extrabold text-lg animate-pulse">!</span>}
                    </div>
                    {almuerzosHoy.some((a) => a.id === p.id) && (
                      <div style={{ fontSize: 10, color: '#059669', fontWeight: 700, marginTop: 2 }}>
                        🍽 Almuerzo confirmado
                      </div>
                    )}
                  </div>
                  {/* Badge Modalidad */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px', borderRadius: 20, border: 'none',
                      background: esLibreEfectivo ? '#f1f5f9' : esVirtual ? '#ede9fe' : '#dbeafe',
                      color: esLibreEfectivo ? '#64748b' : esVirtual ? '#6d28d9' : '#1e40af',
                      fontSize: 10, fontWeight: 800,
                    }}
                  >
                    {esLibreEfectivo ? '☕ Libre' : esVirtual ? '💻 Virtual' : '🏢 Presencial'}
                  </div>
                </div>

                {/* Botones de estado — condicionados por modalidad */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {esLibreEfectivo ? (
                    <button
                      disabled
                      style={{
                        flex: 1, padding: '10px 4px', borderRadius: 8, border: 'none',
                        background: '#f1f5f9',
                        color: '#64748b',
                        fontWeight: 700, fontSize: 12, cursor: 'not-allowed', width: '100%',
                      }}
                    >Libre</button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleMarcar(p.id, 'ASISTIO')}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                          background: estadoActual === 'ASISTIO' ? '#10b981' : '#f1f5f9',
                          color: estadoActual === 'ASISTIO' ? 'white' : '#64748b',
                          fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >✓ Asistió</button>
                      <button
                        onClick={() => handleMarcar(p.id, 'TARDANZA')}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                          background: estadoActual === 'TARDANZA' ? '#f59e0b' : '#f1f5f9',
                          color: estadoActual === 'TARDANZA' ? 'white' : '#64748b',
                          fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >T</button>
                      <button
                        onClick={() => handleMarcar(p.id, 'FALTA')}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                          background: estadoActual === 'FALTA' ? '#ef4444' : '#f1f5f9',
                          color: estadoActual === 'FALTA' ? 'white' : '#64748b',
                          fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >F</button>
                      {/* Campo: solo en Presencial */}
                      {isPresencial && (
                        <button
                          onClick={() => handleMarcar(p.id, 'CAMPO')}
                          style={{
                            flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
                            background: estadoActual === 'CAMPO' ? '#8b5cf6' : '#f1f5f9',
                            color: estadoActual === 'CAMPO' ? 'white' : '#64748b',
                            fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >Campo</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card >
      {/* ── Módulo Almuerzos (reactivo, sin datos propios) ── */}
      < Card >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🍽️</span> Módulo Almuerzos
          </div>
          <button
            onClick={handleCopiarWhatsApp}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#10b981', color: 'white', border: 'none',
              padding: '6px 12px', borderRadius: 8, fontSize: 11,
              fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16,185,129,0.2)',
            }}
          >
            <Clipboard size={12} /> Copiar
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, fontWeight: 500 }}>
          Solo Presencial + Asistió/Campo ({almuerzosHoy.length} ración{almuerzosHoy.length !== 1 ? 'es' : ''})
        </div>
        {
          almuerzosHoy.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
              Sin raciones confirmadas aún
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {almuerzosHoy.map((p) => {
                const estado = getEstadoActivo(p)
                const esCampo = estado === 'CAMPO'
                return (
                  <span
                    key={p.id}
                    style={{
                      background: '#d1fae5', color: '#065f46',
                      fontSize: 11, fontWeight: 600,
                      padding: '4px 10px', borderRadius: 12,
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    {p.nombre} {p.apellido?.[0] || ''}. ✓
                  </span>
                )
              })}
            </div>
          )
        }
      </Card >

      {/* ── Botón Notificar Incidencias (RF-51) ── */}
      < button
        onClick={() => {
          const hayFaltantes = practicantes.some(p => p.estadoLaboral === 'activo' && !borradorDiario[p.id] && !p.historial.find(h => h.fecha === FECHA_HOY)?.estado)
          if (hayFaltantes) {
            setMostrarAlertasFaltantes(true)
          }
          setModalNotificar(true)
        }
        }
        className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl text-[14px] active:bg-slate-900 transition-colors mt-2"
      >
        Notificar asistencia
      </button >

      {/* Modal BottomSheet Notificar Asistencia */}
      {
        modalNotificar && (
          <div className="fixed inset-0 z-[500] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setModalNotificar(false)} />
            <div className="w-full max-w-[430px] mx-auto bg-slate-50 rounded-t-[24px] p-5 max-h-[90vh] overflow-y-auto relative flex flex-col animate-in slide-in-from-bottom-full duration-300">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-[18px]">Notificar asistencia</h3>
                  <span className="text-[13px] text-slate-500 capitalize">{tituloHoyCapitalized}</span>
                </div>
                <button onClick={() => setModalNotificar(false)} className="bg-slate-200 p-2 rounded-full text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {practicantes.filter(p => {
                  const est = getEstadoActivo(p)
                  return est === 'TARDANZA' || est === 'FALTA';
                }).map(p => {
                  const est = getEstadoActivo(p)
                  return (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[13px] text-slate-800">{p.nombre} {p.apellido}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${est === 'FALTA' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {est}
                        </span>
                      </div>
                      <textarea
                        placeholder="Observación (ej. Justificación, tardanza...)"
                        value={observaciones[p.id] || ''}
                        onChange={e => setObservaciones(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[12px] resize-none outline-none focus:border-blue-400"
                        rows={2}
                      />
                    </div>
                  )
                })}

                {practicantes.filter(p => {
                  const est = getEstadoActivo(p)
                  return est === 'TARDANZA' || est === 'FALTA';
                }).length === 0 && (
                    <div className="text-center text-slate-500 text-[13px] py-4 bg-white border border-slate-200 rounded-xl">
                      No hay practicantes con tardanza o falta para hoy.
                    </div>
                  )}

                <button
                  onClick={() => {
                    const payload = Object.entries(observaciones).map(([id, obs]) => ({
                      id,
                      observacion: obs
                    }))
                    confirmarLoteDiario(FECHA_HOY, payload)
                    toast.success('Lote confirmado exitosamente')
                    setModalNotificar(false)
                    setObservaciones({})
                  }}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl text-[14px]"
                >
                  Confirmar asistencia
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal Cumpleaños (RF-49 ampliado) */}
      {
        modalCumplesOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-5 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800">Cumpleaños del Año</h3>
                <button onClick={() => setModalCumplesOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 font-bold">✕</button>
              </div>

              <div className="overflow-y-auto flex-1 flex flex-col gap-3 pr-2">
                {cumpleañosOrdenados.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border ${c.mesIndex === mesActual ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                        {c.avatar}
                      </div>
                      <span className="font-bold text-sm text-slate-700">{c.nombreCompleto}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold ${c.mesIndex === mesActual ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                      {c.dia} {c.mesTexto}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}




// ============================================================
// MAIN EXPORT
// ============================================================

export default function HoyScreen() {
  const rolActivo = useAppStore((s) => s.rolActivo)

  return (
    <div>
      {rolActivo === 'PRACTICANTE' && <DashboardPracticante />}
      {rolActivo === 'SUPERVISOR' && <DashboardSupervisor />}
      {rolActivo === 'GERENCIA' && <DashboardGerencia />}
    </div>
  )
}

// ── Utilidades ─────────────────────────────────────────────────

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dias = [
    'Dom',
    'Lun',
    'Mar',
    'Mié',
    'Jue',
    'Vie',
    'Sáb',
  ]
  const meses = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ]
  const dow = new Date(y, m - 1, d).getDay()
  return `${dias[dow]} ${d} ${meses[m - 1]}`
}

function estadoBg(estado: string): string {
  return (
    ({
      ASISTIO: '#d1fae5',
      TARDANZA: '#fef3c7',
      FALTA: '#fee2e2',
      COMPENSADO: '#dbeafe',
      FALTA_CUBIERTA: '#f0fdf4',
      SEMINARIO: '#e0f2fe',
      CAMPO: '#f3e8ff',
      LIBRE: '#f8fafc',
      PENDIENTE: '#f1f5f9',
    } as Record<string, string>)[estado] ?? '#f1f5f9'
  )
}

function estadoColor(estado: string): string {
  return (
    ({
      ASISTIO: '#065f46',
      TARDANZA: '#92400e',
      FALTA: '#991b1b',
      COMPENSADO: '#1e40af',
      FALTA_CUBIERTA: '#065f46',
      SEMINARIO: '#0c4a6e',
      CAMPO: '#5b21b6',
      LIBRE: '#475569',
      PENDIENTE: '#64748b',
    } as Record<string, string>)[estado] ?? '#64748b'
  )
}
