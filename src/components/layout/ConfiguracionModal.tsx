import { sumarDosMeses } from '../../utils/dateUtils';
import { useState, useEffect, useMemo } from 'react'
import { X, ArrowLeft, Building2, Calendar as CalendarIcon, FileText, Save, Plus, UploadCloud, Trash2, Settings as SettingsIcon, Briefcase, UserPlus, Users, Pencil, Smartphone, Download, Check, ChevronDown, ChevronUp, Rocket, AlertCircle, GraduationCap, Copy } from 'lucide-react'
import type { Especialista } from '../../types'
import { useAppStore, enviarCredencialesWhatsApp } from '../../store/useAppStore'
import ModalConfirmacion from '../ModalConfirmacion'
import WizardNuevoPeriodo from '../WizardNuevoPeriodo'
import { toast } from 'sonner'
import type { Carrera, AsignacionCarreraEspecialista, PeasPorSemestre, ArchivoPea } from '../../types'
import { descargarArchivoBase64, SAMPLE_PEA_PDF_BASE64 } from '../../utils/fileUtils'

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
  if (!carrera) return null

  const updateCarrera = useAppStore(s => s.updateCarrera)
  const especialistas = useAppStore(s => s.especialistas)

  const SEMESTRES = ['S4', 'S5', 'S6'] as const

  // 1. Multi-Asignación de Especialistas por Carrera y Semestre
  const [asignaciones, setAsignaciones] = useState<AsignacionCarreraEspecialista[]>(() => {
    if (carrera.asignaciones && carrera.asignaciones.length > 0) {
      return carrera.asignaciones.map(a => ({
        ...a,
        semestres: a.semestres && a.semestres.length > 0 ? a.semestres : ['S4', 'S5', 'S6']
      }))
    }
    return [
      {
        id: `asig-${Date.now()}`,
        carreraId: carrera.id,
        especialistaId: especialistas[0]?.id || '',
        semestres: ['S4', 'S5', 'S6']
      }
    ]
  })

  // 2. Plan de Aprendizaje (PEA) vinculado directamente a la Carrera (Base64 real)
  const [peas, setPeas] = useState<ArchivoPea[]>(() => {
    if (carrera.peas && Array.isArray(carrera.peas) && carrera.peas.length > 0) {
      return carrera.peas.map((p, idx) => {
        if (typeof p === 'string') {
          return {
            id: `pea-${idx}-${Date.now()}`,
            nombre: p,
            base64: SAMPLE_PEA_PDF_BASE64,
            tipoMime: 'application/pdf',
            fechaSubida: new Date().toISOString()
          }
        }
        return {
          ...p,
          base64: p.base64 || SAMPLE_PEA_PDF_BASE64,
          tipoMime: p.tipoMime || 'application/pdf'
        }
      })
    }
    if (carrera.peaArchivos && Array.isArray(carrera.peaArchivos) && carrera.peaArchivos.length > 0) {
      return carrera.peaArchivos.map((nombre, idx) => ({
        id: `pea-legacy-${idx}`,
        nombre,
        base64: SAMPLE_PEA_PDF_BASE64,
        tipoMime: 'application/pdf',
        fechaSubida: new Date().toISOString()
      }))
    }
    return []
  })

  // Handlers para Especialistas
  const handleAddEspecialista = () => {
    const asignadosIds = asignaciones.map(a => a.especialistaId)
    const disponible = especialistas.find(e => !asignadosIds.includes(e.id)) || especialistas[0]
    setAsignaciones(prev => [
      ...prev,
      {
        id: `asig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        carreraId: carrera.id,
        especialistaId: disponible?.id || '',
        semestres: []
      }
    ])
  }

  const handleRemoveEspecialista = (asigId: string) => {
    if (asignaciones.length <= 1) {
      toast.error('Debe haber al menos un especialista asignado a la carrera')
      return
    }
    setAsignaciones(prev => prev.filter(a => a.id !== asigId))
    toast.info('Especialista retirado de la carrera')
  }

  const handleEspecialistaChange = (asigId: string, especialistaId: string) => {
    setAsignaciones(prev =>
      prev.map(a => (a.id === asigId ? { ...a, especialistaId } : a))
    )
  }

  const handleToggleSemestre = (asigId: string, sem: string) => {
    setAsignaciones(prev =>
      prev.map(a => {
        if (a.id !== asigId) return a
        const existe = a.semestres.includes(sem)
        const nuevosSemestres = existe
          ? a.semestres.filter(s => s !== sem)
          : [...a.semestres, sem]
        return { ...a, semestres: nuevosSemestres }
      })
    )
  }

  // Handlers para PEA de la Carrera con Base64 real (FileReader)
  const handleUploadPeaFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)

    const readFileAsBase64 = (file: File): Promise<ArchivoPea> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            id: `pea-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            nombre: file.name,
            base64: reader.result as string,
            tipoMime: file.type || 'application/pdf',
            fechaSubida: new Date().toISOString()
          })
        }
        reader.onerror = () => reject(new Error(`Error al leer ${file.name}`))
        reader.readAsDataURL(file)
      })
    }

    Promise.all(fileArray.map(readFileAsBase64))
      .then(nuevosArchivos => {
        setPeas(prev => {
          const actuales = [...prev]
          nuevosArchivos.forEach(nuevo => {
            const idx = actuales.findIndex(p => p.nombre === nuevo.nombre)
            if (idx >= 0) {
              actuales[idx] = nuevo
            } else {
              actuales.push(nuevo)
            }
          })
          return actuales
        })
        toast.success(
          `${nuevosArchivos.length === 1 ? nuevosArchivos[0].nombre : `${nuevosArchivos.length} archivos`} procesado(s) y guardado(s) en Base64 real`
        )
      })
      .catch(() => {
        toast.error('Error al procesar los archivos para conversión Base64')
      })
  }

  const handleRemovePeaFile = (peaIdOrNombre: string) => {
    setPeas(prev => prev.filter(p => p.id !== peaIdOrNombre && p.nombre !== peaIdOrNombre))
    toast.info('Documento PEA removido')
  }

  const handleDescargar = (pea: ArchivoPea) => {
    descargarArchivoBase64(
      pea.base64 || SAMPLE_PEA_PDF_BASE64,
      pea.nombre,
      pea.tipoMime || 'application/pdf'
    )
  }

  // Guardar configuración completa en Zustand
  const handleGuardar = () => {
    if (asignaciones.length === 0) {
      toast.error('Debe asignar al menos un especialista')
      return
    }

    const faltaEspecialista = asignaciones.some(a => !a.especialistaId)
    if (faltaEspecialista) {
      toast.error('Todos los bloques deben tener un especialista seleccionado')
      return
    }

    const faltaSemestres = asignaciones.some(a => a.semestres.length === 0)
    if (faltaSemestres) {
      toast.error('Cada especialista asignado debe tener al menos un semestre a cargo (S4, S5 o S6)')
      return
    }

    updateCarrera(carrera.id, {
      asignaciones,
      peas,
      peaArchivos: peas.map(p => (typeof p === 'string' ? p : p.nombre)),
    })

    toast.success(
      `Configuración guardada exitosamente (${asignaciones.length} especialista${asignaciones.length > 1 ? 's' : ''}, ${peas.length} PEA${peas.length === 1 ? '' : 's'})`
    )
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCerrar} />

      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[24px] p-5 h-[88vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-[16px] leading-tight">{carrera.nombre}</h3>
            <span className="text-[12px] text-slate-500 font-medium">
              Configuración de Especialistas y PEA de Carrera
            </span>
          </div>
          <button
            onClick={onCerrar}
            className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pb-6 pr-0.5">
          {/* ── SECCIÓN 1: Multi-Asignación de Especialistas y Semestres a Cargo ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-[14px] m-0">
                  Especialistas de Gestión ({asignaciones.length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Asigna uno o varios especialistas y sus semestres correspondientes
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {asignaciones.map((asig, index) => {
                const esp = especialistas.find(e => e.id === asig.especialistaId)

                return (
                  <div
                    key={asig.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 relative shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-[12px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                        Especialista #{index + 1}
                      </span>
                      {asignaciones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEspecialista(asig.id)}
                          className="text-rose-500 hover:text-rose-700 bg-white hover:bg-rose-50 p-1.5 rounded-lg border border-rose-200 transition-colors text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={13} /> Quitar
                        </button>
                      )}
                    </div>

                    {/* Selector de Especialista */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                        Docente / Especialista
                      </label>
                      <select
                        value={asig.especialistaId}
                        onChange={e => handleEspecialistaChange(asig.id, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700"
                      >
                        <option value="">-- Seleccionar especialista --</option>
                        {especialistas.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.nombres} {e.apellidos}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Info de contacto del especialista */}
                    {esp && (
                      <div className="bg-white border border-slate-200 p-2.5 rounded-xl flex flex-col gap-1 text-[11px] text-slate-600">
                        <span><strong>DNI:</strong> {esp.dni}</span>
                        <span><strong>📱 Celular:</strong> {esp.celular}</span>
                        <span><strong>✉️ Correo:</strong> {esp.correo}</span>
                      </div>
                    )}

                    {/* Semestres a cargo */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">
                        Semestres a cargo de este especialista:
                      </label>
                      <div className="flex gap-2">
                        {SEMESTRES.map(sem => {
                          const estaAsignado = asig.semestres.includes(sem)

                          return (
                            <button
                              key={sem}
                              type="button"
                              onClick={() => handleToggleSemestre(asig.id, sem)}
                              className={`flex-1 py-2 px-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                                estaAsignado
                                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {estaAsignado && <Check size={13} className="text-white" />}
                              <span>{sem}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Botón para añadir otro especialista */}
            <button
              type="button"
              onClick={handleAddEspecialista}
              className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs active:scale-[0.99]"
            >
              <Plus size={16} /> Añadir otro Especialista a esta carrera
            </button>
          </div>

          {/* ── SECCIÓN 2: Plan de Aprendizaje (PEA) de la Carrera ── */}
          <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-[14px] m-0">
                  Plan de Aprendizaje (PEA) de la Carrera
                </h4>
                <span className="text-[11px] text-slate-500">
                  Documentos oficiales aplicables a todos los semestres de esta carrera
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                {peas.length} archivo(s)
              </span>
            </div>

            {/* Lista de PEAs de la carrera con Base64 real */}
            {peas.length > 0 && (
              <div className="flex flex-col gap-2">
                {peas.map((pea, idx) => (
                  <div
                    key={pea.id || `${pea.nombre}-${idx}`}
                    className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0 pr-2">
                      <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700 shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-emerald-900 truncate" title={pea.nombre}>
                          {pea.nombre}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-medium">
                          {pea.base64?.startsWith('data:') ? 'Documento Base64 listo para descarga' : 'Documento general de la carrera'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDescargar(pea)}
                        title="Descargar archivo real"
                        className="text-emerald-700 bg-white hover:bg-emerald-100 p-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePeaFile(pea.id || pea.nombre)}
                        title="Eliminar archivo"
                        className="text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dropzone de subida general para la Carrera */}
            <label
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group ${
                peas.length === 0
                  ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 py-6'
                  : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 py-3'
              }`}
            >
              <UploadCloud
                size={peas.length === 0 ? 30 : 22}
                className="text-slate-400 group-hover:text-blue-500 transition-colors mb-1.5"
              />
              <span className="text-[13px] font-bold text-slate-700 group-hover:text-blue-600 text-center">
                {peas.length === 0
                  ? 'Subir Plan de Aprendizaje (PEA) de la Carrera (PDF)'
                  : '+ Subir otro archivo PEA para la carrera'}
              </span>
              <span className="text-[10px] text-slate-400 text-center mt-0.5">
                Archivos PDF o Word aplicables a todos los semestres de {carrera.nombre}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                onChange={e => {
                  handleUploadPeaFiles(e.target.files)
                  e.target.value = ''
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Botón Guardar en el pie */}
        <div className="pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleGuardar}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors text-[14px] cursor-pointer"
          >
            <Save size={18} /> Guardar Configuración de Carrera
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
  const [especialistaAEliminar, setEspecialistaAEliminar] = useState<Especialista | null>(null)

  const confirmarEliminar = () => {
    if (!especialistaAEliminar) return
    deleteEspecialista(especialistaAEliminar.id)
    toast.success(`Especialista ${especialistaAEliminar.nombres} eliminado exitosamente`)
    setEspecialistaAEliminar(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-[300] bg-black/60 flex items-end justify-center animate-in fade-in duration-200">
        <div className="absolute inset-0" onClick={onCerrar} />
        <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[20px] p-5 h-[85vh] overflow-y-auto relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div>
              <h3 className="font-bold text-slate-800 text-[16px] leading-tight">Directorio de Especialistas</h3>
              <span className="text-[12px] text-slate-500">{especialistas.length} registrados</span>
            </div>
            <button onClick={onCerrar} className="bg-slate-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform hover:bg-slate-200">
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
                  <button onClick={() => setEspecialistaAEliminar(esp)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Nativo de Confirmación para Eliminación */}
      <ModalConfirmacion
        isOpen={!!especialistaAEliminar}
        onClose={() => setEspecialistaAEliminar(null)}
        onConfirm={confirmarEliminar}
        titulo="¿Eliminar Especialista?"
        mensaje={`¿Estás seguro de eliminar a ${especialistaAEliminar?.nombres} ${especialistaAEliminar?.apellidos}? Se desvinculará automáticamente de todas las carreras asignadas.`}
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        tipo="peligro"
      />
    </>
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
                  <div className="flex flex-col mt-1 gap-1">
                    {/* Especialistas asignados */}
                    {c.asignaciones && c.asignaciones.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {c.asignaciones.map((conf: AsignacionCarreraEspecialista, idx: number) => {
                          const esp = especialistas.find(e => e.id === conf.especialistaId)
                          return (
                            <span key={idx} className="text-[11px] text-emerald-700 font-semibold leading-tight">
                              {esp ? `${esp.nombres} ${esp.apellidos}` : 'Especialista por asignar'} ({conf.semestres?.join(', ') || 'Sin semestres'})
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Sin especialistas configurados</span>
                    )}

                    {/* PEA general de la carrera */}
                    {(() => {
                      const totalPeas = (c.peas?.length ?? c.peaArchivos?.length ?? (c.peasPorSemestre ? Object.values(c.peasPorSemestre).flat().filter(Boolean).length : 0))
                      return totalPeas > 0 ? (
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                          <FileText size={11} className="shrink-0" />
                          {totalPeas} PEA{totalPeas > 1 ? 's' : ''} de carrera
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin PEA cargado</span>
                      )
                    })()}
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
  const periodos = useAppStore(s => s.periodos)
  const practicantes = useAppStore(s => s.practicantes)
  const carreras = useAppStore(s => s.carreras)
  const monitores = useAppStore(s => s.monitores || [])
  const especialistas = useAppStore(s => s.especialistas || [])
  const semestres = useAppStore(s => s.semestres)
  const postulaciones = useAppStore(s => s.postulaciones || [])
  const updateSemestreCalendario = useAppStore(s => s.updateSemestreCalendario)
  const agregarFeriado = useAppStore(s => s.agregarFeriado)
  const eliminarFeriado = useAppStore(s => s.eliminarFeriado)

  const periodoActivo = useMemo(() => {
    return periodos?.find(p => p.estado === 'activo') || periodos?.[0] || {
      id: 'per-2026-02',
      nombre: '2026-02',
      fechaInicio: '2026-08-03',
      fechaFin: '2026-12-18',
      estado: 'activo'
    }
  }, [periodos])

  // Estado del Wizard de nuevo periodo
  const [wizardOpen, setWizardOpen] = useState(false)

  // Acordeones colapsables para monitoreo en vivo
  const [colapCarreras, setColapCarreras] = useState(true)
  const [colapSupervisores, setColapSupervisores] = useState(false)
  const [colapEspecialistas, setColapEspecialistas] = useState(false)
  const [colapRetirados, setColapRetirados] = useState(false)
  const [colapCalendario, setColapCalendario] = useState(false)

  // Helper de normalización de semestre (IV Semestre -> S4, V Semestre -> S5, VI Semestre -> S6)
  const normalizarSemestre = (sem?: string): 'S4' | 'S5' | 'S6' | null => {
    if (!sem) return null
    const s = sem.toUpperCase().trim()
    if (s === 'S4' || s === 'IV' || s.includes('IV') || s === '4' || s.startsWith('4')) return 'S4'
    if (s === 'S6' || s === 'VI' || s.includes('VI') || s === '6' || s.startsWith('6')) return 'S6'
    if (s === 'S5' || s === 'V' || (s.includes('V') && !s.includes('IV') && !s.includes('VI')) || s === '5' || s.startsWith('5')) return 'S5'
    return null
  }

  // Helper para verificar pertenencia a carrera
  const perteneceACarrera = (p: any, c: Carrera): boolean => {
    if (p.carreraId && p.carreraId === c.id) return true
    if (p.carrera && c.nombre && p.carrera.toLowerCase().trim() === c.nombre.toLowerCase().trim()) return true
    const pNorm = (p.carrera || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const cNorm = (c.nombre || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (pNorm && cNorm && (pNorm.includes(cNorm) || cNorm.includes(pNorm))) return true
    if (pNorm.includes('software') && cNorm.includes('software')) return true
    if (pNorm.includes('administraci') && cNorm.includes('administraci')) return true
    if (pNorm.includes('mecatronic') && cNorm.includes('mecatronic')) return true
    if (pNorm.includes('electric') && cNorm.includes('electric')) return true
    return false
  }

  // 1. Alumnos pertenecientes estrictamente al periodo activo (o por defecto en migración)
  const alumnosPeriodo = useMemo(() => {
    return practicantes.filter(p => !p.periodoId || p.periodoId === periodoActivo.id)
  }, [practicantes, periodoActivo.id])

  // 2. Alumnos activos y retirados del periodo activo
  const activos = useMemo(() => {
    return alumnosPeriodo.filter(p => p.estadoLaboral !== 'retirado' && p.estado !== 'retirado')
  }, [alumnosPeriodo])

  const retirados = useMemo(() => {
    return alumnosPeriodo.filter(p => p.estadoLaboral === 'retirado' || p.estado === 'retirado')
  }, [alumnosPeriodo])

  // 3. Desglose estrictamente matemático por Carrera y Semestre
  const desgloseCarreras = useMemo(() => {
    return carreras.map(c => {
      const alumnosCarrera = activos.filter(p => perteneceACarrera(p, c))
      const s4Count = alumnosCarrera.filter(p => normalizarSemestre(p.semestre) === 'S4').length
      const s5Count = alumnosCarrera.filter(p => normalizarSemestre(p.semestre) === 'S5').length
      const s6Count = alumnosCarrera.filter(p => normalizarSemestre(p.semestre) === 'S6').length
      const totalAlumnos = s4Count + s5Count + s6Count

      return {
        carrera: c,
        s4Count,
        s5Count,
        s6Count,
        totalAlumnos,
      }
    })
  }, [carreras, activos])

  // 4. Supervisores y Alumnos a cargo estrictamente en el periodo activo
  const supervisoresConCarga = useMemo(() => {
    return monitores.map(m => {
      const asignados = activos.filter(p => {
        const matchSupervisor = p.monitorId === m.id || (p as any).supervisorId === m.id
        const matchPeriodo = !p.periodoId || p.periodoId === periodoActivo.id
        return matchSupervisor && matchPeriodo
      })
      return {
        supervisor: m,
        totalAlumnos: asignados.length,
      }
    })
  }, [monitores, activos, periodoActivo.id])

  // 5. Especialistas y Semestres Asignados
  const especialistasConAsignaciones = useMemo(() => {
    return especialistas.map(esp => {
      const asigs = carreras.flatMap(c =>
        (c.asignaciones || [])
          .filter(a => a.especialistaId === esp.id)
          .map(a => ({ carreraNombre: c.nombre, semestres: a.semestres || ['S4', 'S5', 'S6'] }))
      )
      return {
        especialista: esp,
        asigs,
      }
    })
  }, [especialistas, carreras])

  // Datos del calendario legacy
  const activoSem = semestres[0]
  const [fInicioPost, setFInicioPost] = useState(activoSem?.fechaInicioPostulacion ?? '')
  const [fFinPost, setFFinPost] = useState(activoSem?.fechaFinPostulacion ?? '')
  const fInicioConv = periodoActivo.fechaInicio || '2026-08-03'
  const [fFinConv, setFFinConv] = useState(() => {
    return periodoActivo.fechaFinConvenio || activoSem?.fechaFinConvenio || sumarDosMeses(periodoActivo.fechaInicio) || '2026-10-03'
  })
  const [linkPost, setLinkPost] = useState(activoSem?.linkPostulacion ?? '')
  const [forzarCierre, setForzarCierre] = useState(activoSem?.forzarCierrePostulacion ?? false)
  const [limitePostulantes, setLimitePostulantes] = useState<number>(activoSem?.limitePostulantes ?? 0)
  const [copiado, setCopiado] = useState(false)

  const [nuevoFeriadoFecha, setNuevoFeriadoFecha] = useState('')
  const [nuevoFeriadoMotivo, setNuevoFeriadoMotivo] = useState('')
  const listaFeriados = periodoActivo.feriados || activoSem?.feriados || []

  useEffect(() => {
    if (activoSem) {
      setForzarCierre(activoSem.forzarCierrePostulacion ?? false)
      setLimitePostulantes(activoSem.limitePostulantes ?? 0)
    }
    if (periodoActivo) {
      const finConvenio = periodoActivo.fechaFinConvenio || activoSem?.fechaFinConvenio || sumarDosMeses(periodoActivo.fechaInicio)
      if (finConvenio) setFFinConv(finConvenio)
    }
  }, [activoSem?.forzarCierrePostulacion, activoSem?.limitePostulantes, periodoActivo.id, periodoActivo.fechaInicio, periodoActivo.fechaFinConvenio])

  const enlacePostulacion = useMemo(() => {
    if (typeof window === 'undefined') return 'http://localhost:5173/#/postula'
    return `${window.location.origin}/#/postula`
  }, [])

  const hoyFechaStr = new Date().toISOString().split('T')[0]
  const fueraDeFecha = (fInicioPost && hoyFechaStr < fInicioPost) || (fFinPost && hoyFechaStr > fFinPost)
  const limiteAlcanzado = limitePostulantes > 0 && postulaciones.length >= limitePostulantes
  const isPostulacionAbierta = !forzarCierre && !fueraDeFecha && !limiteAlcanzado

  const handleCopiarEnlace = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(enlacePostulacion)
      setCopiado(true)
      toast.success('Enlace de postulación copiado al portapapeles')
      setTimeout(() => setCopiado(false), 2000)
    } else {
      toast.error('No se pudo copiar el enlace')
    }
  }

  const handleToggleForzarCierre = (val: boolean) => {
    setForzarCierre(val)
    updateSemestreCalendario({ forzarCierrePostulacion: val })
    if (val) {
      toast.warning('Convocatoria forzada a CERRADO')
    } else {
      toast.success('Cierre forzado desactivado')
    }
  }

  const handleCambiarLimite = (val: number) => {
    const num = Math.max(0, val)
    setLimitePostulantes(num)
    updateSemestreCalendario({ limitePostulantes: num })
  }


  const handleGuardarCalendario = () => {
    updateSemestreCalendario({
      fechaInicioPostulacion: fInicioPost,
      fechaFinPostulacion: fFinPost,
      fechaInicioConvenio: fInicioConv,
      fechaFinConvenio: fFinConv,
      linkPostulacion: enlacePostulacion,
      forzarCierrePostulacion: forzarCierre,
      limitePostulantes: limitePostulantes
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

      {/* ── BANNER DEL PERIODO ACTIVO (Solo lectura y tiempo real) ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-200">
              Periodo Académico Activo
            </span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {periodoActivo.estado}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-[26px] font-black text-white m-0 tracking-tight leading-none">
              {periodoActivo.nombre}
            </h2>
            <div className="text-[12px] text-blue-200/80 font-medium flex items-center gap-1.5 mt-1.5">
              <CalendarIcon size={13} className="text-blue-300" />
              <span>
                {periodoActivo.fechaInicio} al {periodoActivo.fechaFin}
              </span>
            </div>
          </div>
        </div>

        {/* Botón Principal: Asignar Nuevo Periodo (Dispara el Wizard) */}
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="w-full mt-1 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 border border-white/20 shadow-md cursor-pointer transition-all active:scale-[0.98]"
        >
          <Rocket size={16} /> Asignar Nuevo Periodo
        </button>
      </div>

      {/* ── KPIs EN TIEMPO REAL ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activos</span>
          <span className="text-[22px] font-black text-blue-600 leading-tight mt-0.5">{activos.length}</span>
          <span className="text-[10px] text-slate-400 font-medium">alumnos</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supervisores</span>
          <span className="text-[22px] font-black text-emerald-600 leading-tight mt-0.5">{monitores.length}</span>
          <span className="text-[10px] text-slate-400 font-medium">activos</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retirados</span>
          <span className="text-[22px] font-black text-rose-600 leading-tight mt-0.5">{retirados.length}</span>
          <span className="text-[10px] text-slate-400 font-medium">bajas</span>
        </div>
      </div>

      {/* ── LISTA 1: DESGLOSE POR CARRERA Y SEMESTRE (S4, S5, S6) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setColapCarreras(!colapCarreras)}
          className="w-full p-3.5 flex items-center justify-between bg-white text-left border-none cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" />
            <span className="text-[13px] font-bold text-slate-800">
              Desglose por Carrera y Semestre
            </span>
          </div>
          {colapCarreras ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {colapCarreras && (
          <div className="p-3.5 pt-0 border-t border-slate-100 flex flex-col gap-2.5">
            {desgloseCarreras.map(({ carrera: c, s4Count, s5Count, s6Count, totalAlumnos }) => (
              <div key={c.id} className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-800 truncate flex-1">{c.nombre}</span>
                  <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {totalAlumnos} {totalAlumnos === 1 ? 'alumno' : 'alumnos'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/40">
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    S4: {s4Count}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    S5: {s5Count}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    S6: {s6Count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LISTA 2: SUPERVISORES Y ALUMNOS A CARGO ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setColapSupervisores(!colapSupervisores)}
          className="w-full p-3.5 flex items-center justify-between bg-white text-left border-none cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users size={16} className="text-emerald-600" />
            <span className="text-[13px] font-bold text-slate-800">
              Supervisores y Alumnos a Cargo
            </span>
          </div>
          {colapSupervisores ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {colapSupervisores && (
          <div className="p-3.5 pt-0 border-t border-slate-100 flex flex-col gap-2">
            {supervisoresConCarga.map(({ supervisor: m, totalAlumnos }) => (
              <div key={m.id} className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-slate-800 truncate">{m.nombre}</div>
                  <div className="text-[10px] text-slate-400 truncate">{m.area || 'Operaciones'}</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                  {totalAlumnos} {totalAlumnos === 1 ? 'alumno' : 'alumnos'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LISTA 3: ESPECIALISTAS Y SEMESTRES ASIGNADOS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setColapEspecialistas(!colapEspecialistas)}
          className="w-full p-3.5 flex items-center justify-between bg-white text-left border-none cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-indigo-600" />
            <span className="text-[13px] font-bold text-slate-800">
              Especialistas y Semestres Asignados
            </span>
          </div>
          {colapEspecialistas ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {colapEspecialistas && (
          <div className="p-3.5 pt-0 border-t border-slate-100 flex flex-col gap-2">
            {especialistasConAsignaciones.map(({ especialista: esp, asigs }) => (
              <div key={esp.id} className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-800">{esp.nombres} {esp.apellidos}</span>
                  <span className="text-[10px] text-slate-400">{esp.correo}</span>
                </div>
                {asigs.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic">Sin carreras asignadas</span>
                ) : (
                  <div className="flex flex-col gap-1 pt-1 border-t border-slate-200/40">
                    {asigs.map((as, i) => (
                      <div key={i} className="text-[10px] text-slate-600 flex items-center justify-between">
                        <span className="truncate flex-1 font-medium">• {as.carreraNombre}</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 ml-1">
                          {as.semestres.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LISTA 4: ALUMNOS RETIRADOS (Reactivo) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setColapRetirados(!colapRetirados)}
          className="w-full p-3.5 flex items-center justify-between bg-white text-left border-none cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600" />
            <span className="text-[13px] font-bold text-slate-800">
              Alumnos Retirados ({retirados.length})
            </span>
          </div>
          {colapRetirados ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {colapRetirados && (
          <div className="p-3.5 pt-0 border-t border-slate-100 flex flex-col gap-2">
            {retirados.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-[12px] italic">
                No hay alumnos retirados en el periodo actual ({periodoActivo.nombre}).
              </div>
            ) : (
              retirados.map(p => (
                <div key={p.id} className="bg-rose-50/50 border border-rose-200/70 rounded-xl p-2.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-800">{p.nombre} {p.apellido || ''}</span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      Retirado
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {p.carrera} • Semestre: {p.semestre}
                  </div>
                  {p.motivoRetiro && (
                    <div className="text-[10px] text-rose-800 italic bg-white p-1.5 rounded-md border border-rose-200/50 mt-0.5">
                      <strong>Motivo:</strong> {p.motivoRetiro}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── ACORDEÓN 5: CALENDARIO Y FERIADOS DE SENATI (Configuración) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setColapCalendario(!colapCalendario)}
          className="w-full p-3.5 flex items-center justify-between bg-white text-left border-none cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-slate-600" />
            <span className="text-[13px] font-bold text-slate-800">
              Fechas de Convocatoria y Feriados
            </span>
          </div>
          {colapCalendario ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {colapCalendario && activoSem && (
          <div className="p-3.5 pt-0 border-t border-slate-100 flex flex-col gap-4 pt-3.5">
            {/* ── CONTENEDOR DE ESTADO Y ENLACE DE CONVOCATORIA (Mobile-First) ── */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 mb-4 flex flex-col gap-3">
              {/* Estado Dinámico (Badge) */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-700">Estado de Postulación</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${
                  isPostulacionAbierta ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {isPostulacionAbierta ? '🟢 Abierto' : '🔴 Cerrado'}
                </span>
              </div>

              {/* Campo de Enlace Local + Botón Copiar */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500">Enlace de Postulación (Entorno Local / Dinámico)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={enlacePostulacion}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 outline-none select-all truncate font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopiarEnlace}
                    title="Copiar enlace"
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 shadow-2xs"
                  >
                    {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span className="text-[10px]">{copiado ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Controles de Cierre y Límite */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200/60">
                {/* Toggle Switch: Forzar cierre de convocatoria */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-700">Forzar cierre de convocatoria</span>
                    <span className="text-[10px] text-slate-400">Bloquea el acceso sin importar la fecha límite</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forzarCierre}
                      onChange={(e) => handleToggleForzarCierre(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {/* Input Numérico: Límite de postulantes */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col flex-1">
                    <label className="text-[12px] font-bold text-slate-700">Límite de postulantes</label>
                    <span className="text-[10px] text-slate-400">0 = Sin límite · Registrados: {postulaciones.length}</span>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      value={limitePostulantes}
                      onChange={(e) => handleCambiarLimite(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-slate-700 text-center outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario Postulación */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="font-bold text-slate-800 text-[13px]">Formulario de Postulación</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Inicio</label>
                  <input type="date" value={fInicioPost} onChange={e => setFInicioPost(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Fin</label>
                  <input type="date" value={fFinPost} onChange={e => setFFinPost(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none" />
                </div>
              </div>
            </div>

            {/* Fechas de Convenio (Inicio readOnly automático, Fin editable +2 meses) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[13px]">Fechas del Convenio</span>
                <span className="text-[10px] text-slate-400 font-medium">Inicio automático · Fin editable (+2 meses)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Inicio (Periodo)</label>
                  <input
                    type="date"
                    readOnly
                    value={fInicioConv}
                    className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] outline-none cursor-not-allowed font-medium select-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Fin (Editable)</label>
                  <input
                    type="date"
                    value={fFinConv}
                    onChange={e => setFFinConv(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Feriados Oficiales y Calendario */}
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[13px]">Feriados Oficiales</span>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {listaFeriados.length} {listaFeriados.length === 1 ? 'feriado' : 'feriados'}
                </span>
              </div>

              {/* Inputs para registrar nuevo feriado */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={nuevoFeriadoFecha}
                  onChange={e => setNuevoFeriadoFecha(e.target.value)}
                  className="w-36 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
                <input
                  type="text"
                  placeholder="Motivo del feriado"
                  value={nuevoFeriadoMotivo}
                  onChange={e => setNuevoFeriadoMotivo(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddFeriado}
                  title="Agregar feriado"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border-none cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>

              {/* LISTA VISIBLE (ACUMULABLE) DEBAJO DE LOS INPUTS */}
              <div className="flex flex-col gap-1.5 mt-0.5">
                {listaFeriados.length === 0 ? (
                  <div className="text-center py-3 bg-slate-50 border border-slate-200/60 rounded-lg text-slate-400 text-[11px] italic">
                    No hay feriados oficiales registrados en este periodo.
                  </div>
                ) : (
                  listaFeriados.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] font-bold text-slate-800 truncate">{f.motivo}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{f.fecha}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeriado(f.id)}
                        title="Eliminar feriado"
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg border-none cursor-pointer active:scale-95 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button onClick={handleGuardarCalendario} className="w-full bg-slate-800 text-white rounded-xl py-2.5 font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer">
              <Save size={14} /> Guardar Fechas de Convocatoria
            </button>
          </div>
        )}
      </div>

      {/* ── WIZARD MODAL ── */}
      <WizardNuevoPeriodo
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
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
