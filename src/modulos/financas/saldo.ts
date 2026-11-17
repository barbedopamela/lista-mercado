// Lógica pura do saldo da conta conjunta (sem banco, sem tela).
// Ideia: o saldo NUNCA é guardado como "saldo de hoje". Guardamos só um ponto de
// partida (valor numa data) e somamos/subtraímos o que aconteceu depois dele.
// Assim o saldo não "descola" da realidade quando algo é editado ou apagado.

import type { ContaMes, Lancamento, SaldoConjunta } from '../../lib/types'
const arredonda = (n: number) => Math.round(n * 100) / 100

type Base = Pick<SaldoConjunta, 'valor' | 'data'> | null
type Lanc = Pick<Lancamento, 'tipo' | 'valor' | 'data' | 'conta_pessoal_de'>
type Conta = Pick<ContaMes, 'valor' | 'paga' | 'pulada' | 'pago_em' | 'conta_pessoal_de'>

/** Entra no saldo? Só conta conjunta, depois da data de partida e até hoje. */
const conta = (data: string | null, base: Base, ate: string) =>
  !!data && (!base || data > base.data) && data <= ate

/** Saldo da conta conjunta em `ate` (normalmente hoje). */
export function saldoAtual(base: Base, lancs: Lanc[], contas: Conta[], ate: string): number {
  let s = base ? Number(base.valor) : 0
  for (const l of lancs) {
    if (l.conta_pessoal_de || !conta(l.data, base, ate)) continue
    s += l.tipo === 'entrada' ? Number(l.valor) : -Number(l.valor)
  }
  for (const c of contas) {
    if (c.conta_pessoal_de || c.pulada || !c.paga || !conta(c.pago_em, base, ate)) continue
    s -= Number(c.valor)
  }
  return arredonda(s)
}

/** Entradas, saídas e resultado da conta conjunta num mês ('YYYY-MM'). */
export function resumoDoMes(lancs: Lanc[], contas: Conta[], ym: string) {
  let entradas = 0
  let saidas = 0
  for (const l of lancs) {
    if (l.conta_pessoal_de || !l.data.startsWith(ym)) continue
    if (l.tipo === 'entrada') entradas += Number(l.valor)
    else saidas += Number(l.valor)
  }
  for (const c of contas) {
    if (c.conta_pessoal_de || c.pulada || !c.paga || !c.pago_em?.startsWith(ym)) continue
    saidas += Number(c.valor)
  }
  return {
    entradas: arredonda(entradas),
    saidas: arredonda(saidas),
    resultado: arredonda(entradas - saidas),
  }
}
