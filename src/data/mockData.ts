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
  MacromecConfig,
  Carrera,
  Especialista,
  Semestre,
  PlantillaAceptacion,
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
    id: 'sup-alexander',
    username: 'Alexander',
    password: 'Alexander05',
    nombre: 'Alexander Marquez',
    rol: 'SUPERVISOR',
    email: 'alexander@macromec.pe',
    dni: '70192834',
    tel: '+51 912 345 678',
    carrera: 'Mecatrónica Industrial',
    avatarIniciales: 'AM',
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

export const practicantesData: any[] = [
  { id: 'p1', nombre: 'Junior', apellido: 'Sandoval', dni: '72849102', celular: '999999999', carrera: 'Ingeniería Industrial', semestre: 'S6', modalidadBase: 'Presencial', monitorId: 'sup-1', estado: 'activo', fechaNacimiento: '2004-01-01' },
  { id: 'prac-0', nombre: 'Paul Anderson', apellido: 'Velasquez Rivera', dni: '72033653', celular: '989 997 058', carrera: 'Electricidad Industrial', semestre: 'VI Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-omar', estado: 'activo', fechaNacimiento: '2005-01-01' },
  { id: 'prac-1', nombre: 'Fernando', apellido: 'Laime Fernandez', dni: '71544323', celular: '900 253 793', carrera: 'Electricidad Industrial', semestre: 'VI Semestre', modalidadBase: 'Presencial', monitorId: 'sup-omar', estado: 'activo', fechaNacimiento: '2005-01-08' },
  { id: 'prac-2', nombre: 'Joseph Andriy', apellido: 'Hidalgo Romero', dni: '60481186', celular: '921 729 939', carrera: 'Electricidad Industrial', semestre: 'VI Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-omar', estado: 'activo', fechaNacimiento: '2007-03-30' },
  { id: 'prac-3', nombre: 'Luis Angel', apellido: 'Lavado Bernardo', dni: '60010984', celular: '987398164', carrera: 'Mecatrónica Industrial', semestre: 'VI Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-alexander', estado: 'activo', fechaNacimiento: '2007-01-17' },
  { id: 'prac-4', nombre: 'Francisc Leonid', apellido: 'De la cruz alberto', dni: '70945793', celular: '957649763', carrera: 'Mecatrónica Industrial', semestre: 'VI Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-alexander', estado: 'activo', fechaNacimiento: '2004-03-12' },
  { id: 'prac-5', nombre: 'Jhomar Grover', apellido: 'Buenalaya Vargas', dni: '60316214', celular: '957582141', carrera: 'Mecatrónica Industrial', semestre: 'V Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-alexander', estado: 'activo', fechaNacimiento: '2007-12-21' },
  { id: 'prac-6', nombre: 'Luis Alexandro', apellido: 'Flores Galvan', dni: '60316202', celular: '918 273 785', carrera: 'Electricidad Industrial', semestre: 'S4', modalidadBase: 'Semipresencial', monitorId: 'sup-jheferson', estado: 'activo', fechaNacimiento: '2005-01-01' },
  { id: 'prac-7', nombre: 'Jesus David', apellido: 'Ledesma Fernandez', dni: '76339946', celular: '983243884', carrera: 'Electricidad Industrial', semestre: 'S4', modalidadBase: 'Semipresencial', monitorId: 'sup-jheferson', estado: 'activo', fechaNacimiento: '2005-01-01' },
  { id: 'prac-8', nombre: 'Brayann Jesus', apellido: 'Huamalies Rodriguez', dni: '76515619', celular: '912309138', carrera: 'Electricidad Industrial', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-jheferson', estado: 'activo', fechaNacimiento: '2002-04-03' },
  { id: 'prac-9', nombre: 'Rossel Robiño', apellido: 'Alfonso Vilcarano', dni: '71306749', celular: '918587422', carrera: 'Electricidad Industrial', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-david', estado: 'activo', fechaNacimiento: '2005-05-20' },
  { id: 'prac-10', nombre: 'Cristopher Raúl', apellido: 'Alfaro Benito', dni: '60005824', celular: '913138969', carrera: 'Electricidad Industrial', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-david', estado: 'activo', fechaNacimiento: '2006-07-03' },
  { id: 'prac-11', nombre: 'Jhojan Jesus', apellido: 'Ccente Chocca', dni: '60005813', celular: '936364152', carrera: 'Electricidad Industrial', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-david', estado: 'activo', fechaNacimiento: '2006-06-02' },
  { id: 'prac-12', nombre: 'Jenifer Mercedes', apellido: 'Carhuamaca Morales', dni: '62916601', celular: '906561817', carrera: 'Electricidad Industrial', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-jeremy', estado: 'activo', fechaNacimiento: '1999-07-08' },
  { id: 'prac-13', nombre: 'Yhoner', apellido: 'Carreon uzco', dni: '60243679', celular: '985756873', carrera: 'Electricidad Industrial', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-jeremy', estado: 'activo', fechaNacimiento: '2007-11-14' },
  { id: 'prac-14', nombre: 'Franco', apellido: 'Acuña Huaman', dni: '75252121', celular: '933977111', carrera: 'Electricidad Industrial', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-jeremy', estado: 'activo', fechaNacimiento: '2006-06-25' },
  { id: 'prac-15', nombre: 'Leydi Xiomi', apellido: 'RIMARI VENTURA', dni: '73644362', celular: '962566085', carrera: 'Administración', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-tamy', estado: 'activo', fechaNacimiento: '2001-08-27' },
  { id: 'prac-16', nombre: 'Yhesely Nandely', apellido: 'Pariona Paez', dni: '60273212', celular: '930483472', carrera: 'Administración', semestre: 'IV Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-tamy', estado: 'activo', fechaNacimiento: '2007-07-05' },
  { id: 'prac-17', nombre: 'Álvaro Cristofer', apellido: 'Díaz Castro', dni: '61695399', celular: '+51 934 870 269', carrera: 'Ingeniería de Software', semestre: 'VI Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-juan', estado: 'activo', fechaNacimiento: '2003-10-12' },
  { id: 'prac-18', nombre: 'WILLY ROY', apellido: 'PASMINIO AREVALO', dni: '47215963', celular: '999146946', carrera: 'Ingeniería de Software', semestre: 'VI Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-juan', estado: 'activo', fechaNacimiento: '1992-07-27' },
  { id: 'prac-19', nombre: 'Mayerly Ayelen', apellido: 'Galarza Sánchez', dni: '60514630', celular: '922067673', carrera: 'Ingeniería de Software', semestre: 'V Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-juan', estado: 'activo', fechaNacimiento: '2007-08-22' },
  { id: 'prac-20', nombre: 'Luis Alexander', apellido: 'Márquez Oré', dni: '72402294', celular: '961041473', carrera: 'Mecatrónica Industrial', semestre: 'Egresado', modalidadBase: 'Semipresencial', monitorId: 'sup-1', estado: 'activo', fechaNacimiento: '2002-09-08' },
  { id: 'prac-21', nombre: 'Tatiana Maybet', apellido: 'Pacheco Quijano', dni: '80836189', celular: '989418140', carrera: 'Ingeniería de Software', semestre: 'V Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-juan', estado: 'activo', fechaNacimiento: '2006-05-14' },
  { id: 'prac-22', nombre: 'Estefany', apellido: 'Vilchez Gutierrez', dni: '70720431', celular: '925132541', carrera: 'Ingeniería de Software', semestre: 'V Semestre', modalidadBase: 'Semipresencial', monitorId: 'sup-juan', estado: 'activo', fechaNacimiento: '2007-07-31' }
];

export const MOCK_PRACTICANTES: Practicante[] = practicantesData.map(p => ({
  ...p,
  email: `${p.nombre.toLowerCase().split(' ')[0]}@macromec.pe`,
  tel: p.celular,
  carreraId: p.carrera, // Mock relation mapping
  horasSemanalesTarget: 30,
  historial: [], // empty for new data
  semanasHojaFisica: [],
  almuerzosConfirmados: [],
  estadoLaboral: p.estado || 'activo',
  entregaHojaFisica: false,
  modalidadBase: (p.modalidadBase.toLowerCase()) as Modalidad,
})) as Practicante[];

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
  faltas: 0,
  tardanzas: 0,
  horasExtrasUsadas: 0,
  seminario: false,
  campo: false,
  estadoLaboral: p.estadoLaboral,
}))

// ── Horas semanales del practicante autenticado ───────────────
export const HORAS_SEMANA_ACTUAL = 6  // Solo lunes marcado (6h)
export const HORAS_SEMANA_ANTERIOR = 30
export const SEMANA_ANTERIOR_LABEL = 'Semana 37 (08–12 Sep)'

// ── Fecha de ingreso del practicante a la empresa ─────────────
export const PRACTICANTE_FECHA_INGRESO = '2026-09-01'

// ============================================================
// CONFIGURACIÓN INSTITUCIONAL Y SEMESTRAL
// ============================================================

export const MOCK_MACROMEC_CONFIG: MacromecConfig = {
  id: 'conf-1',
  ruc: '20607818488',
  nombreComercial: 'CLINIKTECH TELECOMUNICACIONES S.A.C',
  correo: 'contacto@cliniktech.com',
  telefono: '999888777',
  direccion: 'Av. Huancavelica 123, El Tambo, Huancayo',
  fotoFachadaBase64: '',
  fotoMapaBase64: '',
}

export const monitoresData = [
  { id: 'sup-1', nombre: 'Ronaldo Torres', rol: 'SUPERVISOR', dni: '70192834', celular: '+51 912 345 678', area: 'Supervisión de Operaciones', correoGmail: 'ronaldotv@macromec.pe', password: '123' },
  { id: 'sup-omar', nombre: 'Jhonny Omar Chacon Colonio', rol: 'SUPERVISOR', dni: '08172882', celular: '968273238', area: 'Mantenimiento / Electricidad Industrial', correoGmail: 'omar.chacon@gmail.com', password: '123' },
  { id: 'sup-tamy', nombre: 'Tamy Adela Chacon Rojas', rol: 'SUPERVISOR', dni: '73019151', celular: '947042215', area: 'Diseño Grafico', correoGmail: 'tamy.chacon@gmail.com', password: '123' },
  { id: 'sup-juan', nombre: 'Juan Luis Alfonso Alva Cuadros', rol: 'SUPERVISOR', dni: '76143396', celular: '979134594', area: 'Software', correoGmail: 'juan.alva@gmail.com', password: '123' },
  { id: 'sup-alexander', nombre: 'Alexander Márquez', rol: 'SUPERVISOR', dni: '00000001', celular: '900000001', area: 'Mecatrónica Industrial', correoGmail: 'alexander@gmail.com', password: '123' },
  { id: 'sup-jheferson', nombre: 'Jheferson Roque', rol: 'SUPERVISOR', dni: '00000002', celular: '900000002', area: 'Electricidad Industrial', correoGmail: 'jheferson@gmail.com', password: '123' },
  { id: 'sup-david', nombre: 'David Tolentino', rol: 'SUPERVISOR', dni: '00000003', celular: '900000003', area: 'Electricidad Industrial', correoGmail: 'david@gmail.com', password: '123' },
  { id: 'sup-jeremy', nombre: 'Jeremy Calderón', rol: 'SUPERVISOR', dni: '00000004', celular: '900000004', area: 'Electricidad Industrial', correoGmail: 'jeremy@gmail.com', password: '123' }
];

export const MOCK_MONITORES: import('../types').Monitor[] = monitoresData as import('../types').Monitor[];

export const MOCK_CARRERAS: Carrera[] = [
  { id: 'c1', nombre: 'Diseño Gráfico Digital', especialistaNombre: 'Luis Gabriel Quispe' },
  { id: 'c2', nombre: 'Ing. Ciberseguridad', especialistaNombre: 'Saul Urco Torres' },
  { id: 'c3', nombre: 'Ing. Software con IA', especialistaNombre: 'Jack C. Hinostroza Calderón' },
  { id: 'c4', nombre: 'Mecánico de Mantenimiento', especialistaNombre: 'Miguel A. Hidalgo Arcos' },
  { id: 'c5', nombre: 'Mecatrónica Automotriz', especialistaNombre: 'Jazmín E. Espinoza Huamán' },
  { id: 'c6', nombre: 'Electricidad Industrial', especialistaNombre: 'Luis Gabriel Quispe' },
  { id: 'c7', nombre: 'Administración de Empresas', especialistaNombre: 'Saul Urco Torres' },
  { id: 'c8', nombre: 'Administración Industrial', especialistaNombre: 'Jack C. Hinostroza Calderón' },
  { id: 'c9', nombre: 'Seguridad Industrial y Prev. de Riesgo', especialistaNombre: 'Miguel A. Hidalgo Arcos' },
  { id: 'c10', nombre: 'Admin. de Negocios Internacionales', especialistaNombre: 'Jazmín E. Espinoza Huamán' },
  { id: 'c11', nombre: 'Mecánico Automotriz', especialistaNombre: 'Luis Gabriel Quispe' },
  { id: 'c12', nombre: 'Campus Virtual', especialistaNombre: 'Saul Urco Torres' }
];

export const MOCK_SEMESTRES: Semestre[] = [
  {
    id: 'sem-2026-20',
    nombre: '2026-20',
    fechaInicioPostulacion: '2026-06-22',
    fechaFinPostulacion: '2026-07-08',
    fechaInicioConvenio: '2026-07-13',
    fechaFinConvenio: '2026-07-17',
    fechaInicioPracticas: '2026-08-17',
    fechaFinPracticas: '2026-12-05',
    linkPostulacion: 'https://macromec.pe/postula',
    feriados: [],
  }
]

export const especialistasData = [
  { id: 'esp-1', nombres: 'Luis Gabriel', apellidos: 'Quispe', dni: '11111111', celular: '963 352 136', correo: 'lquispe@senati.pe', carrerasCargo: ['Diseño Gráfico Digital', 'Ing. Ciberseguridad', 'Ing. Software con IA', 'Mecánico de Mantenimiento'], semestres: ['S4', 'S5', 'S6'], sede: 'Huancayo' },
  { id: 'esp-2', nombres: 'Saul', apellidos: 'Urco Torres', dni: '22222222', celular: '980 548 616', correo: 'surco@senati.pe', carrerasCargo: ['Mecatrónica Automotriz', 'Electricidad Industrial'], semestres: ['S5', 'S6'], sede: 'Huancayo' },
  { id: 'esp-3', nombres: 'Jack C.', apellidos: 'Hinostroza Calderón', dni: '33333333', celular: '980 547 713', correo: 'jhinostroza@senati.pe', carrerasCargo: ['Mecatrónica Automotriz'], semestres: ['S4', 'S6'], sede: 'Huancayo' },
  { id: 'esp-4', nombres: 'Miguel A.', apellidos: 'Hidalgo Arcos', dni: '44444444', celular: '966 722 643', correo: 'mhidalgo@senati.pe', carrerasCargo: ['Administración de Empresas', 'Administración Industrial', 'Electricidad Industrial'], semestres: ['S4', 'S5', 'S6'], sede: 'Huancayo' },
  { id: 'esp-5', nombres: 'Jazmín E.', apellidos: 'Espinoza Huamán', dni: '55555555', celular: '963 352 050', correo: 'jespinoza@senati.pe', carrerasCargo: ['Seguridad Industrial y Prevención de Riesgo', 'Administración de Negocios Internacionales', 'Mecánico Automotriz', 'Campus Virtual'], semestres: ['S4', 'S5', 'S6'], sede: 'Huancayo' }
];

export const MOCK_ESPECIALISTAS: Especialista[] = especialistasData as any as Especialista[];

export const MOCK_PLANTILLA: PlantillaAceptacion = {
  id: 'tpl-1',
  contenidoHTML: '<p>Estimado(a) practicante, nos complace informarle que ha sido aceptado(a)...</p>'
}
