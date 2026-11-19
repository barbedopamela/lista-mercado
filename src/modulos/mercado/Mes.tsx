import { useMemo, useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, supabase } from '../../lib/supabase'
import { arredonda, brl, dataCurta, mesAtual, mudarMes, nomeMes, num } from '../../lib/format'
import { somaPlanejado, totalDaCompra } from '../../lib/calculos'
import type { Compra, Forma, Item, OrcamentoForma, OrcamentoMes, Pagamento } from '../../lib/types'
import { linhasPorForma, somaOrcamentos } from '../../lib/orcamento'
import Barra from '../../components/Barra'

export default function Mes({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { dados: compras } = useTabela<Compra>('compras', { ordem: 'data', asc: false })
  const { dados: itens } = useTabela<Item>('itens')
  const { dados: pags } = useTabela<Pagamento>('pagamentos')
  const { dados: formas } = useTabela<Forma>('formas_pagamento', { ordem: 'ordem' })
  const { dados: orcamentos, recarregar } = useTabela<OrcamentoMes>('orcamento_mensal')
  const { dados: orcFormas, recarregar: recarregarFormas } = useTabela<OrcamentoForma>('orcamento_formas')

  const [ym, setYm] = useState(mesAtual())
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [valoresForma, setValoresForma] = useState<Record<string, string>>({})

  // orçamento de cada forma neste mês
  const orcPorForma = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of orcFormas) if (o.mes === `${ym}-01` && Number(o.valor) > 0) m.set(o.forma_id, Number(o.valor))
    return m
  }, [orcFormas, ym])
  const dividido = orcPorForma.size > 0
  // com formas definidas, o total do mês é a soma delas; senão vale o valor único antigo
  const orcamento = dividido
    ? somaOrcamentos(orcPorForma)
    : (orcamentos.find((o) => o.mes === `${ym}-01`)?.valor ?? 0)

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
    const mes = `${ym}-01`
    let total = num(valor)
    if (formas.length > 0) {
      const preenchidas = formas.filter((f) => num(valoresForma[f.id] ?? '') > 0)
      const vazias = formas.filter((f) => num(valoresForma[f.id] ?? '') <= 0).map((f) => f.id)
      total = preenchidas.reduce((s, f) => s + num(valoresForma[f.id] ?? ''), 0)
      if (preenchidas.length > 0) {
        const ok = await exec(
          supabase.from('orcamento_formas').upsert(
            preenchidas.map((f) => ({ mes, forma_id: f.id, valor: num(valoresForma[f.id] ?? '') })),
            { onConflict: 'mes,forma_id' },
          ),
        )
        if (!ok) return
      }
      if (vazias.length > 0) {
        const ok = await exec(supabase.from('orcamento_formas').delete().eq('mes', mes).in('forma_id', vazias))
        if (!ok) return
      }
    }
    const ok = await exec(
      supabase.from('orcamento_mensal').upsert({ mes, valor: arredonda(total) }, { onConflict: 'mes' }),
    )
    if (ok) {
      setEditando(false)
      void recarregar()
      void recarregarFormas()
    }
  }

  function abrirEdicao() {
    setValor(orcamento ? String(orcamento).replace('.', ',') : '')
    const v: Record<string, string> = {}
    for (const [id, n] of orcPorForma) v[id] = String(n).replace('.', ',')
    setValoresForma(v)
    setEditando((x) => !x)
  }

  const totalEditado = arredonda(formas.reduce((s, f) => s + num(valoresForma[f.id] ?? ''), 0))

  const restante = arredonda(orcamento - resumo.gasto)
  const totalPago = [...resumo.porForma.values()].reduce((s, v) => s + v, 0)
  const linhas = linhasPorForma(formas, orcPorForma, resumo.porForma)

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
            onClick={abrirEdicao}
          >
            {editando ? 'Cancelar' : orcamento ? 'Editar orçamento' : 'Definir orçamento'}
          </button>
        </div>

        {editando && (
          <form onSubmit={salvarOrcamento} className="space-y-3">
            {formas.length > 0 ? (
              <>
                <p className="text-xs text-brand-500">
                  Quanto você quer gastar com cada forma de pagamento neste mês. Deixe em branco as que
                  não vai usar.
                </p>
                {formas.map((f) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <label className="w-28 shrink-0 text-sm font-semibold text-brand-600" htmlFor={`orc-${f.id}`}>
                      {f.nome}
                    </label>
                    <input
                      id={`orc-${f.id}`}
                      className="input px-3"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={valoresForma[f.id] ?? ''}
                      onChange={(e) => setValoresForma({ ...valoresForma, [f.id]: e.target.value })}
                    />
                  </div>
                ))}
                <p className="text-sm text-brand-500">
                  Total do mês: <strong>{brl(totalEditado)}</strong>
                </p>
              </>
            ) : (
              <input
                className="input"
                inputMode="decimal"
                placeholder="Orçamento do mês (R$)"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                autoFocus
              />
            )}
            <button type="submit" className="btn-primary w-full">
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
        {linhas.length === 0 ? (
          <p className="text-sm text-brand-500">
            Defina o orçamento de cada forma e lance pagamentos em compras finalizadas para acompanhar aqui.
          </p>
        ) : (
          <ul className="space-y-4">
            {linhas.map((l) => (
              <li key={l.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{l.nome}</span>
                  <span>
                    <strong>{brl(l.gasto)}</strong>
                    {l.orcamento > 0 && <span className="text-brand-500"> de {brl(l.orcamento)}</span>}
                  </span>
                </div>
                <Barra valor={l.gasto} limite={l.orcamento > 0 ? l.orcamento : totalPago} />
                {l.orcamento > 0 && (
                  <p className={`text-xs ${l.restante < 0 ? 'font-semibold text-rose-600' : 'text-brand-500'}`}>
                    {l.restante >= 0 ? `Restam ${brl(l.restante)}` : `Passou ${brl(-l.restante)}`}
                  </p>
                )}
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
