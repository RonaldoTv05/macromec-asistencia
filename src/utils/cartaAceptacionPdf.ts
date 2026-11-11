import type { Carrera, Monitor, Practicante } from '../types'

const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export interface DatosCartaAceptacion {
  nombreEstudiante: string
  dni: string
  carrera: string
  semestre: string
  areaPractica: string
  modalidad: string
  fechaActual?: string
}

let logoBase64Cache: string | null = null

function escaparHtml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Formatea la fecha actual en español con mes capitalizado (ej. "11 de Noviembre de 2026").
 */
export function formatFechaActualEspanol(fecha: Date = new Date()): string {
  const dia = fecha.getDate()
  const mes = MESES_ES[fecha.getMonth()] || ''
  const anio = fecha.getFullYear()
  return `${dia} de ${mes} de ${anio}`
}

/**
 * Capitaliza la modalidad laboral para presentación formal en documento.
 */
export function capitalizarModalidad(modalidad?: string): string {
  const limpia = (modalidad || '').trim()
  if (!limpia) return 'Presencial'
  return limpia.charAt(0).toUpperCase() + limpia.slice(1).toLowerCase()
}

/**
 * Extrae desde Zustand los datos reales del estudiante/practicante para poblar la Carta de Aceptación.
 */
export function extraerDatosCartaPracticante(
  practicante: Practicante,
  usuario: { nombre?: string; dni?: string; carrera?: string; semestre?: string; modalidadBase?: string; area?: string } | null | undefined,
  carreras: Carrera[] = [],
  monitores: Monitor[] = []
): DatosCartaAceptacion {
  const nombreDesdePracticante = [practicante.nombre, practicante.apellido]
    .filter(Boolean)
    .join(' ')
    .trim()
  const nombreEstudiante = nombreDesdePracticante || usuario?.nombre?.trim() || 'Estudiante'
  const dni = practicante.dni || usuario?.dni || '--------'

  const carreraObj = carreras.find(
    (c) => c.id === practicante.carreraId || c.nombre === practicante.carrera
  )
  const carrera =
    carreraObj?.nombre ||
    practicante.carrera ||
    usuario?.carrera ||
    'No definida'

  const semestre = practicante.semestre || usuario?.semestre || 'No definido'

  const monitorObj = monitores.find(
    (m) => m.id === practicante.monitorId || m.id === practicante.supervisorId
  )
  const areaPractica =
    (practicante as { area?: string }).area?.trim() ||
    usuario?.area?.trim() ||
    monitorObj?.area?.trim() ||
    carrera

  const modalidad = capitalizarModalidad(
    practicante.modalidadBase || usuario?.modalidadBase
  )

  return {
    nombreEstudiante,
    dni,
    carrera,
    semestre,
    areaPractica,
    modalidad,
    fechaActual: formatFechaActualEspanol(),
  }
}

/**
 * Ejecuta un reemplazo iterativo sobre todas las variables dinámicas de la plantilla HTML.
 */
export function resolverVariablesCarta(
  templateHtml: string,
  datos: DatosCartaAceptacion
): string {
  const fechaTexto = datos.fechaActual || formatFechaActualEspanol()
  const reemplazos: Array<[string, string]> = [
    ['[Nombre estudiante]', escaparHtml(datos.nombreEstudiante)],
    ['[DNI]', escaparHtml(datos.dni)],
    ['[Carrera]', escaparHtml(datos.carrera)],
    ['[Semestre]', escaparHtml(datos.semestre)],
    ['[Área de Práctica]', escaparHtml(datos.areaPractica)],
    ['[Area de Practica]', escaparHtml(datos.areaPractica)],
    ['[Modalidad]', escaparHtml(datos.modalidad)],
    ['[Fecha Actual]', escaparHtml(fechaTexto)],
  ]

  let resultado = templateHtml
  for (const [token, valor] of reemplazos) {
    resultado = resultado.replace(token, valor)
    // Si el token aparece más de una vez en plantillas personalizadas, cubrir ocurrencias restantes
    if (resultado.includes(token)) {
      resultado = resultado.split(token).join(valor)
    }
  }
  return resultado
}

/**
 * Obtiene la URL pública del logo considerando el base path configurado en Vite.
 */
export function obtenerUrlPublicaLogo(): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const normalizada = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizada}logo-macromec.png`
}

/**
 * Reemplaza las referencias al archivo /logo-macromec.png por otra fuente (Base64 o URL con base path).
 */
export function resolverLogoSrcEnHtml(html: string, nuevoSrc: string): string {
  return html.replace(
    /(<img\b[^>]*?\bsrc=["'])(?:\/?macromec-asistencia)?\/?logo-macromec\.png(["'])/gi,
    `$1${nuevoSrc}$2`
  )
}

/**
 * Carga /logo-macromec.png y lo convierte a Base64 Data URL para evitar bloqueos CORS o 404 en el PDF.
 */
export async function cargarLogoBase64(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache

  const candidatos = Array.from(new Set([obtenerUrlPublicaLogo(), '/logo-macromec.png']))

  for (const url of candidatos) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) continue
      const contentType = resp.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) continue

      const blob = await resp.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
            resolve(reader.result)
          } else {
            reject(new Error('No se pudo convertir el logo a Base64'))
          }
        }
        reader.onerror = () => reject(reader.error || new Error('Error leyendo logo'))
        reader.readAsDataURL(blob)
      })

      logoBase64Cache = dataUrl
      return dataUrl
    } catch {
      // Continuar con el siguiente candidato
    }
  }

  return null
}

async function precargarImagen(src: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

/**
 * Genera y descarga el PDF en formato A4 estricto a partir de la plantilla HTML y los datos del estudiante.
 */
export async function generarCartaAceptacionPDF({
  htmlTemplate,
  datos,
  nombreArchivo,
}: {
  htmlTemplate: string
  datos: DatosCartaAceptacion
  nombreArchivo?: string
}): Promise<void> {
  let htmlFinal = resolverVariablesCarta(htmlTemplate, datos)

  const logoBase64 = await cargarLogoBase64()
  if (logoBase64) {
    htmlFinal = resolverLogoSrcEnHtml(htmlFinal, logoBase64)
    await precargarImagen(logoBase64)
  } else {
    const fallbackUrl = obtenerUrlPublicaLogo()
    htmlFinal = resolverLogoSrcEnHtml(htmlFinal, fallbackUrl)
    await precargarImagen(fallbackUrl)
  }

  const slugNombre = datos.nombreEstudiante
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  const filename = nombreArchivo || `Carta_Aceptacion_${slugNombre || 'Estudiante'}.pdf`

  const { default: html2pdf } = await import('html2pdf.js')

  await html2pdf()
    .set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      enableLinks: false,
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => {
          // Aísla el documento clonado de Tailwind v4 (evita error oklch/color-mix en html2canvas)
          clonedDoc
            .querySelectorAll('style, link[rel="stylesheet"]')
            .forEach((el) => el.remove())

          const a4Style = clonedDoc.createElement('style')
          a4Style.textContent = `
            * { box-sizing: border-box; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #333333 !important;
              font-family: 'Helvetica', 'Arial', sans-serif !important;
            }
            p { margin: 0 0 14px 0; }
            p:last-child { margin-bottom: 0; }
            h2 { font-weight: 700; }
            table { border-collapse: collapse; }
            img { display: inline-block; max-width: 100%; }
          `
          clonedDoc.head.appendChild(a4Style)

          const overlay = clonedDoc.querySelector('.html2pdf__overlay') as HTMLElement | null
          if (overlay) {
            overlay.style.opacity = '1'
            overlay.style.backgroundColor = '#ffffff'
          }
        },
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
    })
    .from(htmlFinal)
    .save()
}
