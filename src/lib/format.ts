const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const brl = (n: number) => moeda.format(n || 0)

/** Converte o que a pessoa digitou ("5,50" ou "5.50") em número. */
export function num(texto: string): number {
  const n = parseFloat(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const arredonda = (n: number) => Math.round(n * 100) / 100

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** Data de hoje no fuso local, como 'YYYY-MM-DD'. */
export function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`
}

/** Mês atual no fuso local, como 'YYYY-MM'. */
export const mesAtual = () => hoje().slice(0, 7)

export function mudarMes(ym: string, delta: number): string {
  const [a, m] = ym.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`
}

export function nomeMes(ym: string): string {
  const [a = 0, m = 1] = ym.split('-').map(Number)
  const texto = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1) // "Novembro de 2026"
}

export function dataCurta(data: string): string {
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

/** Número em texto para campos de digitação ("5.5" vira "5,5"). */
export const txt = (n: number) => String(n).replace('.', ',')
