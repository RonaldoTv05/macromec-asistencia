/**
 * Suma exactamente 2 meses a una fecha en formato ISO (YYYY-MM-DD)
 * Ej: '2026-08-03' -> '2026-10-03', '2026-08-15' -> '2026-10-15'
 */
export function sumarDosMeses(fechaISO: string): string {
  if (!fechaISO) return '';
  const [y, m, d] = fechaISO.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + 2);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
