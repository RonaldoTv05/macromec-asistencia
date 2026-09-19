import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Send, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'
import type { DiaHorario, Modalidad, RegistroDia } from '../types'

// ── Utilidades ─────────────────────────────────────────────────

function calcHoras(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  const diff = hf * 60 + mf - (hi * 60 + mi)
  return Math.round((diff / 60) * 10) / 10
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const meses = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
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

// ── Constantes ────────────────────────────────────────────────

const DIAS_SEMANA: { key: DiaHorario['dia']; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const MODALIDAD_LABELS: Record<Modalidad, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  libre: 'Libre',
  falto: 'Faltó',
  descanso: 'Descanso',
}

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
}

type DiaForm = {
  dia: DiaHorario['dia']
  modalidad: Modalidad
  horaInicio: string
  horaFin: string
}

// ============================================================
// VISTA PRACTICANTE — Declaración de Horario Semanal
// ============================================================

const FECHA_HOY = '2026-09-18' // Mock

function PracticanteHorarios() {
  const practicantes = useAppStore((s) => s.practicantes)
  const enviarHorario = useAppStore((s) => s.enviarHorario)
  const cancelarHorario = useAppStore((s) => s.cancelarHorario)
  const acumularHorasExtras = useAppStore((s) => s.acumularHorasExtras)
  const extraHoursBalances = useAppStore((s) => s.extraHoursBalances)
  const p = practicantes[0]
  const balance = extraHoursBalances[0]

  const [diasForm, setDiasForm] = useState<DiaForm[]>(
    DIAS_SEMANA.map((d, i) => ({
      dia: d.key,
      modalidad:
        (p.horarioActual?.dias[i]?.modalidad ?? 'presencial') as Modalidad,
      horaInicio: p.horarioActual?.dias[i]?.horaInicio ?? '08:00',
      horaFin: p.horarioActual?.dias[i]?.horaFin ?? '14:00',
    })),
  )
  
  // Acordeón Inteligente (Single-Open)
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  
  // Estado local para días de descanso marcados (Sab/Dom)
  const [diasDescanso, setDiasDescanso] = useState<Record<string, boolean>>({})
  
  // Modal confirmación envío incompleto
  const [modalIncompleto, setModalIncompleto] = useState(false)

  const totalHoras = diasForm.reduce((s, d) => {
    if (d.modalidad === 'libre' || d.modalidad === 'falto' || diasDescanso[d.dia]) return s
    // Días pasados bloqueados no cuentan en la sumatoria editable, pero se asume que se declaran
    return s + calcHoras(d.horaInicio, d.horaFin)
  }, 0)

  // Ya no se bloquea si excede 30h
  const esValido = totalHoras >= 30
  const excedente = Math.max(0, totalHoras - 30)
  
  const diasPasados = ['lunes', 'martes'] // Lunes y martes bloqueados (registrados)
  const diasFuturos = ['sabado', 'domingo'] // Solo el fin de semana es futuro

  const toggleDia = (dia: string) => {
    if (diasPasados.includes(dia) || diasFuturos.includes(dia) || diasDescanso[dia]) return // bloqueado
    setDiaAbierto((prev) => (prev === dia ? null : dia))
  }

  const updateDia = (
    dia: DiaHorario['dia'],
    campo: Partial<DiaForm>,
  ) => {
    setDiasForm((prev) =>
      prev.map((d) => (d.dia === dia ? { ...d, ...campo } : d)),
    )
  }

  const procesarEnvio = async () => {
    setEnviando(true)
    await new Promise((r) => setTimeout(r, 800))
    const diasFinales: DiaHorario[] = diasForm.map((d) => ({
      dia: d.dia,
      modalidad: d.modalidad,
      horaInicio: d.horaInicio,
      horaFin: d.horaFin,
      horasCalculadas:
        (d.modalidad === 'libre' || d.modalidad === 'falto' || diasDescanso[d.dia]) ? 0 : calcHoras(d.horaInicio, d.horaFin),
    }))
    
    // Si hay excedente, acumular HE
    if (excedente > 0) {
      acumularHorasExtras(p.id, excedente, `Excedente declarado Sem. 38`)
    }
    
    enviarHorario(p.id, diasFinales)
    setEnviando(false)
    setModalIncompleto(false)
    toast.success('✅ Horario enviado — PENDIENTE DE APROBACIÓN POR SUPERVISOR')
  }

  const handleEnviarClick = () => {
    if (totalHoras < 30) {
      // Advertencia de envío incompleto
      setModalIncompleto(true)
    } else {
      procesarEnvio()
    }
  }

  const handleCancelarEnvio = () => {
    cancelarHorario(p.id)
    toast.info('Envío cancelado, puedes editar tu horario nuevamente.')
  }

  const pendienteActual = p.horarioPendiente

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Banner estado horario */}
      {pendienteActual && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Clock size={18} style={{ color: 'white', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: 12, fontWeight: 700, color: 'white' }}
            >
              Horario enviado — En revisión
            </div>
            <div
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}
            >
              Semana {pendienteActual.semana} ·{' '}
              {pendienteActual.totalHoras}h declaradas
            </div>
          </div>
          <button
            onClick={handleCancelarEnvio}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Eliminar envío"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Formulario declaración */}
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: 16,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: '#0f172a',
            marginBottom: 4,
          }}
        >
          📋 Declaración de Horario — Semana 38
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#94a3b8',
            marginBottom: 12,
          }}
        >
          Declara tu horario para la próxima semana
        </div>

        {DIAS_SEMANA.map((d) => {
          const form = diasForm.find((f) => f.dia === d.key)!
          const esDescanso = diasDescanso[d.key]
          const esPasado = diasPasados.includes(d.key)
          const esFinde = d.key === 'sabado' || d.key === 'domingo'
          
          let horas = 0
          if (!esDescanso && form.modalidad !== 'libre' && form.modalidad !== 'falto') {
            horas = calcHoras(form.horaInicio, form.horaFin)
          }
          
          const isOpen = diaAbierto === d.key

          // Estilos base de la fila
          const isFuturo = diasFuturos.includes(d.key)
          const isBlocked = esPasado || isFuturo || esDescanso
          
          return (
            <div
              key={d.key}
              style={{ 
                borderTop: '1px solid #f1f5f9', 
                marginTop: 4,
                opacity: isBlocked ? 0.7 : 1,
                background: form.modalidad === 'falto' ? '#FEF2F2' : 'transparent',
                borderRadius: form.modalidad === 'falto' ? 8 : 0,
                border: form.modalidad === 'falto' ? '1px solid #FCA5A5' : 'none',
                padding: form.modalidad === 'falto' ? '0 8px' : 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 0',
                  gap: 8,
                }}
              >
                <button
                  id={`dia-toggle-${d.key}`}
                  onClick={() => toggleDia(d.key)}
                  disabled={isBlocked}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    cursor: isBlocked ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: isBlocked ? '#94a3b8' : '#1e293b',
                      width: 65,
                      textAlign: 'left',
                    }}
                  >
                    {d.label}
                  </span>
                  
                  {/* Badges de estado / Modalidad */}
                  {esPasado ? (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      ✓ Registrado
                    </span>
                  ) : esDescanso ? (
                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                      Descansó
                    </span>
                  ) : isFuturo ? (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                      ⏳ Futuro
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontWeight: 600,
                        background:
                          form.modalidad === 'presencial' ? '#eff6ff'
                            : form.modalidad === 'virtual' ? '#f0fdf4'
                            : form.modalidad === 'falto' ? '#fee2e2'
                            : '#fafafa',
                        color:
                          form.modalidad === 'presencial' ? '#1e40af'
                            : form.modalidad === 'virtual' ? '#059669'
                            : form.modalidad === 'falto' ? '#991b1b'
                            : '#94a3b8',
                      }}
                    >
                      {MODALIDAD_LABELS[form.modalidad]}
                    </span>
                  )}
                  
                  <span
                    style={{
                      fontSize: 11,
                      color: isBlocked ? '#94a3b8' : '#64748b',
                      fontWeight: 600,
                      flex: 1,
                      textAlign: 'right',
                    }}
                  >
                    {horas > 0 ? `${horas}h` : '—'}
                  </span>
                  
                  {!isBlocked && (
                    isOpen ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />
                  )}
                </button>

                {/* Botón rápido de descanso para el finde */}
                {esFinde && !esDescanso && (
                  <button
                    onClick={() => setDiasDescanso(prev => ({ ...prev, [d.key]: true }))}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Descanso
                  </button>
                )}
                {esDescanso && (
                  <button
                    onClick={() => setDiasDescanso(prev => ({ ...prev, [d.key]: false }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Contenido Acordeón */}
              {isOpen && !isBlocked && (
                <div
                  style={{
                    paddingBottom: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* Selector modalidad */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(
                      ['presencial', 'virtual', 'libre', 'falto'] as Modalidad[]
                    ).map((m) => (
                      <button
                        key={m}
                        id={`modal-${d.key}-${m}`}
                        onClick={() => updateDia(d.key, { modalidad: m })}
                        style={{
                          flex: 1,
                          borderRadius: 8,
                          padding: '7px 4px',
                          fontSize: 11,
                          fontWeight: 600,
                          border:
                            form.modalidad === m
                              ? (m === 'falto' ? '2px solid #ef4444' : '2px solid #2563EB')
                              : '1.5px solid #e2e8f0',
                          background:
                            form.modalidad === m 
                              ? (m === 'falto' ? '#fee2e2' : '#eff6ff') 
                              : 'white',
                          color:
                            form.modalidad === m 
                              ? (m === 'falto' ? '#991b1b' : '#1e40af') 
                              : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        {MODALIDAD_LABELS[m]}
                      </button>
                    ))}
                  </div>

                  {/* Horario */}
                  {form.modalidad !== 'libre' && form.modalidad !== 'falto' && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <label
                          htmlFor={`hora-inicio-${d.key}`}
                          style={{
                            fontSize: 10,
                            color: '#94a3b8',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          ENTRADA
                        </label>
                        <input
                          id={`hora-inicio-${d.key}`}
                          type="time"
                          value={form.horaInicio}
                          onChange={(e) =>
                            updateDia(d.key, {
                              horaInicio: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1.5px solid #e2e8f0',
                            fontSize: 13,
                            color: '#1e293b',
                            outline: 'none',
                            background: 'white',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          color: '#94a3b8',
                          fontSize: 16,
                          marginTop: 16,
                        }}
                      >
                        →
                      </div>
                      <div style={{ flex: 1 }}>
                        <label
                          htmlFor={`hora-fin-${d.key}`}
                          style={{
                            fontSize: 10,
                            color: '#94a3b8',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: 4,
                          }}
                        >
                          SALIDA
                        </label>
                        <input
                          id={`hora-fin-${d.key}`}
                          type="time"
                          value={form.horaFin}
                          onChange={(e) =>
                            updateDia(d.key, { horaFin: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1.5px solid #e2e8f0',
                            fontSize: 13,
                            color: '#1e293b',
                            outline: 'none',
                            background: 'white',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Total validador */}
        <div
          style={{
            marginTop: 12,
            background: esValido
              ? '#d1fae5'
              : '#fef9c3',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: esValido
                ? '#065f46'
                : '#92400e',
            }}
          >
            Total declarado
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: esValido
                ? '#059669'
                : '#d97706',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {totalHoras.toFixed(1)}h / 30h{' '}
            {excedente > 0 && (
              <span style={{ fontSize: 10, background: '#047857', color: 'white', padding: '2px 6px', borderRadius: 6 }}>
                +{excedente}h extras
              </span>
            )}
          </span>
        </div>

        <button
          id="btn-enviar-horario"
          onClick={handleEnviarClick}
          disabled={enviando || !!pendienteActual}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '13px 0',
            background: (enviando || !!pendienteActual)
              ? '#94a3b8'
              : 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: (enviando || !!pendienteActual) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
        >
          <Send size={16} />
          {enviando ? 'Enviando…' : 'Guardar y Enviar Horario'}
        </button>
      </div>

      {/* Historial Mensual (reemplaza historial reciente) */}
      <HistorialMensual historial={p.historial} fechaIngreso={p.fechaIngreso || '2026-09-01'} />

      {/* Modal Incompleto */}
      {modalIncompleto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 20, width: '100%', maxWidth: 350 }}>
            <h3 style={{ marginTop: 0, fontSize: 18, color: '#0f172a' }}>⚠️ Horario Incompleto</h3>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              ¿Seguro que deseas enviar tu horario incompleto? Declaraste <strong>{totalHoras.toFixed(1)}h</strong> de las 30h requeridas.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setModalIncompleto(false)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, color: '#475569' }}
              >
                Corregir
              </button>
              <button
                onClick={procesarEnvio}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#d97706', color: 'white', fontWeight: 600 }}
              >
                Confirmar Envío
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HistorialMensual({ historial, fechaIngreso = '2026-09-01' }: { historial: RegistroDia[], fechaIngreso?: string }) {
  const [mesOffset, setMesOffset] = useState(0)
  
  // Base date for navigation
  const baseDate = new Date(FECHA_HOY) // "2026-09-16"
  baseDate.setMonth(baseDate.getMonth() + mesOffset)
  
  const mesActual = baseDate.getMonth()
  const anioActual = baseDate.getFullYear()
  
  const ingresoDate = new Date(fechaIngreso)
  
  // Validar si el mes mostrado es válido (no futuro y no antes del mes de ingreso)
  const isFutureMonth = mesOffset > 0
  const isBeforeIngreso = (anioActual < ingresoDate.getFullYear()) || (anioActual === ingresoDate.getFullYear() && mesActual < ingresoDate.getMonth())
  
  const isValidMonth = !isFutureMonth && !isBeforeIngreso

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  
  // Construir calendario
  const primerDiaMes = new Date(anioActual, mesActual, 1).getDay() // 0 = Domingo
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
  
  const diasArr = []
  for (let i = 0; i < primerDiaMes; i++) {
    diasArr.push(null)
  }
  for (let d = 1; d <= diasEnMes; d++) {
    diasArr.push(d)
  }

  // Filtrar historial del mes
  const getBadgeForDay = (dia: number) => {
    const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const reg = historial.find(h => h.fecha === fechaStr)
    if (!reg) return null
    if (reg.estado === 'ASISTIO' || reg.estado === 'COMPENSADO') return '#10b981' // Verde
    if (reg.estado === 'TARDANZA') return '#f59e0b' // Ambar
    if (reg.estado === 'FALTA') return '#ef4444' // Rojo
    if (reg.estado === 'SEMINARIO') return '#3b82f6' // Azul
    if (reg.estado === 'PENDIENTE') return '#94a3b8' // Gris
    if (reg.estado === 'LIBRE' || reg.estado === 'CAMPO') return '#94a3b8' // Gris
    return '#94a3b8'
  }

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button 
          onClick={() => setMesOffset(m => m - 1)}
          style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer' }}
        >
          ‹
        </button>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
          {meses[mesActual]} {anioActual}
        </div>
        <button 
          onClick={() => setMesOffset(m => m + 1)}
          disabled={mesOffset >= 0}
          style={{ background: 'none', border: 'none', fontSize: 18, color: mesOffset >= 0 ? '#cbd5e1' : '#64748b', cursor: mesOffset >= 0 ? 'default' : 'pointer' }}
        >
          ›
        </button>
      </div>

      {!isValidMonth ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
          Sin registros para este mes
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px 8px' }}>
            {diasArr.map((dia, i) => (
              <div key={i} style={{ height: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {dia ? (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{dia}</span>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: getBadgeForDay(dia) || 'transparent', marginTop: 2 }} />
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}



// ============================================================
// VISTA SUPERVISOR — Aprobación de Horarios
// ============================================================

function SupervisorHorarios() {
  const practicantes = useAppStore((s) => s.practicantes)
  const aprobarHorario = useAppStore((s) => s.aprobarHorario)
  const rechazarHorario = useAppStore((s) => s.rechazarHorario)

  const pendientes = practicantes.filter(
    (p) =>
      p.horarioPendiente &&
      p.horarioPendiente.estado === 'pendiente_aprobacion',
  )

  const handleAprobar = (id: string, nombre: string) => {
    aprobarHorario(id)
    toast.success(`✅ Horario de ${nombre} aprobado`)
  }

  const handleRechazar = (id: string, nombre: string) => {
    rechazarHorario(id)
    toast.warning(`❌ Horario de ${nombre} devuelto a estado editable (restando horas extras)`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Solicitudes de horario */}
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: 16,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: '#0f172a',
            marginBottom: 12,
          }}
        >
          📥 Solicitudes de Horario ({pendientes.length})
        </div>

        {pendientes.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '20px 0',
              color: '#94a3b8',
              fontSize: 13,
            }}
          >
            <CheckCircle2
              size={32}
              style={{
                margin: '0 auto 8px',
                display: 'block',
                color: '#cbd5e1',
              }}
            />
            Sin solicitudes pendientes
          </div>
        ) : (
          pendientes.map((p) => {
            const horasSemanales = p.horarioPendiente?.totalHoras || 0;
            const extra = Math.max(0, horasSemanales - 30);

            return (
              <div
                key={p.id}
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: 12,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 9999,
                      flexShrink: 0,
                      background:
                        'linear-gradient(135deg,#1E3A8A,#2563EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {p.nombre[0]}
                    {p.apellido[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: '#1e293b',
                      }}
                    >
                      {p.nombre} {p.apellido}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Semana {p.horarioPendiente?.semana} ·{' '}
                      {horasSemanales}h declaradas 
                      {extra > 0 && <span style={{ color: '#059669', fontWeight: 600 }}> (+{extra}h extra)</span>}
                    </div>
                  </div>
                </div>

                {/* Resumen días */}
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  {p.horarioPendiente?.dias.map((d) => (
                    <div
                      key={d.dia}
                      style={{
                        flex: 1,
                        minWidth: 50,
                        borderRadius: 8,
                        padding: '6px 4px',
                        textAlign: 'center',
                        background:
                          d.modalidad === 'presencial'
                            ? '#eff6ff'
                            : d.modalidad === 'virtual'
                              ? '#f0fdf4'
                              : '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#94a3b8',
                        }}
                      >
                        {DIAS_LABEL[d.dia]}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color:
                            d.modalidad === 'presencial'
                              ? '#1e40af'
                              : d.modalidad === 'virtual'
                                ? '#059669'
                                : '#94a3b8',
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {d.modalidad === 'libre'
                          ? 'Libre'
                          : `${d.horaInicio}–${d.horaFin}`}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#1e293b',
                          marginTop: 1,
                        }}
                      >
                        {d.horasCalculadas > 0
                          ? `${d.horasCalculadas}h`
                          : '—'}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    id={`btn-aprobar-${p.id}`}
                    onClick={() =>
                      handleAprobar(
                        p.id,
                        `${p.nombre} ${p.apellido}`,
                      )
                    }
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 10,
                      border: 'none',
                      background:
                        'linear-gradient(135deg,#065f46,#059669)',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={15} /> Aprobar
                  </button>
                  <button
                    id={`btn-rechazar-${p.id}`}
                    onClick={() => handleRechazar(p.id, `${p.nombre} ${p.apellido}`)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 10,
                      border: 'none',
                      background: '#fee2e2',
                      color: '#dc2626',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <X size={15} /> Rechazar
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================================
// MAIN EXPORT — Routing por rol
// ============================================================

export default function HorariosScreen() {
  const rolActivo = useAppStore((s) => s.rolActivo)

  if (rolActivo === 'SUPERVISOR') return <SupervisorHorarios />
  return <PracticanteHorarios />
}
