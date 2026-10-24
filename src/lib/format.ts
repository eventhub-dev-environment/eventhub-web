const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
export const money = (n: number) => cop.format(n)
export const dateParts = (iso: string) => {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('es-CO', { day: '2-digit' }),
    month: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
    long: d.toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }),
  }
}
