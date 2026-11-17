import { useMemo, useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, supabase } from '../../lib/supabase'
import { arredonda, brl, dataCurta, mesAtual, mudarMes, nomeMes, num } from '../../lib/format'
import { somaPlanejado, totalDaCompra } from '../../lib/calculos'
import type { Compra, Forma, Item, OrcamentoMes, Pagamento } from '../../lib/types'
import Barra from '../../components/Barra'

export default function Mes({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { dados: compras } = useTabela<Compra>('compras', { ordem: 'data', asc: false })
  const { dados: itens } = useTabela<Item>('itens')
  const { dados: pags } = useTabela<Pagamento>('pagamentos')
  const { dados: formas } = useTabela<Forma>('formas_pagamento', { ordem: 'ordem' })
  const { dados: orcamentos, recarregar } = useTabela<OrcamentoMes>('orcamento_mensal')

  const [ym, setYm] = useState(mesAtual())
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')

  const orcamento = orcamentos.find((o) => o.mes === `${ym}-01`)?.valor ?? 0

  const resumo = useMemo(() => {
    const doMes = compras.filter((c) => c.data.startsWith(ym))
    const itensPor = new Map<string, Item[]>()
    for (const i of itens) itensPor.set(i.compra_id, [...(itensPor.get(i.compra_id) ?? []), i])

    const totalDe = (c: Compra) => totalDaCompra(c.status, itensPor.get(c.id) ?? [])
    const finalizadas = doMes.filter((c) => c.status === 'finalizada')
    const abertas = doMes.filter((c) => c.status !== 'finalizada')

    const gasto = finalizadas.reduce((s, c) => s + totalDe(c), 0)
    const previsto = abertas.reduce(
      (s, c) => s + somaPlanejado(itensPor.get(c.id) ?? []),
      0,
    )

    // quanto foi pago com cada forma de pagamento (só compras finalizadas)
    const idsFinalizadas = new Set(finalizadas.map((c) => c.id))
    const porForma = new Map<string, number>()
    for (const p of pags) {
      if (!idsFinalizadas.has(p.compra_id)) continue
      const chave = p.forma_id ?? 'outra'
      porForma.set(chave, (porForma.get(chave) ?? 0) + p.valor)
    }

    return { doMes, totalDe, gasto, previsto, porForma }
  }, [compras, itens, pags, ym])

  async function salvarOrcamento(e: React.FormEvent) {
    e.preventDefault()
    const ok = await exec(
      supabase
        .from('orcamento_mensal')
        .upsert({ mes: `${ym}-01`, valor: num(valor) }, { onConflict: 'mes' }),
    )
    if (ok) {
      setEditando(false)
      void recarregar()
    }
  }

  const restante = arredonda(orcamento - resumo.gasto)
  const totalPago = [...resumo.porForma.values()].reduce((s, v) => s + v, 0)
  const nomeForma = (fid: string) =>
    fid === 'outra' ? 'Outra forma' : (formas.find((f) => f.id === fid)?.nome ?? 'Outra forma')

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-brand-500">Quanto já foi gasto</p>
        <h1 className="text-2xl font-bold text-brand-600">Mês</h1>
      </header>

      <div className="flex items-center justify-between rounded-full bg-brand-50 p-1">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand-600"
          onClick={() => setYm(mudarMes(ym, -1))}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <span className="font-semibold text-brand-600">{nomeMes(ym)}</span>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand-600"
          onClick={() => setYm(mudarMes(ym, 1))}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <section className="card space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              Gasto no mês
            </p>
            <p className="text-3xl font-bold text-brand-600">{brl(resumo.gasto)}</p>
          </div>
          <button
            className="btn-ghost px-3 py-2"
            onClick={() => {
              setValor(orcamento ? String(orcamento).replace('.', ',') : '')
              setEditando((v) => !v)
            }}
          >
            {editando ? 'Cancelar' : orcamento ? 'Editar orçamento' : 'Definir orçamento'}
          </button>
        </div>

        {editando && (
          <form onSubmit={salvarOrcamento} className="flex gap-2">
            <input
              className="input"
              inputMode="decimal"
              placeholder="Orçamento do mês (R$)"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary">
              Salvar
            </button>
          </form>
        )}

        {orcamento > 0 ? (
          <>
            <Barra valor={resumo.gasto} segundo={resumo.gasto + resumo.previsto} limite={orcamento} />
            <div className="flex justify-between text-sm">
              <span className="text-brand-500">Orçamento {brl(orcamento)}</span>
              <span className={`font-semibold ${restante < 0 ? 'text-rose-600' : 'text-brand-600'}`}>
                {restante >= 0 ? `Restam ${brl(restante)}` : `Passou ${brl(-restante)}`}
              </span>
            </div>
            {resumo.previsto > 0 && (
              <p className="text-xs text-brand-500">
                Mais {brl(resumo.previsto)} planejados em listas ainda abertas
                {resumo.gasto + resumo.previsto > orcamento ? ' — isso passaria do orçamento.' : '.'}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-brand-500">Defina um orçamento para acompanhar o mês.</p>
        )}
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold text-brand-600">Como foi pago</h2>
        {resumo.porForma.size === 0 ? (
          <p className="text-sm text-brand-500">
            Nenhum pagamento lançado em compras finalizadas neste mês.
          </p>
        ) : (
          <ul className="space-y-3">
            {[...resumo.porForma.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([fid, v]) => (
                <li key={fid}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{nomeForma(fid)}</span>
                    <strong>{brl(v)}</strong>
                  </div>
                  <Barra valor={v} limite={totalPago} />
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-600">Compras do mês</h2>
        {resumo.doMes.length === 0 && (
          <p className="card p-6 text-center text-brand-500">Nenhuma compra neste mês.</p>
        )}
        <ul className="space-y-2">
          {resumo.doMes.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onAbrir(c.id)}
                className="card flex w-full items-center justify-between p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.nome}</p>
                  <p className="text-xs text-brand-500">
                    {dataCurta(c.data)}
                    {c.mercado ? ` · ${c.mercado}` : ''}
                    {c.status !== 'finalizada' ? ' · em aberto' : ''}
                  </p>
                </div>
                <p className="shrink-0 font-bold text-brand-600">{brl(resumo.totalDe(c))}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
