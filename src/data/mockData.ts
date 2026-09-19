import type {
  CodigoHoja,
  DiaHorario,
  EstadoAsistencia,
  EstadoLaboral,
  ExtraHoursBalance,
  HorarioSemanal,
  Modalidad,
  Practicante,
  RegistroDia,
  SemanaFisica,
  User,
} from '../types'

// ============================================================
// USUARIOS DEL SISTEMA — 3 roles fijos
// ============================================================

export const USUARIOS_SISTEMA: User[] = [
  {
    id: 'usr-practicante',
    username: 'JuniorS',
    password: 'JuniorS05',
    nombre: 'Junior Sandoval',
    rol: 'PRACTICANTE',
    email: 'juniors@macromec.pe',
    dni: '72849102',
    tel: '+51 984 123 456',
    carrera: 'Ingeniería Industrial',
    avatarIniciales: 'JS',
  },
  {
    id: 'usr-supervisor',
    username: 'RonaldoTv',
    password: 'RonaldoTv05',
    nombre: 'Ronaldo Torres',
    rol: 'SUPERVISOR',
    email: 'ronaldotv@macromec.pe',
    dni: '70192834',
    tel: '+51 912 345 678',
    carrera: 'Supervisión de Operaciones',
    avatarIniciales: 'RT',
  },
  {
    id: 'usr-gerencia',
    username: 'Juan',
    password: 'Juan05',
    nombre: 'Juan Directivo',
    rol: 'GERENCIA',
    email: 'juan.gerencia@macromec.pe',
    dni: '08472910',
    tel: '+51 999 888 777',
    carrera: 'Gerencia General',
    avatarIniciales: 'JD',
  },
]

// ============================================================
// HELPERS INTERNOS
// ============================================================

function randomHora(base: string, deltaMin: number): string {
  const [h, m] = base.split(':').map(Number)
  const total =
    h * 60 + m + Math.floor(Math.random() * deltaMin * 2) - deltaMin
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function calcHoras(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  return Math.round(((hf * 60 + mf - (hi * 60 + mi)) / 60) * 10) / 10
}

function makeHorario(
  semana: number,
  dias: Partial<DiaHorario>[],
): HorarioSemanal {
  const defaultDias: DiaHorario[] = (
    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const
  ).map((dia, i) => ({
    dia,
    modalidad: (dias[i]?.modalidad ?? 'presencial') as Modalidad,
    horaInicio: dias[i]?.horaInicio ?? '08:00',
    horaFin: dias[i]?.horaFin ?? '17:00',
    horasCalculadas: calcHoras(
      dias[i]?.horaInicio ?? '08:00',
      dias[i]?.horaFin ?? '17:00',
    ),
  }))
  const total = defaultDias.reduce((s, d) => s + d.horasCalculadas, 0)
  return {
    id: `h-${semana}-${Date.now()}-${Math.random()}`,
    semana,
    anio: 2026,
    dias: defaultDias,
    totalHoras: total,
    estado: 'aprobado',
  }
}

function makeSemanas(): SemanaFisica[] {
  return [
    {
      numero: 1,
      fechaInicio: '2026-09-02',
      fechaFin: '2026-09-06',
      firmada: true,
      label: 'Semana 1 (02–06 Sep)',
    },
    {
      numero: 2,
      fechaInicio: '2026-09-09',
      fechaFin: '2026-09-13',
      firmada: true,
      label: 'Semana 2 (09–13 Sep)',
    },
    {
      numero: 3,
      fechaInicio: '2026-09-16',
      fechaFin: '2026-09-20',
      firmada: false,
      label: 'Semana 3 (16–20 Sep)',
    },
  ]
}

function estadoToCodigoHoja(estado: EstadoAsistencia): CodigoHoja {
  const map: Record<EstadoAsistencia, CodigoHoja> = {
    ASISTIO: 'P',
    TARDANZA: 'T',
    FALTA: 'F',
    FALTA_CUBIERTA: 'F*',
    COMPENSADO: 'HE',
    SEMINARIO: 'S',
    CAMPO: 'C',
    LIBRE: 'L',
    PENDIENTE: '-',
  }
  return map[estado]
}

function makeHistorial(
  modalidadBase: Modalidad,
  seed: number,
): RegistroDia[] {
  const fechas = [
    '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05',
    '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12',
    // Semana 38 oficial
    '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'
  ]
  const estadosBase: EstadoAsistencia[] = [
    'ASISTIO', 'ASISTIO', 'TARDANZA', 'ASISTIO',
    'ASISTIO', 'FALTA', 'ASISTIO', 'SEMINARIO', 'ASISTIO',
    // Semana 38 estados
    'ASISTIO', 'PENDIENTE', 'PENDIENTE', 'PENDIENTE', 'PENDIENTE'
  ]
  // Variar según seed para que no todos sean iguales
  const estados = estadosBase.map((e, i) => {
    if (seed % 3 === 0 && i === 5) return 'COMPENSADO' as EstadoAsistencia
    if (seed % 5 === 0 && i === 1) return 'TARDANZA' as EstadoAsistencia
    return e
  })

  return fechas.map((fecha, i) => {
    const estado = estados[i]
    const horaIngreso =
      estado === 'ASISTIO'
        ? randomHora('08:05', 5)
        : estado === 'TARDANZA'
          ? randomHora('08:25', 15)
          : undefined
    return {
      fecha,
      modalidad: modalidadBase,
      horaIngreso,
      horaSalida:
        estado !== 'FALTA' && estado !== 'PENDIENTE' ? '17:00' : undefined,
      estado,
      codigoHoja: estadoToCodigoHoja(estado),
      fuente: 'TERMINAL',
    }
  })
}

// ============================================================
// DATOS MOCK — 25 PRACTICANTES PERUANOS
// ============================================================

const nombres: [string, string, string][] = [
  ['María', 'Quispe', 'Huanca'],
  ['Luis', 'Rojas', 'Paredes'],
  ['Ana', 'García', 'Llanos'],
  ['Pedro', 'Cruz', 'Mamani'],
  ['Sofía', 'Vargas', 'Torres'],
  ['Carlos', 'Flores', 'Condori'],
  ['Lucía', 'Mendoza', 'Cárdenas'],
  ['Diego', 'Huanca', 'Apaza'],
  ['Valentina', 'Pizarro', 'Ramos'],
  ['Andrés', 'Salazar', 'Beltrán'],
  ['Camila', 'Reyes', 'Ccopa'],
  ['Fabricio', 'Mamani', 'Quispe'],
  ['Gabriela', 'Ccama', 'Flores'],
  ['Jorge', 'Tapia', 'Soto'],
  ['Daniela', 'Lozano', 'Vega'],
  ['Rodrigo', 'Arce', 'Meza'],
  ['Valeria', 'Sucari', 'Puma'],
  ['Emilio', 'Bautista', 'Ríos'],
  ['Isabella', 'Chávez', 'Inca'],
  ['Mateo', 'Neira', 'Lazo'],
  ['Renata', 'Palomino', 'Yucra'],
  ['Sebastián', 'Cuentas', 'Gutierrez'],
  ['Fernanda', 'Aliaga', 'Coyla'],
  ['Óscar', 'Linares', 'Zevallos'],
  ['Mariana', 'Espinoza', 'Herrera'],
]

const modalidades: Modalidad[] = [
  'presencial', 'virtual', 'presencial', 'presencial', 'virtual',
  'presencial', 'presencial', 'virtual', 'presencial', 'presencial',
  'virtual', 'presencial', 'presencial', 'presencial', 'virtual',
  'presencial', 'presencial', 'virtual', 'presencial', 'presencial',
  'presencial', 'virtual', 'presencial', 'presencial', 'virtual',
]

// Estados laborales mock para variedad visual
const estadosLaborales: EstadoLaboral[] = [
  'activo', 'activo', 'suspendido', 'activo', 'vacaciones',
  'activo', 'activo', 'activo', 'suspendido', 'activo',
  'activo', 'vacaciones', 'activo', 'activo', 'activo',
  'activo', 'activo', 'activo', 'activo', 'activo',
  'activo', 'activo', 'activo', 'activo', 'activo',
]

export const MOCK_PRACTICANTES: Practicante[] = nombres.map(
  ([nombre, ap1, ap2], idx) => {
    const id = `prac-${idx + 1}`
    const modalidadBase = modalidades[idx]
    const estadoLaboral = estadosLaborales[idx]

    const horarioDias: Partial<DiaHorario>[] = [
      { modalidad: modalidadBase, horaInicio: '08:00', horaFin: '13:00' },
      { modalidad: modalidadBase, horaInicio: '08:00', horaFin: '13:00' },
      { modalidad: 'virtual', horaInicio: '08:00', horaFin: '14:00' },
      { modalidad: modalidadBase, horaInicio: '08:00', horaFin: '13:00' },
      { modalidad: modalidadBase, horaInicio: '08:00', horaFin: '10:00' },
    ]

    const historial = makeHistorial(modalidadBase, idx)

    const tienePendiente = idx < 4
    const horarioPendiente: HorarioSemanal | undefined = tienePendiente
      ? {
          id: `hp-${id}-${Date.now()}`,
          semana: 38,
          anio: 2026,
          dias: (
            ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const
          ).map((dia, di) => ({
            dia,
            modalidad: horarioDias[di].modalidad!,
            horaInicio: horarioDias[di].horaInicio!,
            horaFin: horarioDias[di].horaFin!,
            horasCalculadas: calcHoras(
              horarioDias[di].horaInicio!,
              horarioDias[di].horaFin!,
            ),
          })),
          totalHoras: 30,
          estado: 'pendiente_aprobacion',
          fechaEnvio: '2026-09-17T08:30:00',
        }
      : undefined

    return {
      id,
      nombre,
      apellido: `${ap1} ${ap2}`,
      email: `${nombre.toLowerCase()}.${ap1.toLowerCase()}@macromec.pe`,
      dni: `7${(1000000 + idx * 137493).toString().slice(0, 7)}`,
      tel: `+51 9${String(80000000 + idx * 1234567).slice(0, 8)}`,
      carrera: 'Ingeniería Industrial',
      modalidadBase,
      horasSemanalesTarget: 30,
      historial,
      horarioActual: makeHorario(37, horarioDias),
      horarioPendiente,
      semanasHojaFisica: makeSemanas(),
      entregaHojaFisica: idx % 5 !== 0,
      almuerzosConfirmados: ['2026-09-17', '2026-09-16', '2026-09-15'],
      estadoLaboral,
      suspension:
        estadoLaboral === 'suspendido'
          ? {
              motivo: idx === 2
                ? 'Falta grave — incumplimiento de normas'
                : 'Baja temporal por evaluación',
              vigencia: idx === 2 ? 5 : 'indefinido',
              fechaInicio: '2026-09-16',
            }
          : undefined,
      vacaciones:
        estadoLaboral === 'vacaciones'
          ? {
              fechaInicio: '2026-09-15',
              fechaFin: '2026-09-22',
              dias: 5,
              motivo: 'Vacaciones programadas anualmente',
            }
          : undefined,
    }
  },
)

export const PRACTICANTE_PRINCIPAL = MOCK_PRACTICANTES[0]

// ── Horas extra iniciales por practicante ────────────────────
export const EXTRA_HOURS_BALANCES: ExtraHoursBalance[] = MOCK_PRACTICANTES.map(
  (p, idx) => {
    const inicial = idx % 4 === 0 ? 0 : idx % 3 === 0 ? 6 : 12
    return {
      practicanteId: p.id,
      horasDisponibles: inicial,
      historial:
        inicial > 0
          ? [
              {
                id: `he-${p.id}-0`,
                tipo: 'acumulo',
                horas: inicial,
                fecha: '2026-09-05',
                descripcion:
                  inicial === 12
                    ? 'Horas extra — semana de cierre agosto'
                    : 'Trabajo feriado — apoyo especial',
                balanceResultante: inicial,
              },
            ]
          : [],
    }
  },
)

// ── KPIs almuerzos del día ────────────────────────────────────
export const KPI_ALMUERZOS_HOY = {
  total: 14,
  sinAlmuerzo: 2,
  lista: MOCK_PRACTICANTES.slice(0, 16).map((p, i) => ({
    id: p.id,
    nombre: `${p.nombre} ${p.apellido}`,
    horaIngreso:
      i < 14 ? randomHora('08:05', 5) : randomHora('08:20', 15),
    tieneAlmuerzo: i < 14,
    modalidad: p.modalidadBase,
    estadoLaboral: p.estadoLaboral,
  })),
}

// ── Proyección cocinera L–V ───────────────────────────────────
export const PROYECCION_COCINERA = [
  { dia: 'Lun', raciones: 16 },
  { dia: 'Mar', raciones: 15 },
  { dia: 'Mié', raciones: 14 },
  { dia: 'Jue', raciones: 16 },
  { dia: 'Vie', raciones: 12 },
]

// ── Reporte gerencia semanal (sin comodines) ──────────────────
export const REPORTE_GERENCIA = MOCK_PRACTICANTES.slice(0, 15).map((p) => ({
  id: p.id,
  nombre: `${p.nombre} ${p.apellido}`,
  faltas: p.historial.filter((d) => d.estado === 'FALTA').length,
  tardanzas: p.historial.filter((d) => d.estado === 'TARDANZA').length,
  horasExtrasUsadas: p.historial.filter(
    (d) => d.estado === 'COMPENSADO',
  ).length,
  seminario: p.historial.some((d) => d.estado === 'SEMINARIO'),
  campo: p.historial.some((d) => d.estado === 'CAMPO'),
  estadoLaboral: p.estadoLaboral,
}))

// ── Horas semanales del practicante autenticado ───────────────
export const HORAS_SEMANA_ACTUAL = 6  // Solo lunes marcado (6h)
export const HORAS_SEMANA_ANTERIOR = 30
export const SEMANA_ANTERIOR_LABEL = 'Semana 37 (08–12 Sep)'

// ── Fecha de ingreso del practicante a la empresa ─────────────
export const PRACTICANTE_FECHA_INGRESO = '2026-09-01'

