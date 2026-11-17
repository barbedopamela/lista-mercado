import { useState } from 'react'
import { useTabela } from '../hooks/useTabela'
import { exec, supabase } from '../lib/supabase'
import { usePerfis } from '../lib/contexto'
import type { Categoria, CategoriaResolver, Forma } from '../lib/types'

type TabelaEditavel = 'categorias' | 'formas_pagamento' | 'categorias_resolver'
import Avatar from '../components/Avatar'

export default function Ajustes() {
  const { eu } = usePerfis()
  const { dados: cats, recarregar: recCats } = useTabela<Categoria>('categorias', { ordem: 'ordem' })
  const { dados: formas, recarregar: recFormas } = useTabela<Forma>('formas_pagamento', {
    ordem: 'ordem',
  })
  const { dados: catsResolver, recarregar: recCatsResolver } = useTabela<CategoriaResolver>(
    'categorias_resolver',
    { ordem: 'ordem' },
  )

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-brand-500">Perfil e listas</p>
        <h1 className="text-2xl font-bold text-brand-600">Ajustes</h1>
      </header>

      <section className="card flex items-center gap-4 p-4">
        <Avatar perfil={eu} tamanho={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{eu?.nome ?? '…'}</p>
          <p className="truncate text-sm text-brand-500">{eu?.email}</p>
        </div>
        <button className="btn-ghost px-3 py-2" onClick={() => void supabase.auth.signOut()}>
          Sair
        </button>
      </section>

      <EditorLista
        titulo="Categorias do mercado"
        tabela="categorias"
        itens={cats}
        comEmoji
        onMudou={() => void recCats()}
      />
      <EditorLista
        titulo="Categorias de “A resolver”"
        tabela="categorias_resolver"
        itens={catsResolver}
        comEmoji
        onMudou={() => void recCatsResolver()}
      />
      <EditorLista
        titulo="Formas de pagamento"
        tabela="formas_pagamento"
        itens={formas}
        onMudou={() => void recFormas()}
      />
    </div>
  )
}

type ItemLista = { id: string; nome: string; emoji?: string | null; ordem: number }

function EditorLista({
  titulo,
  tabela,
  itens,
  comEmoji,
  onMudou,
}: {
  titulo: string
  tabela: TabelaEditavel
  itens: ItemLista[]
  comEmoji?: boolean
  onMudou: () => void
}) {
  const [nome, setNome] = useState('')
  const [emoji, setEmoji] = useState('')

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    const proxima = Math.max(0, ...itens.map((i) => i.ordem)) + 1
    const dados: Record<string, unknown> = { nome: nome.trim(), ordem: proxima }
    if (comEmoji) dados.emoji = emoji.trim() || '🛒'
    if (await exec(supabase.from(tabela).insert(dados))) {
      setNome('')
      setEmoji('')
      onMudou()
    }
  }

  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-lg font-semibold text-brand-600">{titulo}</h2>
      <ul className="space-y-2">
        {itens.map((i) => (
          <LinhaEditavel key={i.id} item={i} tabela={tabela} comEmoji={comEmoji} onMudou={onMudou} />
        ))}
      </ul>
      <form onSubmit={adicionar} className="flex gap-2">
        {comEmoji && (
          <input
            className="input w-16 px-2 text-center"
            placeholder="🛒"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            aria-label="Emoji"
          />
        )}
        <input
          className="input"
          placeholder="Novo nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <button type="submit" className="btn-soft px-4" aria-label="Adicionar">
          +
        </button>
      </form>
    </section>
  )
}

function LinhaEditavel({
  item,
  tabela,
  comEmoji,
  onMudou,
}: {
  item: ItemLista
  tabela: TabelaEditavel
  comEmoji?: boolean
  onMudou: () => void
}) {
  const [nome, setNome] = useState(item.nome)
  const [emoji, setEmoji] = useState(item.emoji ?? '')

  // salva ao sair do campo, só se algo mudou
  async function salvar() {
    const novoNome = nome.trim() || item.nome
    const novoEmoji = emoji.trim() || '🛒'
    if (novoNome === item.nome && (!comEmoji || novoEmoji === (item.emoji ?? '🛒'))) return
    const dados: Record<string, unknown> = { nome: novoNome }
    if (comEmoji) dados.emoji = novoEmoji
    if (await exec(supabase.from(tabela).update(dados).eq('id', item.id))) onMudou()
  }

  async function remover() {
    const ok = window.confirm(
      `Apagar “${item.nome}”? Os itens e pagamentos que usam esta opção continuam existindo, só ficam sem ${
        comEmoji ? 'categoria' : 'forma de pagamento'
      }.`,
    )
    if (ok && (await exec(supabase.from(tabela).delete().eq('id', item.id)))) onMudou()
  }

  return (
    <li className="flex items-center gap-2">
      {comEmoji && (
        <input
          className="input w-16 px-2 text-center"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          onBlur={() => void salvar()}
          aria-label="Emoji"
        />
      )}
      <input
        className="input"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => void salvar()}
      />
      <button
        onClick={() => void remover()}
        className="shrink-0 px-2 text-brand-500/60"
        aria-label={`Apagar ${item.nome}`}
      >
        ✕
      </button>
    </li>
  )
}
