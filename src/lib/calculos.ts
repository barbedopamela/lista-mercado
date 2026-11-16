import type { Item, Status } from './types'

// Os totais NÃO ficam guardados no banco: são sempre calculados a partir dos
// itens. Assim existe uma única "fonte da verdade" e o total nunca fica
// diferente da soma dos itens.

export const totalLinha = (i: Item) => i.quantidade * i.preco

export const somaPlanejado = (itens: Item[]) =>
  itens.reduce((soma, i) => soma + totalLinha(i), 0)

export const somaCarrinho = (itens: Item[]) =>
  itens.filter((i) => i.no_carrinho).reduce((soma, i) => soma + totalLinha(i), 0)

/**
 * Valor "oficial" da compra:
 * - planejando: o que está na lista;
 * - no mercado / finalizada: o que foi para o carrinho (se nada foi marcado,
 *   usa o planejado, para não zerar uma compra em que ninguém marcou os itens).
 */
export function totalDaCompra(status: Status, itens: Item[]): number {
  const planejado = somaPlanejado(itens)
  if (status === 'planejando') return planejado
  const carrinho = somaCarrinho(itens)
  return carrinho > 0 ? carrinho : planejado
}
