import { useState, useEffect } from 'react'
import { X, ArrowLeft, Building2, Calendar as CalendarIcon, FileText, Save, Plus, UploadCloud, Trash2, Settings as SettingsIcon, Briefcase, UserPlus, Users, Pencil, Smartphone, Download, Check } from 'lucide-react'
import type { Especialista } from '../../types'
import { useAppStore, enviarCredencialesWhatsApp } from '../../store/useAppStore'
import { toast } from 'sonner'
import type { Carrera, AsignacionCarreraEspecialista, PeasPorSemestre } from '../../types'

// ============================================================
// BOTTOM SHEET (RF-03, RF-04)
// ============================================================

function BottomSheetCarrera({
  carrera,
  onCerrar,
}: {
  carrera: Carrera | null
  onCerrar: () => void
}) {
  if (!carrera) return null;

  const updateCarrera = useAppStore(s => s.updateCarrera)
  const especialistas = useAppStore(s => s.especialistas)

  // Configuración inicial de la carrera
  const configInicial = carrera.asignaciones?.[0]
  const [especialistaId, setEspecialistaId] = useState(configInicial?.especialistaId || '')

  // Semestres fijos: exactamente S4, S5 y S6
  const SEMESTRES = ['S4', 'S5', 'S6'] as const

  // Semestres asignados al especialista
  const [semestresAsignados, setSemestresAsignados] = useState<string[]>(() => {
    return configInicial?.semestres && configInicial.semestres.length > 0
      ? configInicial.semestres
      : ['S4', 'S5', 'S6']
  })

  // Semestre activo seleccionado para subir/ver su PEA (por defecto S4)
  const [semestreActivo, setSemestreActivo] = useState<string>('S4')

  // Mapeo de archivos PEA por cada semestre: { S4: ['PEA-S4.pdf'], S5: ['PEA-S5.pdf'], S6: [] }
  const [peaArchivosPorSemestre, setPeaArchivosPorSemestre] = useState<Record<string, string[]>>(() => {
    const mapa: Record<string, string[]> = { S4: [], S5: [], S6: [] }

    // 1. Cargar desde peasPorSemestre si ya existe
    const fuentesPeas = configInicial?.peasPorSemestre || carrera.peasPorSemestre
    if (fuentesPeas) {
      Object.entries(fuentesPeas).forEach(([sem, val]) => {
        if (Array.isArray(val)) {
          mapa[sem] = val.filter(Boolean) as string[]
        } else if (typeof val === 'string' && val.trim()) {
          mapa[sem] = [val.trim()]
        }
      })
    }

    // 2. Fallback de migración: Si existía peaArchivo en la configuración previa
    if (configInicial?.peaArchivo) {
      const archivoExistente = configInicial.peaArchivo.trim()
      const lower = archivoExistente.toLowerCase()
      // Detectar si pertenece a S5 o S6, o por defecto a S4
      const targetSem = lower.includes('s5') ? 'S5' : lower.includes('s6') ? 'S6' : 'S4'
      if (!mapa[targetSem] || mapa[targetSem].length === 0) {
        mapa[targetSem] = [archivoExistente]
      }
    }

    return mapa
  })

  const handleUploadFiles = (sem: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    const nuevosNombres = Array.from(files).map(f => f.name)

    setPeaArchivosPorSemestre(prev => {
      const actuales = prev[sem] || []
      const combinados = [...actuales]
      nuevosNombres.forEach(n => {
        if (!combinados.includes(n)) {
          combinados.push(n)
        }
      })
      return {
        ...prev,
        [sem]: combinados
      }
    })

    if (!semestresAsignados.includes(sem)) {
      setSemestresAsignados(prev => [...prev, sem])
    }

    toast.success(`${nuevosNombres.length === 1 ? nuevosNombres[0] : `${nuevosNombres.length} archivos`} subido(s) para ${sem}`)
  }

  const handleRemoveFile = (sem: string, fileName: string) => {
    setPeaArchivosPorSemestre(prev => ({
      ...prev,
      [sem]: (prev[sem] || []).filter(n => n !== fileName)
    }))
    toast.info(`Archivo removido de ${sem}`)
  }

  const handleDescargar = (fileName: string) => {
    toast.success(`Descargando ${fileName}...`)
  }

  const handleGuardar = () => {
    if (!especialistaId) {
      toast.error('Debe seleccionar un especialista de gestión')
      return
    }

    if (semestresAsignados.length === 0) {
      toast.error('Debe tener al menos un semestre asignado')
      return
    }

    // Archivo de compatibilidad legacy (primer archivo encontrado)
    const primerArchivo =
      peaArchivosPorSemestre['S4']?.[0] ||
      peaArchivosPorSemestre['S5']?.[0] ||
      peaArchivosPorSemestre['S6']?.[0] ||
      Object.values(peaArchivosPorSemestre).flat()[0] ||
      null

    const nuevaConfig: AsignacionCarreraEspecialista = {
      id: configInicial?.id || `asign-${Date.now()}`,
      carreraId: carrera.id,
      especialistaId,
      semestres: semestresAsignados,
      peaArchivo: primerArchivo,
      peasPorSemestre: peaArchivosPorSemestre,
    }

    updateCarrera(carrera.id, {
      asignaciones: [nuevaConfig],
      peasPorSemestre: peaArchivosPorSemestre,
    })

    const totalArchivos = Object.values(peaArchivosPorSemestre).flat().length
    toast.success(`Configuración guardada exitosamente (${totalArchivos} PEA${totalArchivos === 1 ? '' : 's'} en total)`)
    onCerrar()
  }

  const especialistaSeleccionado = especialistas.find(e => e.id === especialistaId)
  const archivosDelSemestreActivo = peaArchivosPorSemestre[semestreActivo] || []
  const totalPeasEnCarrera = Object.values(peaArchivosPorSemestre).flat().length

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCerrar} />

      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[20px] p-5 h-[85vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-[16px] leading-tight">{carrera.nombre}</h3>
            <span className="text-[12px] text-slate-500">Configuración de Vinculación y PEA</span>
          </div>
          <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pb-6">

          {/* RF-03 (Especialista) */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-slate-800 text-[14px]">Especialista de Gestión</h4>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Seleccionar Especialista</label>
              <select
                value={especialistaId}
                onChange={e => setEspecialistaId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700"
              >
                <option value="">-- Seleccionar --</option>
                {especialistas.map(esp => (
                  <option key={esp.id} value={esp.id}>{esp.nombres} {esp.apellidos}</option>
                ))}
              </select>
            </div>

            {/* Información del Especialista Auto-completada */}
            {especialistaId && especialistaSeleccionado && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col gap-1 mt-1 animate-in fade-in zoom-in-95 duration-200">
                <span className="text-[12px] text-slate-600"><strong>DNI:</strong> {especialistaSeleccionado.dni}</span>
                <span className="text-[12px] text-slate-600"><strong>📱 Celular:</strong> {especialistaSeleccionado.celular}</span>
                <span className="text-[12px] text-slate-600"><strong>✉️ Correo:</strong> {especialistaSeleccionado.correo}</span>
              </div>
            )}
          </div>

          {/* Semestres a Cargo y Selector Interactivo de PEA */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-[14px]">Semestres a Cargo</h4>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                Toca un semestre para cargar su PEA
              </span>
            </div>

            <div className="flex gap-2">
              {SEMESTRES.map(sem => {
                const count = (peaArchivosPorSemestre[sem] || []).length
                const esActivo = semestreActivo === sem

                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSemestreActivo(sem)}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-[13px] font-bold transition-all relative flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-[0.98] ${esActivo
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/50'
                        : count > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{sem}</span>
                      {count > 0 && (
                        <Check size={13} className={esActivo ? 'text-white' : 'text-emerald-600'} />
                      )}
                    </div>
                    <span className={`text-[9px] font-semibold leading-none ${esActivo ? 'text-blue-100' : count > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {count === 0 ? 'Sin PEA' : `${count} PDF${count > 1 ? 's' : ''}`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Formulario RF-04 (PEA por semestre activo) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-[14px] flex items-center gap-1.5">
                  Plan de Aprendizaje (PEA)
                  <span className="text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[12px]">
                    {semestreActivo}
                  </span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  {archivosDelSemestreActivo.length > 0
                    ? `Archivos vinculados al semestre ${semestreActivo}`
                    : `Sube el PEA correspondiente al semestre ${semestreActivo}`}
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {archivosDelSemestreActivo.length} archivo(s)
              </span>
            </div>

            {/* Lista de archivos ya cargados para este semestre */}
            {archivosDelSemestreActivo.length > 0 && (
              <div className="flex flex-col gap-2">
                {archivosDelSemestreActivo.map((archivo, idx) => (
                  <div
                    key={`${archivo}-${idx}`}
                    className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                      <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-emerald-800 truncate" title={archivo}>
                          {archivo}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          Documento cargado con éxito ({semestreActivo})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleDescargar(archivo)}
                        title="Descargar archivo"
                        className="text-emerald-700 bg-white hover:bg-emerald-100 p-2 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(semestreActivo, archivo)}
                        title="Eliminar archivo"
                        className="text-red-500 bg-white hover:bg-red-50 p-2 rounded-lg border border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dropzone / Upload button: siempre disponible para subir más (sin límites) */}
            <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group ${archivosDelSemestreActivo.length === 0
                ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 py-6'
                : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 py-3'
              }`}>
              <UploadCloud size={archivosDelSemestreActivo.length === 0 ? 30 : 20} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-1.5" />
              <span className="text-[13px] font-bold text-slate-700 group-hover:text-blue-600">
                {archivosDelSemestreActivo.length === 0
                  ? `Subir PEA para ${semestreActivo} (PDF)`
                  : `+ Subir otro PDF para ${semestreActivo}`}
              </span>
              <span className="text-[10px] text-slate-400">
                {archivosDelSemestreActivo.length === 0
                  ? 'Formatos aceptados: .pdf (sin límite de archivos)'
                  : 'Puedes adjuntar múltiples documentos sin límite'}
              </span>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => {
                  handleUploadFiles(semestreActivo, e.target.files)
                  e.target.value = ''
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Resumen general de todos los PEAs cargados en la carrera */}
          {totalPeasEnCarrera > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Resumen de PEAs en esta carrera
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  {totalPeasEnCarrera} total
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {SEMESTRES.map(sem => {
                  const files = peaArchivosPorSemestre[sem] || []
                  if (files.length === 0) return null
                  const esEsteActivo = semestreActivo === sem
                  return (
                    <div
                      key={sem}
                      onClick={() => setSemestreActivo(sem)}
                      className={`flex items-center justify-between text-[11px] p-2 rounded-lg border cursor-pointer transition-colors ${esEsteActivo ? 'bg-blue-50/70 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="font-bold text-blue-700 shrink-0">{sem}:</span>
                        <span className="text-slate-600 truncate font-medium" title={files.join(', ')}>
                          {files.join(', ')}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 shrink-0 ml-2">
                        {esEsteActivo ? 'Activo' : 'Ver'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* Botón anclado */}
        <div className="mt-auto pt-2 shrink-0">
          <button onClick={handleGuardar} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm active:bg-blue-700 transition-colors text-[14px] cursor-pointer">
            <Save size={18} /> Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENTES DE SECCIONES (Vistas de detalle)
// ============================================================

function SeccionEmpresa() {
  const { datosEmpresa, actualizarDatosEmpresa } = useAppStore()

  // RF-01 States
  const [ruc, setRuc] = useState(datosEmpresa.ruc)
  const [razonSocial, setRazonSocial] = useState(datosEmpresa.razonSocial)
  const [correo, setCorreo] = useState(datosEmpresa.correo)
  const [telefono, setTelefono] = useState(datosEmpresa.telefono)
  const [direccion, setDireccion] = useState(datosEmpresa.direccion)
  const [departamento, setDepartamento] = useState(datosEmpresa.departamento)
  const [provincia, setProvincia] = useState(datosEmpresa.provincia)
  const [distrito, setDistrito] = useState(datosEmpresa.distrito)

  const [isSaving, setIsSaving] = useState(false);

  const handleGuardar = async () => {
    setIsSaving(true);
    // Simulación de latencia hacia NestJS
    await new Promise(resolve => setTimeout(resolve, 1000));

    // El Payload que viajará a PostgreSQL
    actualizarDatosEmpresa({ ruc, razonSocial, correo, telefono, direccion, departamento, provincia, distrito });

    toast.success('Configuración de la empresa actualizada globalmente');
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-5 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* RF-01: Datos Principales */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
        <h3 className="font-bold text-slate-800 text-[14px] mb-1">Datos Principales</h3>

        <div className="flex gap-2">
          <div className="flex-[0.4]">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">RUC</label>
            <input type="text" value={ruc} onChange={e => setRuc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" maxLength={11} />
          </div>
          <div className="flex-[0.6]">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Razón Social</label>
            <input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 mb-1 block">Correo Electrónico</label>
          <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>

        <div className="flex gap-2">
          <div className="flex-[0.4]">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Teléfono</label>
            <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div className="flex-[0.6]">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Dirección Principal</label>
            <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Departamento</label>
            <input type="text" value={departamento} onChange={e => setDepartamento(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Provincia</label>
            <input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Distrito</label>
            <input type="text" value={distrito} onChange={e => setDistrito(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>

        <button onClick={handleGuardar} disabled={isSaving} className="bg-slate-800 text-white rounded-lg py-2.5 font-bold text-[13px] mt-2 flex justify-center items-center gap-2 active:bg-slate-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
          <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar Datos'}
        </button>
      </div>

      {/* Multimedia */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
        <h3 className="font-bold text-slate-800 text-[14px]">Multimedia (Imágenes)</h3>
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500">Foto Fachada</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors relative group h-24">
              <UploadCloud size={20} className="text-slate-400 group-hover:text-blue-500" />
              <span className="text-[11px] font-semibold text-slate-600 text-center">Subir Foto</span>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500">Mapa de Ubicación</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors relative group h-24">
              <UploadCloud size={20} className="text-slate-400 group-hover:text-blue-500" />
              <span className="text-[11px] font-semibold text-slate-600 text-center">Subir Mapa</span>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-3 font-medium">Las imágenes de fachada y mapa son de uso estrictamente interno para la generación de convenios y croquis. No serán visibles en el perfil de los practicantes.</p>
      </div>
    </div>
  )
}

function BottomSheetEspecialistaForm({
  especialistaEditar,
  onCerrar,
}: {
  especialistaEditar: Especialista | null
  onCerrar: () => void
}) {
  const addEspecialista = useAppStore(s => s.addEspecialista)
  const updateEspecialista = useAppStore(s => s.updateEspecialista)

  const [nombres, setNombres] = useState(especialistaEditar?.nombres || '')
  const [apellidos, setApellidos] = useState(especialistaEditar?.apellidos || '')
  const [dni, setDni] = useState(especialistaEditar?.dni || '')
  const [correo, setCorreo] = useState(especialistaEditar?.correo || '')
  const [celular, setCelular] = useState(especialistaEditar?.celular || '')

  const handleGuardar = () => {
    if (!nombres || !apellidos || !dni) {
      toast.error('Nombres, apellidos y DNI son obligatorios')
      return
    }

    if (especialistaEditar) {
      updateEspecialista(especialistaEditar.id, { nombres, apellidos, dni, correo, celular })
      toast.success('Especialista actualizado')
    } else {
      addEspecialista({
        id: `esp-${Date.now()}`,
        nombres,
        apellidos,
        dni,
        correo,
        celular
      })
      toast.success('Especialista creado')
    }
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCerrar} />
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[20px] p-5 h-[80vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-[16px] leading-tight">{especialistaEditar ? 'Editar Especialista' : 'Nuevo Especialista'}</h3>
            <span className="text-[12px] text-slate-500">Datos de contacto</span>
          </div>
          <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-6">
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Nombres</label>
            <input type="text" value={nombres} onChange={e => setNombres(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Apellidos</label>
            <input type="text" value={apellidos} onChange={e => setApellidos(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">DNI</label>
            <input type="text" value={dni} onChange={e => setDni(e.target.value)} maxLength={8} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Correo Electrónico</label>
            <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Celular</label>
            <input type="text" value={celular} onChange={e => setCelular(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>

        <div className="mt-auto pt-2 shrink-0">
          <button onClick={handleGuardar} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm active:bg-blue-700 transition-colors text-[14px]">
            <Save size={18} /> Guardar Especialista
          </button>
        </div>
      </div>
    </div>
  )
}

function BottomSheetListaEspecialistas({
  onCerrar,
  onEditar
}: {
  onCerrar: () => void
  onEditar: (esp: Especialista) => void
}) {
  const especialistas = useAppStore(s => s.especialistas)
  const deleteEspecialista = useAppStore(s => s.deleteEspecialista)

  const handleEliminar = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este especialista? Se desvinculará de las carreras.')) {
      deleteEspecialista(id)
      toast.success('Especialista eliminado')
    }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCerrar} />
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[20px] p-5 h-[85vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-[16px] leading-tight">Directorio de Especialistas</h3>
            <span className="text-[12px] text-slate-500">{especialistas.length} registrados</span>
          </div>
          <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pb-6">
          {especialistas.length === 0 && (
            <div className="text-center text-slate-500 text-[13px] mt-4">No hay especialistas registrados.</div>
          )}
          {especialistas.map(esp => (
            <div key={esp.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
              <div className="flex flex-col pr-2">
                <span className="text-[13px] font-bold text-slate-800">{esp.nombres} {esp.apellidos}</span>
                <span className="text-[11px] text-slate-500 mt-0.5 mb-2">DNI: {esp.dni} | Cel: {esp.celular}</span>
              </div>
              <div className="flex gap-2 shrink-0 self-start">
                <button onClick={() => onEditar(esp)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleEliminar(esp.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SeccionCarreras() {
  const carreras = useAppStore(s => s.carreras)
  const especialistas = useAppStore(s => s.especialistas)
  const [carreraActiva, setCarreraActiva] = useState<Carrera | null>(null)

  const [modalEspecialistaAbierto, setModalEspecialistaAbierto] = useState(false)
  const [especialistaEditar, setEspecialistaEditar] = useState<Especialista | null>(null)
  const [modalListaEspecialistasAbierto, setModalListaEspecialistasAbierto] = useState(false)

  const openEditarEspecialista = (esp: Especialista) => {
    setEspecialistaEditar(esp)
    setModalEspecialistaAbierto(true)
  }

  return (
    <>
      <div className="flex flex-col gap-5 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
          <h3 className="font-bold text-slate-800 text-[14px]">Gestión de Carreras y PEA</h3>

          <div className="flex gap-2 mb-1">
            <button
              onClick={() => { setEspecialistaEditar(null); setModalEspecialistaAbierto(true) }}
              className="flex-1 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-[12px] font-bold flex justify-center items-center gap-1.5 hover:bg-emerald-100 transition-colors"
            >
              <UserPlus size={16} /> Nuevo Especialista
            </button>
            <button
              onClick={() => setModalListaEspecialistasAbierto(true)}
              className="flex-1 bg-blue-50 text-blue-700 py-2.5 rounded-xl text-[12px] font-bold flex justify-center items-center gap-1.5 hover:bg-blue-100 transition-colors"
            >
              <Users size={16} /> Ver Especialistas
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {carreras.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-3 border border-slate-200 flex justify-between items-center shadow-sm">
                <div className="flex flex-col pr-2 min-w-0">
                  <span className="text-[13px] font-bold text-slate-800 truncate">{c.nombre}</span>
                  <div className="flex flex-col mt-0.5 gap-0.5">
                    {c.asignaciones && c.asignaciones.length > 0 ? (
                      c.asignaciones.map((conf: AsignacionCarreraEspecialista, idx: number) => {
                        const esp = especialistas.find(e => e.id === conf.especialistaId)
                        const fuentePeas = conf.peasPorSemestre || c.peasPorSemestre
                        let peasList: { sem: string; count: number }[] = []
                        if (fuentePeas) {
                          Object.entries(fuentePeas).forEach(([sem, val]) => {
                            const arr = Array.isArray(val) ? val : (val ? [val] : [])
                            if (arr.length > 0) peasList.push({ sem, count: arr.length })
                          })
                        } else if (conf.peaArchivo) {
                          peasList.push({ sem: 'S4', count: 1 })
                        }
                        const totalPeas = peasList.reduce((acc, p) => acc + p.count, 0)

                        return (
                          <div key={idx} className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-emerald-600 font-medium leading-tight">
                              {esp ? `${esp.nombres} ${esp.apellidos}` : 'Desconocido'} ({conf.semestres.join(', ')})
                            </span>
                            {totalPeas > 0 ? (
                              <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                                <FileText size={11} className="shrink-0" />
                                {totalPeas} PEA{totalPeas > 1 ? 's' : ''} ({peasList.map(p => `${p.sem}: ${p.count}`).join(' · ')})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Sin PEA cargado</span>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <span className="text-[11px] text-slate-400">Sin configurar</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setCarreraActiva(c)}
                  className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors shrink-0"
                >
                  <SettingsIcon size={12} />
                  Configurar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {carreraActiva && (
        <BottomSheetCarrera
          carrera={carreraActiva}
          onCerrar={() => setCarreraActiva(null)}
        />
      )}

      {modalListaEspecialistasAbierto && (
        <BottomSheetListaEspecialistas
          onCerrar={() => setModalListaEspecialistasAbierto(false)}
          onEditar={openEditarEspecialista}
        />
      )}

      {modalEspecialistaAbierto && (
        <BottomSheetEspecialistaForm
          especialistaEditar={especialistaEditar}
          onCerrar={() => {
            setModalEspecialistaAbierto(false)
            setEspecialistaEditar(null)
          }}
        />
      )}
    </>
  )
}


function SeccionSemestres() {
  const semestres = useAppStore(s => s.semestres)
  const updateSemestreCalendario = useAppStore(s => s.updateSemestreCalendario)
  const agregarFeriado = useAppStore(s => s.agregarFeriado)
  const eliminarFeriado = useAppStore(s => s.eliminarFeriado)

  const activo = semestres[0]

  const [fInicioPost, setFInicioPost] = useState(activo?.fechaInicioPostulacion ?? '')
  const [fFinPost, setFFinPost] = useState(activo?.fechaFinPostulacion ?? '')
  const [fInicioConv, setFInicioConv] = useState(activo?.fechaInicioConvenio ?? '')
  const [fFinConv, setFFinConv] = useState(activo?.fechaFinConvenio ?? '')
  const [fInicioPrac, setFInicioPrac] = useState(activo?.fechaInicioPracticas ?? '')
  const [fFinPrac, setFFinPrac] = useState(activo?.fechaFinPracticas ?? '')
  const [linkPost, setLinkPost] = useState(activo?.linkPostulacion ?? '')

  const [nuevoFeriadoFecha, setNuevoFeriadoFecha] = useState('')
  const [nuevoFeriadoMotivo, setNuevoFeriadoMotivo] = useState('')

  if (!activo) return <div className="p-4 text-center text-slate-500">No hay semestres disponibles</div>

  const handleGuardar = () => {
    updateSemestreCalendario({
      fechaInicioPostulacion: fInicioPost,
      fechaFinPostulacion: fFinPost,
      fechaInicioConvenio: fInicioConv,
      fechaFinConvenio: fFinConv,
      fechaInicioPracticas: fInicioPrac,
      fechaFinPracticas: fFinPrac,
      linkPostulacion: linkPost
    })
    toast.success('Calendario de semestre actualizado')
  }

  const handleAddFeriado = () => {
    if (!nuevoFeriadoFecha || !nuevoFeriadoMotivo) {
      toast.error('Debe ingresar fecha y motivo del feriado')
      return
    }
    agregarFeriado(nuevoFeriadoFecha, nuevoFeriadoMotivo)
    setNuevoFeriadoFecha('')
    setNuevoFeriadoMotivo('')
    toast.success('Feriado agregado')
  }

  const handleRemoveFeriado = (id: string) => {
    eliminarFeriado(id)
    toast.success('Feriado eliminado')
  }

  return (
    <div className="flex flex-col gap-4 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase font-bold text-emerald-600">Semestre Activo</span>
          <span className="font-extrabold text-[15px]">{activo.nombre}</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
        <h3 className="font-bold text-slate-800 text-[14px]">Formulario (Postulación)</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Inicio</label>
            <input type="date" value={fInicioPost} onChange={e => setFInicioPost(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Fin</label>
            <input type="date" value={fFinPost} onChange={e => setFFinPost(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 mb-1 block">Enlace de Postulación</label>
          <input type="url" value={linkPost} onChange={e => setLinkPost(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
        <h3 className="font-bold text-slate-800 text-[14px]">Fechas del Convenio</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Inicio</label>
            <input type="date" value={fInicioConv} onChange={e => setFInicioConv(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Fin</label>
            <input type="date" value={fFinConv} onChange={e => setFFinConv(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
        <h3 className="font-bold text-slate-800 text-[14px]">Fechas de Prácticas</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Inicio</label>
            <input type="date" value={fInicioPrac} onChange={e => setFInicioPrac(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Fin</label>
            <input type="date" value={fFinPrac} onChange={e => setFFinPrac(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
        <h3 className="font-bold text-slate-800 text-[14px]">Feriados Nacionales</h3>
        <div className="flex flex-col gap-2">
          {activo.feriados.length === 0 && <span className="text-[12px] text-slate-400">Sin feriados registrados</span>}
          {activo.feriados.map(f => (
            <div key={f.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-[13px] font-medium text-slate-700 flex items-center gap-2">
                <CalendarIcon size={14} className="text-emerald-600" />
                {f.fecha} - {f.motivo}
              </span>
              <button onClick={() => handleRemoveFeriado(f.id)} className="text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 mt-2 border-t border-slate-100 pt-3">
          <div className="flex gap-2">
            <input type="date" value={nuevoFeriadoFecha} onChange={e => setNuevoFeriadoFecha(e.target.value)} className="flex-[0.4] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
            <input type="text" placeholder="Motivo (Ej: Navidad)" value={nuevoFeriadoMotivo} onChange={e => setNuevoFeriadoMotivo(e.target.value)} className="flex-[0.6] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow" />
          </div>
          <button onClick={handleAddFeriado} className="w-full bg-emerald-50 text-emerald-700 p-2.5 rounded-lg flex items-center justify-center gap-1 font-bold text-[12px] hover:bg-emerald-100 transition-colors">
            <Plus size={16} /> Agregar Feriado
          </button>
        </div>
      </div>

      <button onClick={handleGuardar} className="w-full bg-emerald-600 text-white rounded-xl py-3.5 font-bold text-[14px] flex items-center justify-center gap-2 mt-2 shadow-sm active:bg-emerald-700 transition-colors">
        <Save size={18} /> Guardar Calendario
      </button>
    </div>
  )
}

function SeccionPlantillas() {
  const plantilla = useAppStore(s => s.plantillaAceptacion)
  const updatePlantilla = useAppStore(s => s.updatePlantilla)

  const [html, setHtml] = useState(plantilla?.contenidoHTML ?? '')

  const handleGuardar = () => {
    updatePlantilla({ contenidoHTML: html })
    toast.success('Plantilla de aceptación guardada')
  }

  return (
    <div className="flex flex-col gap-4 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
        <h3 className="font-bold text-slate-800 text-[14px]">Plantilla de Aceptación</h3>

        <div>
          <label className="text-[11px] font-bold text-slate-500 mb-2 block">Variables dinámicas permitidas:</label>
          <div className="flex flex-wrap gap-2">
            {['[Nombre estudiante]', '[DNI]', '[Semestre]', '[Carrera]', '[Área de Práctica]', '[Modalidad]'].map(variable => (
              <span key={variable} className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] px-2 py-1 rounded-md font-bold">{variable}</span>
            ))}
          </div>
        </div>

        <textarea
          value={html}
          onChange={e => setHtml(e.target.value)}
          className="w-full h-64 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[13px] font-mono text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-shadow"
          placeholder="<h1>Bienvenido...</h1>"
        />

        <button onClick={handleGuardar} className="w-full bg-purple-600 text-white rounded-xl py-3.5 font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm mt-2 active:bg-purple-700 transition-colors">
          <Save size={18} /> Guardar Plantilla
        </button>
      </div>
    </div>
  )
}

// ============================================================
// MODAL PRINCIPAL
// ============================================================

export default function ConfiguracionModal({
  abierto,
  onCerrar,
}: {
  abierto: boolean
  onCerrar: () => void
}) {
  const [seccionActiva, setSeccionActiva] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Manejo de animación de entrada/salida
  useEffect(() => {
    if (abierto) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setSeccionActiva(null) // Reset al cerrar
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [abierto])

  if (!isVisible) return null

  return (
    // Contenedor global centrador 
    <div
      className={`fixed inset-0 z-[200] bg-black/60 flex justify-center transition-opacity duration-300 ${abierto ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Contenedor estricto iPhone 15 Pro Max */}
      <div
        className={`w-full max-w-[430px] mx-auto bg-slate-50 h-[100dvh] flex flex-col relative shadow-2xl transition-transform duration-300 ease-out overflow-hidden ${abierto ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95'}`}
      >
        {/* Cabecera fija */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between z-10 shrink-0 shadow-sm">
          {seccionActiva ? (
            <button
              onClick={() => setSeccionActiva(null)}
              className="flex items-center gap-1.5 text-slate-500 font-semibold text-[14px] active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} />
              Volver
            </button>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-[16px]">Configuración Global</span>
              <span className="text-[12px] text-slate-500">Ajustes del Sistema</span>
            </div>
          )}

          {!seccionActiva && (
            <button
              onClick={onCerrar}
              className="bg-slate-100 p-2.5 rounded-full text-slate-500 flex items-center justify-center active:scale-95 transition-transform"
            >
              <X size={18} />
            </button>
          )}

          {seccionActiva && (
            <div className="font-bold text-slate-800 text-[14px] truncate max-w-[200px] text-right">
              {seccionActiva === 'empresa' && 'Institución y Sedes'}
              {seccionActiva === 'carreras' && 'Gestión de Carreras'}
              {seccionActiva === 'semestres' && 'Semestres y Calendario'}
              {seccionActiva === 'plantillas' && 'Plantillas de Doc.'}
            </div>
          )}
        </div>

        {/* Cuerpo con Scroll nativo */}
        <div className="flex-1 overflow-y-auto p-4 relative">
          {!seccionActiva ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSeccionActiva('empresa')}
                className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 text-left shadow-sm active:bg-slate-50 transition-colors group"
              >
                <div className="bg-blue-100 text-blue-600 p-3 rounded-[12px] shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building2 size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-[14px]">Institución y Sedes</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Datos de la empresa y ubicaciones</div>
                </div>
              </button>

              <button
                onClick={() => setSeccionActiva('carreras')}
                className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 text-left shadow-sm active:bg-slate-50 transition-colors group"
              >
                <div className="bg-indigo-100 text-indigo-600 p-3 rounded-[12px] shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Briefcase size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-[14px]">Gestión de Carreras y PEA</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Vinculación de especialistas y PEA</div>
                </div>
              </button>

              <button
                onClick={() => setSeccionActiva('semestres')}
                className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 text-left shadow-sm active:bg-slate-50 transition-colors group"
              >
                <div className="bg-emerald-100 text-emerald-600 p-3 rounded-[12px] shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CalendarIcon size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-[14px]">Semestres y Calendario</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Configuración de fechas y feriados globales</div>
                </div>
              </button>

              <button
                onClick={() => setSeccionActiva('plantillas')}
                className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 text-left shadow-sm active:bg-slate-50 transition-colors group"
              >
                <div className="bg-purple-100 text-purple-600 p-3 rounded-[12px] shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <FileText size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-[14px]">Plantillas de Documentos</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Edición de constancias y formatos HTML</div>
                </div>
              </button>
            </div>
          ) : (
            <>
              {seccionActiva === 'empresa' && <SeccionEmpresa />}
              {seccionActiva === 'carreras' && <SeccionCarreras />}
              {seccionActiva === 'semestres' && <SeccionSemestres />}
              {seccionActiva === 'plantillas' && <SeccionPlantillas />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
