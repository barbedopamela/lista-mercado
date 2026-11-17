// Lógica pura das contas da casa (sem banco, sem tela), para ser fácil de testar.
// Ideia central: a "conta fixa" é um MOLDE; a "conta do mês" é a linha real de
// cada mês, criada a partir do molde quando o mês é aberto.

import type { ContaFixa, ContaMes } from '../../lib/types'

export type FixaBase = Pick<
  ContaFixa,
  | 'id'
  | 'nome'
  | 'valor'
  | 'dia_vencimento'
  | 'categoria_id'
  | 'conta_pessoal_de'
  | 'primeiro_mes'
  | 'parcelas'
  | 'ativa'
>

const indice = (ym: string) => {
  const [a = 0, m = 1] = ym.split('-').map(Number)
  return a * 12 + (m - 1)
}

/** Quantos meses de `de` até `ate` (ambos 'YYYY-MM'). */
export const diffMeses = (de: string, ate: string) => indice(ate) - indice(de)

export function diasNoMes(ym: string): number {
  const [a = 0, m = 1] = ym.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}

/** Data de vencimento no mês. Dia 31 em fevereiro vira o último dia do mês. */
export function vencimentoDoMes(ym: string, dia: number): string {
  const d = Math.min(Math.max(dia, 1), diasNoMes(ym))
  return `${ym}-${String(d).padStart(2, '0')}`
}

/** A conta existe neste mês? Se for parcelada, devolve também "parcela x de y". */
export function ocorrenciaNoMes(
  c: FixaBase,
  ym: string,
): { parcela_n: number | null; parcela_total: number | null } | null {
  if (!c.ativa) return null
  const diff = diffMeses(c.primeiro_mes.slice(0, 7), ym)
  if (diff < 0) return null
  if (c.parcelas == null) return { parcela_n: null, parcela_total: null }
  if (diff >= c.parcelas) return null
  return { parcela_n: diff + 1, parcela_total: c.parcelas }
}

export type NovaContaMes = {
  conta_id: string
  mes: string
  nome: string
  valor: number
  vencimento: string
  categoria_id: string | null
  conta_pessoal_de: string | null
  parcela_n: number | null
  parcela_total: number | null
}

/** Contas fixas que ainda não têm linha neste mês. */
export function faltandoGerar(
  fixas: FixaBase[],
  existentes: { conta_id: string | null }[],
  ym: string,
): NovaContaMes[] {
  const ja = new Set(existentes.map((e) => e.conta_id).filter((x): x is string => !!x))
  return fixas.flatMap((c) => {
    if (ja.has(c.id)) return []
    const o = ocorrenciaNoMes(c, ym)
    if (!o) return []
    return [
      {
        conta_id: c.id,
        mes: `${ym}-01`,
        nome: c.nome,
        valor: c.valor,
        vencimento: vencimentoDoMes(ym, c.dia_vencimento),
        categoria_id: c.categoria_id,
        conta_pessoal_de: c.conta_pessoal_de,
        parcela_n: o.parcela_n,
        parcela_total: o.parcela_total,
      },
    ]
  })
}

export type Atualizacao = {
  id: string
  patch: Partial<
    Pick<
      ContaMes,
      | 'nome'
      | 'valor'
      | 'vencimento'
      | 'categoria_id'
      | 'conta_pessoal_de'
      | 'parcela_n'
      | 'parcela_total'
    >
  >
}

/**
 * Quando o molde muda, o que acontece com as linhas já criadas?
 * - Meses passados e contas já pagas NUNCA mudam (é o histórico).
 * - Linhas do mês atual em diante: recebem as mudanças, exceto valor e data
 *   se você já ajustou aquele mês na mão (`ajustada`).
 * - Se o molde foi desativado ou o parcelamento encurtou, as linhas que
 *   deixaram de existir (e não foram pagas) são apagadas.
 */
export function sincronizar(
  fixa: FixaBase,
  ocorrencias: Pick<ContaMes, 'id' | 'conta_id' | 'mes' | 'paga' | 'ajustada'>[],
  mesAtualYm: string,
): { atualizar: Atualizacao[]; apagar: string[] } {
  const atualizar: Atualizacao[] = []
  const apagar: string[] = []
  for (const o of ocorrencias) {
    if (o.conta_id !== fixa.id || o.paga) continue
    const ym = o.mes.slice(0, 7)
    if (ym < mesAtualYm) continue
    const oc = ocorrenciaNoMes(fixa, ym)
    if (!oc) {
      apagar.push(o.id)
      continue
    }
    const patch: Atualizacao['patch'] = {
      nome: fixa.nome,
      categoria_id: fixa.categoria_id,
      conta_pessoal_de: fixa.conta_pessoal_de,
      parcela_n: oc.parcela_n,
      parcela_total: oc.parcela_total,
    }
    if (!o.ajustada) {
      patch.valor = fixa.valor
      patch.vencimento = vencimentoDoMes(ym, fixa.dia_vencimento)
    }
    atualizar.push({ id: o.id, patch })
  }
  return { atualizar, apagar }
}

export type SituacaoConta = 'paga' | 'atrasada' | 'hoje' | 'aberta'

export function situacao(c: Pick<ContaMes, 'paga' | 'vencimento'>, hojeStr: string): SituacaoConta {
  if (c.paga) return 'paga'
  if (c.vencimento < hojeStr) return 'atrasada'
  if (c.vencimento === hojeStr) return 'hoje'
  return 'aberta'
}

const arredonda = (n: number) => Math.round(n * 100) / 100

/** Totais do mês. Contas "puladas" não contam. */
export function resumoMes(contas: Pick<ContaMes, 'valor' | 'paga' | 'pulada' | 'conta_pessoal_de'>[]) {
  const ativas = contas.filter((c) => !c.pulada)
  const soma = (l: typeof ativas) => arredonda(l.reduce((s, c) => s + Number(c.valor), 0))
  const total = soma(ativas)
  const pago = soma(ativas.filter((c) => c.paga))
  const conjunta = ativas.filter((c) => !c.conta_pessoal_de)
  return {
    total,
    pago,
    falta: arredonda(total - pago),
    conjuntaTotal: soma(conjunta),
    conjuntaFalta: soma(conjunta.filter((c) => !c.paga)),
  }
}
