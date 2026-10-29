import { toast } from 'sonner'

/**
 * Base64 válido de un PDF estándar de 1 página representativo para PEA
 */
export const SAMPLE_PEA_PDF_BASE64 =
  'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Pj4KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iagQ0IDAgb2JqCjw8Ci9MZW5ndGggNTYKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFREClAoUGxhbiBkZSBBcHJlbmRpemFqZSBQRUEgU0VOQVRJIC0gTUFDUk9NRUMpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAowMDAwMDAwMjI4IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNQovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMzM0CiUlRU9GCg=='

/**
 * Descarga de archivo Base64 (DataURL o Base64 raw) forzando Blob nativo en el dispositivo
 */
export function descargarArchivoBase64(
  base64Data?: string,
  nombreArchivo = 'documento.pdf',
  tipoMimeFallback = 'application/pdf'
) {
  if (!base64Data) {
    toast.error('No hay archivo disponible para descargar')
    return
  }

  let mime = tipoMimeFallback
  let rawData = base64Data

  // Si es un Data URL (ej. "data:application/pdf;base64,JVBERi0xLjQK...")
  if (base64Data.startsWith('data:')) {
    const parts = base64Data.split(',')
    const mimeMatch = parts[0].match(/:(.*?);/)
    if (mimeMatch) {
      mime = mimeMatch[1]
    }
    rawData = parts[1] || ''
  }

  try {
    const byteCharacters = atob(rawData)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Descargando: ${nombreArchivo}`)
  } catch (err) {
    // Fallback preventivo si el string es texto plano o mock anterior
    try {
      const blob = new Blob([base64Data], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo.endsWith('.txt') ? nombreArchivo : `${nombreArchivo}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Descargando: ${nombreArchivo}`)
    } catch {
      toast.error('No se pudo generar el archivo para descarga')
    }
  }
}
