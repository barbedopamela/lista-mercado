import { useMemo, useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, meuId, supabase } from '../../lib/supabase'
import { usePerfis } from '../../lib/contexto'
import { dataCurta, hoje } from '../../lib/format'
import type { Anexo, CategoriaResolver, Pendencia } from '../../lib/types'
import SeletorResponsavel, {
  FotosResponsavel,
  quemParaBanco,
  type QuemValor,
} from '../../components/Responsavel'
import PendenciaDetalhe from './PendenciaDetalhe'

type Aba = 'pendentes' | 'feitas'
type Filtro = 'todas' | 'minhas' | 'outro'

export default function Resolver() {
  const { eu, perfis } = usePerfis()
  const { dados: pendencias, recarregar } = useTabela<Pendencia>('pendencias', {
    ordem: 'created_at',
    asc: false,
  })
  const { dados: cats } = useTabela<CategoriaResolver>('categorias_resolver', { ordem: 'ordem' })
  const { dados: anexos } = useTabela<Anexo>('anexos')

  const [aba, setAba] = useState<Aba>('pendentes')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [aberta, setAberta] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [cat, setCat] = useState('')
  const [prazo, setPrazo] = useState('')
  const [quem, setQuem] = useState<QuemValor>('')

  const outro = perfis.find((p) => p.id !== eu?.id)
  const quemEfetivo: QuemValor = quem || eu?.id || 'ambos'

  const anexosPor = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of anexos) if (a.origem === 'pendencia') m.set(a.origem_id, (m.get(a.origem_id) ?? 0) + 1)
    return m
  }, [anexos])

  const visiveis = useMemo(() => {
    const dePessoa = (p: Pendencia, id?: string) => !!id && (p.para_ambos || p.responsavel_id === id)
    let lista = pendencias.filter((p) => (aba === 'pendentes' ? p.status === 'pendente' : p.status === 'feita'))
    if (filtro === 'minhas') lista = lista.filter((p) => dePessoa(p, eu?.id))
    if (filtro === 'outro') lista = lista.filter((p) => dePessoa(p, outro?.id))
    if (aba === 'pendentes') {
      // com prazo primeiro (mais próximo no topo), depois as sem prazo
      return [...lista].sort((a, b) => {
        if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo)
        if (a.prazo) return -1
        if (b.prazo) return 1
        return b.created_at.localeCompare(a.created_at)
      })
    }
    return [...lista].sort((a, b) => (b.concluida_em ?? '').localeCompare(a.concluida_em ?? ''))
  }, [pendencias, aba, filtro, eu?.id, outro?.id])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    const autor = await meuId()
    const { data, error } = await supabase
      .from('pendencias')
      .insert({
        titulo: titulo.trim(),
        categoria_id: cat || null,
        prazo: prazo || null,
        ...quemParaBanco(quemEfetivo),
        criado_por: autor,
      })
      .select('id')
      .single()
    if (error) {
      alert('Ops, algo deu errado: ' + error.message)
      return
    }
    setTitulo('')
    setCat('')
    setPrazo('')
    setQuem('')
    setCriando(false)
    void recarregar()
    // abre direto o detalhe para já poder anexar um comprovante
    setAberta(data.id as string)
  }

  async function alternar(p: Pendencia) {
    const feita = p.status === 'pendente'
    const autor = await meuId()
    const ok = await exec(
      supabase
        .from('pendencias')
        .update({
          status: feita ? 'feita' : 'pendente',
          concluida_em: feita ? new Date().toISOString() : null,
          concluida_por: feita ? autor : null,
        })
        .eq('id', p.id),
    )
    if (ok) void recarregar()
  }

  if (aberta) {
    return <PendenciaDetalhe id={aberta} onVoltar={() => setAberta(null)} />
  }

  const hojeStr = hoje()
  const catPor = (id: string | null) => cats.find((c) => c.id === id)

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-brand-500">Pendências da casa</p>
          <h1 className="text-2xl font-bold text-brand-600">A resolver</h1>
        </div>
        <button className="btn-primary" onClick={() => setCriando((v) => !v)}>
          {criando ? 'Cancelar' : '+ Nova'}
        </button>
      </header>

      {criando && (
        <form onSubmit={criar} className="card space-y-3 p-4">
          <div>
            <label className="label">O que precisa ser resolvido?</label>
            <input
              className="input"
              placeholder="Ex.: Renovar o seguro do carro"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="label">Prazo (opcional)</label>
              <input type="date" className="input px-3" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Quem resolve</label>
            <SeletorResponsavel perfis={perfis} valor={quemEfetivo} onChange={setQuem} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={!titulo.trim()}>
            Criar e abrir
          </button>
        </form>
      )}

      <div className="flex gap-2 rounded-full bg-brand-50 p-1">
        {(
          [
            ['pendentes', 'Pendentes'],
            ['feitas', 'Feitas'],
          ] as [Aba, string][]
        ).map(([chave, nome]) => (
          <button
            key={chave}
            onClick={() => setAba(chave)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              aba === chave ? 'bg-white text-brand-600 shadow-soft' : 'text-brand-500'
            }`}
          >
            {nome}
          </button>
        ))}
      </div>

      {outro && (
        <div className="flex gap-2">
          {(
            [
              ['todas', 'Todas'],
              ['minhas', 'Minhas'],
              ['outro', outro.nome.split(' ')[0]],
            ] as [Filtro, string][]
          ).map(([chave, nome]) => (
            <button
              key={chave}
              onClick={() => setFiltro(chave)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                filtro === chave
                  ? 'border-teal-500 bg-teal-100 text-brand-600'
                  : 'border-brand-100 text-brand-500'
              }`}
            >
              {nome}
            </button>
          ))}
        </div>
      )}

      {visiveis.length === 0 && (
        <div className="card p-8 text-center text-brand-500">
          {aba === 'pendentes'
            ? 'Nada pendente por aqui. 🎉 Toque em “+ Nova” para anotar algo.'
            : 'Ainda não há itens concluídos.'}
        </div>
      )}

      <ul className="space-y-3">
        {visiveis.map((p) => {
          const c = catPor(p.categoria_id)
          const atrasada = p.status === 'pendente' && !!p.prazo && p.prazo < hojeStr
          const eHoje = p.status === 'pendente' && p.prazo === hojeStr
          const nAnexos = anexosPor.get(p.id) ?? 0
          return (
            <li key={p.id} className="card flex items-center gap-3 p-3">
              <button
                onClick={() => void alternar(p)}
                aria-label={p.status === 'feita' ? 'Reabrir' : 'Marcar como feita'}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                  p.status === 'feita'
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-brand-200 text-transparent'
                }`}
              >
                ✓
              </button>
              <button onClick={() => setAberta(p.id)} className="min-w-0 flex-1 text-left">
                <p className={`truncate font-semibold ${p.status === 'feita' ? 'text-brand-500 line-through' : ''}`}>
                  {p.titulo}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-brand-500">
                  {c && (
                    <span>
                      {c.emoji} {c.nome}
                    </span>
                  )}
                  {p.prazo && (
                    <span className={atrasada ? 'font-semibold text-rose-600' : eHoje ? 'font-semibold text-amber-700' : ''}>
                      {atrasada ? 'Atrasada · ' : eHoje ? 'Hoje · ' : ''}
                      {dataCurta(p.prazo)}
                    </span>
                  )}
                  {nAnexos > 0 && <span>📎 {nAnexos}</span>}
                </p>
              </button>
              <FotosResponsavel perfis={perfis} pendencia={p} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
