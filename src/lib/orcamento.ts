// Orçamento do mês dividido por forma de pagamento (lógica pura, sem tela).

export type FormaBase = { id: string; nome: string; ordem: number }

export type LinhaForma = {
  id: string // id da forma, ou 'outra' para pagamentos sem forma
  nome: string
  orcamento: number // 0 = sem orçamento definido para essa forma
  gasto: number
  restante: number // orcamento - gasto (negativo = passou)
}

const arredonda = (n: number) => Math.round(n * 100) / 100

/**
 * Uma linha por forma que tem orçamento OU já teve gasto no mês.
 * Formas na ordem escolhida em Ajustes; "Outra forma" (sem forma) por último.
 */
export function linhasPorForma(
  formas: FormaBase[],
  orcamento: Map<string, number>,
  gasto: Map<string, number>,
): LinhaForma[] {
  const linha = (id: string, nome: string): LinhaForma => {
    const o = orcamento.get(id) ?? 0
    const g = gasto.get(id) ?? 0
    return { id, nome, orcamento: o, gasto: arredonda(g), restante: arredonda(o - g) }
  }
  const linhas = [...formas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((f) => linha(f.id, f.nome))
    .filter((l) => l.orcamento > 0 || l.gasto > 0)
  // pagamentos de formas apagadas ou sem forma entram juntos em "Outra forma"
  const conhecidas = new Set(formas.map((f) => f.id))
  let outro = 0
  for (const [id, v] of gasto) if (!conhecidas.has(id)) outro += v
  if (outro > 0) linhas.push({ id: 'outra', nome: 'Outra forma', orcamento: 0, gasto: arredonda(outro), restante: -arredonda(outro) })
  return linhas
}

/** Total do mês = soma dos orçamentos de cada forma. */
export const somaOrcamentos = (orcamento: Map<string, number>) =>
  arredonda([...orcamento.values()].reduce((s, v) => s + v, 0))
