import { useMemo, useRef, useState } from 'react'
import { useTabela } from '../hooks/useTabela'
import { exec, supabase } from '../lib/supabase'
import { usePerfis } from '../lib/contexto'
import { arredonda, brl, dataCurta, num } from '../lib/format'
import { somaCarrinho, somaPlanejado, totalDaCompra, totalLinha } from '../lib/calculos'
import {
  NOME_STATUS,
  type Categoria,
  type Compra,
  type Forma,
  type Item,
  type Pagamento,
  type Perfil,
  type Status,
} from '../lib/types'
import Avatar from '../components/Avatar'
import Barra from '../components/Barra'

const txt = (n: number) => String(n).replace('.', ',')

export default function CompraDetalhe({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const { perfis } = usePerfis()
  const { dados: compras, carregando, recarregar: recC } = useTabela<Compra>('compras', {
    coluna: 'id',
    valor: id,
  })
  const { dados: itens, recarregar: recI } = useTabela<Item>('itens', {
    coluna: 'compra_id',
    valor: id,
    ordem: 'created_at',
  })
  const { dados: pags, recarregar: recP } = useTabela<Pagamento>('pagamentos', {
    coluna: 'compra_id',
    valor: id,
    ordem: 'created_at',
  })
  const { dados: cats } = useTabela<Categoria>('categorias', { ordem: 'ordem' })
  const { dados: formas } = useTabela<Forma>('formas_pagamento', { ordem: 'ordem' })

  const [editando, setEditando] = useState(false)
  const compra = compras[0]
  const status = compra?.status

  const planejado = useMemo(() => somaPlanejado(itens), [itens])
  const carrinho = useMemo(() => somaCarrinho(itens), [itens])

  const grupos = useMemo(() => {
    const idsCats = new Set(cats.map((c) => c.id))
    const mapa = new Map<string, Item[]>()
    for (const i of itens) {
      const chave = i.categoria_id && idsCats.has(i.categoria_id) ? i.categoria_id : 'sem'
      mapa.set(chave, [...(mapa.get(chave) ?? []), i])
    }
    const ordenar = (lista: Item[]) =>
      status === 'no_mercado'
        ? [...lista].sort((a, b) => Number(a.no_carrinho) - Number(b.no_carrinho))
        : lista
    const lista = cats
      .filter((c) => mapa.has(c.id))
      .map((c) => ({
        chave: c.id,
        titulo: `${c.emoji ?? '🛒'} ${c.nome}`,
        itens: ordenar(mapa.get(c.id)!),
      }))
    if (mapa.has('sem')) {
      lista.push({ chave: 'sem', titulo: '🛒 Sem categoria', itens: ordenar(mapa.get('sem')!) })
    }
    return lista
  }, [itens, cats, status])

  if (!compra) {
    return carregando ? (
      <p className="py-10 text-center text-brand-500">Carregando…</p>
    ) : (
      <div className="space-y-4 py-10 text-center">
        <p className="text-brand-500">Esta compra não existe mais.</p>
        <button className="btn-primary" onClick={onVoltar}>
          Voltar
        </button>
      </div>
    )
  }

  const perfilPor = (uid: string | null): Perfil | undefined => perfis.find((p) => p.id === uid)
  const referencia = compra.status === 'planejando' ? planejado : carrinho
  const restante = arredonda(compra.orcamento - referencia)
  const total = totalDaCompra(compra.status, itens)
  const semCarrinho = itens.filter((i) => !i.no_carrinho).length

  async function mudarStatus(novo: Status) {
    if (novo === compra.status) return
    if (novo === 'finalizada' && carrinho > 0 && semCarrinho > 0) {
      const ok = window.confirm(
        `${semCarrinho} ${semCarrinho === 1 ? 'item ficou' : 'itens ficaram'} fora do carrinho e não ${
          semCarrinho === 1 ? 'entra' : 'entram'
        } no total. Finalizar mesmo assim?`,
      )
      if (!ok) return
    }
    if (await exec(supabase.from('compras').update({ status: novo }).eq('id', compra.id))) {
      void recC()
    }
  }

  async function excluir() {
    if (!window.confirm('Excluir esta compra com todos os itens e pagamentos?')) return
    if (await exec(supabase.from('compras').delete().eq('id', compra.id))) onVoltar()
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <button
          onClick={onVoltar}
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"
          aria-label="Voltar"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-brand-600">{compra.nome}</h1>
          <p className="text-sm text-brand-500">
            {dataCurta(compra.data)}
            {compra.mercado ? ` · ${compra.mercado}` : ''}
          </p>
        </div>
        <button className="btn-ghost px-3 py-2" onClick={() => setEditando((v) => !v)}>
          {editando ? 'Fechar' : 'Editar'}
        </button>
      </header>

      {editando && (
        <EditarCompra
          compra={compra}
          onSalvo={() => {
            setEditando(false)
            void recC()
          }}
          onExcluir={excluir}
        />
      )}

      {/* Resumo fixo no topo: fica visível enquanto se rola a lista */}
      <div className="sticky top-0 z-10 -mx-4 bg-white/95 px-4 pb-1 pt-2 backdrop-blur">
        <div className="card space-y-3 p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Numero titulo="Planejado" valor={brl(planejado)} />
            <Numero titulo="No carrinho" valor={brl(carrinho)} destaque />
            <Numero
              titulo="Orçamento"
              valor={compra.orcamento > 0 ? brl(compra.orcamento) : '—'}
            />
          </div>
          {compra.orcamento > 0 ? (
            <>
              <Barra valor={carrinho} segundo={planejado} limite={compra.orcamento} />
              <p
                className={`text-sm font-semibold ${
                  restante < 0 ? 'text-rose-600' : 'text-brand-600'
                }`}
              >
                {restante >= 0
                  ? `Ainda cabem ${brl(restante)} no orçamento`
                  : `Passou ${brl(-restante)} do orçamento`}
              </p>
              {planejado > compra.orcamento && compra.status === 'planejando' && (
                <p className="text-xs text-amber-700">
                  A lista planejada já passa do orçamento em {brl(planejado - compra.orcamento)}.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-brand-500">
              Sem orçamento definido para esta compra. Toque em “Editar” para definir.
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 rounded-full bg-brand-50 p-1">
        {(['planejando', 'no_mercado', 'finalizada'] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => void mudarStatus(s)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition sm:text-sm ${
              compra.status === s ? 'bg-brand-600 text-white shadow-soft' : 'text-brand-500'
            }`}
          >
            {NOME_STATUS[s]}
          </button>
        ))}
      </div>

      <NovoItem compraId={compra.id} cats={cats} onAdicionado={() => void recI()} />

      <section className="space-y-4">
        {itens.length === 0 && (
          <p className="card p-6 text-center text-brand-500">
            A lista está vazia. Adicione o primeiro item acima.
          </p>
        )}
        {grupos.map((g) => (
          <div key={g.chave} className="card overflow-hidden">
            <div className="flex items-center justify-between bg-teal-50 px-4 py-2">
              <h3 className="text-sm font-semibold text-brand-600">{g.titulo}</h3>
              <span className="text-xs text-brand-500">
                {brl(g.itens.reduce((s, i) => s + totalLinha(i), 0))}
              </span>
            </div>
            <ul className="divide-y divide-brand-50">
              {g.itens.map((i) => (
                <LinhaItem
                  key={i.id}
                  item={i}
                  cats={cats}
                  autor={perfilPor(i.adicionado_por)}
                  onMudou={() => void recI()}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <PagamentosCompra
        compraId={compra.id}
        total={total}
        pags={pags}
        formas={formas}
        onMudou={() => void recP()}
      />
    </div>
  )
}

function Numero({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">{titulo}</p>
      <p className={`font-bold ${destaque ? 'text-lg text-brand-600' : 'text-base'}`}>{valor}</p>
    </div>
  )
}

function EditarCompra({
  compra,
  onSalvo,
  onExcluir,
}: {
  compra: Compra
  onSalvo: () => void
  onExcluir: () => void
}) {
  const [nome, setNome] = useState(compra.nome)
  const [mercado, setMercado] = useState(compra.mercado ?? '')
  const [data, setData] = useState(compra.data)
  const [orcamento, setOrcamento] = useState(compra.orcamento ? txt(compra.orcamento) : '')

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const ok = await exec(
      supabase
        .from('compras')
        .update({
          nome: nome.trim() || compra.nome,
          mercado: mercado.trim() || null,
          data,
          orcamento: num(orcamento),
        })
        .eq('id', compra.id),
    )
    if (ok) onSalvo()
  }

  return (
    <form onSubmit={salvar} className="card space-y-3 p-4">
      <div>
        <label className="label">Nome</label>
        <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Mercado</label>
          <input className="input" value={mercado} onChange={(e) => setMercado(e.target.value)} />
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
          value={orcamento}
          onChange={(e) => setOrcamento(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">
          Salvar
        </button>
        <button type="button" onClick={onExcluir} className="btn bg-rose-50 text-rose-600">
          Excluir
        </button>
      </div>
    </form>
  )
}

function NovoItem({
  compraId,
  cats,
  onAdicionado,
}: {
  compraId: string
  cats: Categoria[]
  onAdicionado: () => void
}) {
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState('1')
  const [preco, setPreco] = useState('')
  const [cat, setCat] = useState('')
  const campoNome = useRef<HTMLInputElement>(null)

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    const ok = await exec(
      supabase.from('itens').insert({
        compra_id: compraId,
        nome: nome.trim(),
        categoria_id: cat || null,
        quantidade: num(qtd) || 1,
        preco: num(preco),
      }),
    )
    if (ok) {
      setNome('')
      setQtd('1')
      setPreco('')
      onAdicionado()
      campoNome.current?.focus()
    }
  }

  return (
    <form onSubmit={adicionar} className="card space-y-3 p-4">
      <input
        ref={campoNome}
        className="input"
        placeholder="Adicionar item (ex.: Arroz 5kg)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <div className="grid grid-cols-[5rem_1fr_1fr] gap-2">
        <div>
          <label className="label">Qtd</label>
          <input
            className="input px-3"
            inputMode="decimal"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Preço un. (R$)</label>
          <input
            className="input px-3"
            inputMode="decimal"
            placeholder="0,00"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input px-3" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">—</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className="btn-soft w-full" disabled={!nome.trim()}>
        + Adicionar à lista
      </button>
    </form>
  )
}

function LinhaItem({
  item,
  cats,
  autor,
  onMudou,
}: {
  item: Item
  cats: Categoria[]
  autor?: Perfil
  onMudou: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(item.nome)
  const [qtd, setQtd] = useState(txt(item.quantidade))
  const [preco, setPreco] = useState(item.preco ? txt(item.preco) : '')
  const [cat, setCat] = useState(item.categoria_id ?? '')

  async function alternar() {
    const ok = await exec(
      supabase.from('itens').update({ no_carrinho: !item.no_carrinho }).eq('id', item.id),
    )
    if (ok) onMudou()
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const ok = await exec(
      supabase
        .from('itens')
        .update({
          nome: nome.trim() || item.nome,
          quantidade: num(qtd) || 1,
          preco: num(preco),
          categoria_id: cat || null,
        })
        .eq('id', item.id),
    )
    if (ok) {
      setEditando(false)
      onMudou()
    }
  }

  async function remover() {
    if (await exec(supabase.from('itens').delete().eq('id', item.id))) onMudou()
  }

  if (editando) {
    return (
      <li className="space-y-3 bg-brand-50/40 p-4">
        <form onSubmit={salvar} className="space-y-3">
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
          <div className="grid grid-cols-[5rem_1fr_1fr] gap-2">
            <input
              className="input px-3"
              inputMode="decimal"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              aria-label="Quantidade"
            />
            <input
              className="input px-3"
              inputMode="decimal"
              placeholder="Preço un."
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              aria-label="Preço unitário"
            />
            <select className="input px-3" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Sem categoria</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 py-2">
              Salvar
            </button>
            <button type="button" className="btn-ghost py-2" onClick={() => setEditando(false)}>
              Cancelar
            </button>
            <button type="button" className="btn bg-rose-50 py-2 text-rose-600" onClick={remover}>
              Apagar
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        onClick={() => void alternar()}
        aria-label={item.no_carrinho ? 'Tirar do carrinho' : 'Colocar no carrinho'}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
          item.no_carrinho
            ? 'border-teal-500 bg-teal-500 text-white'
            : 'border-brand-200 text-transparent'
        }`}
      >
        ✓
      </button>
      <button onClick={() => setEditando(true)} className="min-w-0 flex-1 text-left">
        <p className={`truncate font-medium ${item.no_carrinho ? 'text-brand-500 line-through' : ''}`}>
          {item.nome}
        </p>
        <p className="text-xs text-brand-500">
          {txt(item.quantidade)} × {brl(item.preco)}
        </p>
      </button>
      <p className="shrink-0 font-semibold">{brl(totalLinha(item))}</p>
      <Avatar perfil={autor} tamanho={26} />
    </li>
  )
}

function PagamentosCompra({
  compraId,
  total,
  pags,
  formas,
  onMudou,
}: {
  compraId: string
  total: number
  pags: Pagamento[]
  formas: Forma[]
  onMudou: () => void
}) {
  const [forma, setForma] = useState('')
  const [valor, setValor] = useState('')

  const formaSel = forma || formas[0]?.id || ''
  const pago = arredonda(pags.reduce((s, p) => s + p.valor, 0))
  const diff = arredonda(total - pago)
  const nomeForma = (fid: string | null) => formas.find((f) => f.id === fid)?.nome ?? 'Outra forma'

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    const v = num(valor)
    if (v <= 0) return
    const ok = await exec(
      supabase.from('pagamentos').insert({
        compra_id: compraId,
        forma_id: formaSel || null,
        valor: v,
      }),
    )
    if (ok) {
      setValor('')
      onMudou()
    }
  }

  async function remover(pid: string) {
    if (await exec(supabase.from('pagamentos').delete().eq('id', pid))) onMudou()
  }

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-brand-600">Pagamento</h2>
        <p className="text-sm text-brand-500">Total {brl(total)}</p>
      </div>

      {pags.length > 0 && (
        <ul className="divide-y divide-brand-50">
          {pags.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{nomeForma(p.forma_id)}</span>
              <span className="flex items-center gap-3">
                <strong>{brl(p.valor)}</strong>
                <button
                  onClick={() => void remover(p.id)}
                  className="text-brand-500/60"
                  aria-label="Remover pagamento"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p
        className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
          pago === 0
            ? 'bg-brand-50 text-brand-500'
            : diff === 0
              ? 'bg-teal-100 text-brand-600'
              : diff > 0
                ? 'bg-amber-50 text-amber-800'
                : 'bg-rose-50 text-rose-700'
        }`}
      >
        {pago === 0
          ? 'Nenhum pagamento lançado ainda.'
          : diff === 0
            ? `✓ Tudo pago (${brl(pago)})`
            : diff > 0
              ? `Pago ${brl(pago)} · faltam ${brl(diff)}`
              : `Pago ${brl(pago)} · ${brl(-diff)} a mais que o total`}
      </p>

      <form onSubmit={adicionar} className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <select className="input px-3" value={formaSel} onChange={(e) => setForma(e.target.value)}>
          {formas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
        <input
          className="input px-3"
          inputMode="decimal"
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <button type="submit" className="btn-soft px-4" aria-label="Adicionar pagamento">
          +
        </button>
      </form>
      {diff > 0 && (
        <button type="button" className="text-sm font-semibold text-teal-600" onClick={() => setValor(txt(diff))}>
          Usar o que falta ({brl(diff)})
        </button>
      )}
    </section>
  )
}
