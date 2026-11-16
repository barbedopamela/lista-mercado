import { useMemo, useState } from 'react'
import { useTabela } from '../hooks/useTabela'
import { supabase } from '../lib/supabase'
import { brl, dataCurta, hoje, num } from '../lib/format'
import { somaPlanejado, totalDaCompra } from '../lib/calculos'
import { NOME_STATUS, type Compra, type Item } from '../lib/types'
import Barra from '../components/Barra'

export default function Listas({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { dados: compras, recarregar } = useTabela<Compra>('compras', { ordem: 'data', asc: false })
  const { dados: itens } = useTabela<Item>('itens')

  const [aba, setAba] = useState<'abertas' | 'finalizadas'>('abertas')
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [mercado, setMercado] = useState('')
  const [orcamento, setOrcamento] = useState('')
  const [data, setData] = useState(hoje())

  const itensPorCompra = useMemo(() => {
    const mapa = new Map<string, Item[]>()
    for (const i of itens) mapa.set(i.compra_id, [...(mapa.get(i.compra_id) ?? []), i])
    return mapa
  }, [itens])

  const visiveis = compras.filter((c) =>
    aba === 'abertas' ? c.status !== 'finalizada' : c.status === 'finalizada',
  )

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    const { data: nova, error } = await supabase
      .from('compras')
      .insert({
        nome: nome.trim() || 'Compra do mercado',
        mercado: mercado.trim() || null,
        orcamento: num(orcamento),
        data,
      })
      .select('id')
      .single()
    if (error) {
      alert('Ops, algo deu errado: ' + error.message)
      return
    }
    setNome('')
    setMercado('')
    setOrcamento('')
    setCriando(false)
    void recarregar()
    onAbrir(nova.id as string)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-brand-500">Compras de mercado</p>
          <h1 className="text-2xl font-bold text-brand-600">Listas</h1>
        </div>
        <button className="btn-primary" onClick={() => setCriando((v) => !v)}>
          {criando ? 'Cancelar' : '+ Nova'}
        </button>
      </header>

      {criando && (
        <form onSubmit={criar} className="card space-y-3 p-4">
          <div>
            <label className="label">Nome da compra</label>
            <input
              className="input"
              placeholder="Ex.: Compra do mês"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mercado (opcional)</label>
              <input
                className="input"
                placeholder="Ex.: Assaí"
                value={mercado}
                onChange={(e) => setMercado(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Data</label>
              <input
                type="date"
                className="input"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Orçamento desta compra (R$)</label>
            <input
              className="input"
              inputMode="decimal"
              placeholder="0,00"
              value={orcamento}
              onChange={(e) => setOrcamento(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full" type="submit">
            Criar e abrir
          </button>
        </form>
      )}

      <div className="flex gap-2 rounded-full bg-brand-50 p-1">
        {(['abertas', 'finalizadas'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition ${
              aba === a ? 'bg-white text-brand-600 shadow-soft' : 'text-brand-500'
            }`}
          >
            {a === 'abertas' ? 'Em aberto' : 'Finalizadas'}
          </button>
        ))}
      </div>

      {visiveis.length === 0 && (
        <div className="card p-8 text-center text-brand-500">
          {aba === 'abertas'
            ? 'Nenhuma lista em aberto. Toque em “+ Nova” para começar.'
            : 'Ainda não há compras finalizadas.'}
        </div>
      )}

      <ul className="space-y-3">
        {visiveis.map((c) => {
          const its = itensPorCompra.get(c.id) ?? []
          const total = totalDaCompra(c.status, its)
          return (
            <li key={c.id}>
              <button onClick={() => onAbrir(c.id)} className="card w-full p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{c.nome}</p>
                    <p className="text-sm text-brand-500">
                      {dataCurta(c.data)}
                      {c.mercado ? ` · ${c.mercado}` : ''} · {its.length}{' '}
                      {its.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-brand-600">
                    {NOME_STATUS[c.status]}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-2xl font-bold text-brand-600">{brl(total)}</p>
                  {c.orcamento > 0 && (
                    <p className="text-sm text-brand-500">de {brl(c.orcamento)}</p>
                  )}
                </div>
                {c.orcamento > 0 && (
                  <div className="mt-2">
                    <Barra
                      valor={total}
                      segundo={somaPlanejado(its)}
                      limite={c.orcamento}
                    />
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
