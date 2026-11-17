import { useEffect, useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, meuId, supabase } from '../../lib/supabase'
import { usePerfis } from '../../lib/contexto'
import { dataCurta } from '../../lib/format'
import type { Anexo, CategoriaResolver, Pendencia } from '../../lib/types'
import Anexos from '../../components/Anexos'
import SeletorResponsavel, { quemDe, quemParaBanco, type QuemValor } from '../../components/Responsavel'

export default function PendenciaDetalhe({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const { perfis } = usePerfis()
  const { dados, carregando, recarregar } = useTabela<Pendencia>('pendencias', {
    coluna: 'id',
    valor: id,
  })
  const { dados: cats } = useTabela<CategoriaResolver>('categorias_resolver', { ordem: 'ordem' })
  const p = dados[0]

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cat, setCat] = useState('')
  const [prazo, setPrazo] = useState('')
  const [quem, setQuem] = useState<QuemValor>('ambos')
  const [carregou, setCarregou] = useState(false)
  const [salvou, setSalvou] = useState(false)

  // preenche o formulário uma vez, quando a pendência chega
  useEffect(() => {
    if (p && !carregou) {
      setTitulo(p.titulo)
      setDescricao(p.descricao ?? '')
      setCat(p.categoria_id ?? '')
      setPrazo(p.prazo ?? '')
      setQuem(quemDe(p))
      setCarregou(true)
    }
  }, [p, carregou])

  if (!p) {
    return carregando ? (
      <p className="py-10 text-center text-brand-500">Carregando…</p>
    ) : (
      <div className="space-y-4 py-10 text-center">
        <p className="text-brand-500">Este item não existe mais.</p>
        <button className="btn-primary" onClick={onVoltar}>
          Voltar
        </button>
      </div>
    )
  }

  const feita = p.status === 'feita'
  const quemConcluiu = perfis.find((x) => x.id === p.concluida_por)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const ok = await exec(
      supabase
        .from('pendencias')
        .update({
          titulo: titulo.trim() || p.titulo,
          descricao: descricao.trim() || null,
          categoria_id: cat || null,
          prazo: prazo || null,
          ...quemParaBanco(quem),
        })
        .eq('id', p.id),
    )
    if (ok) {
      setSalvou(true)
      setTimeout(() => setSalvou(false), 1800)
      void recarregar()
    }
  }

  async function alternar() {
    const autor = await meuId()
    const ok = await exec(
      supabase
        .from('pendencias')
        .update({
          status: feita ? 'pendente' : 'feita',
          concluida_em: feita ? null : new Date().toISOString(),
          concluida_por: feita ? null : autor,
        })
        .eq('id', p.id),
    )
    if (ok) void recarregar()
  }

  async function excluir() {
    if (!window.confirm('Excluir este item e todos os anexos dele?')) return
    // os arquivos ficam no Storage: apagamos eles antes do registro
    const { data: lista } = await supabase.from('anexos').select('*').eq('origem_id', p.id)
    const arquivos = ((lista ?? []) as Anexo[]).map((a) => a.caminho)
    if (arquivos.length > 0) await supabase.storage.from('anexos').remove(arquivos)
    await supabase.from('anexos').delete().eq('origem_id', p.id)
    if (await exec(supabase.from('pendencias').delete().eq('id', p.id))) onVoltar()
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
          <h1 className="truncate text-2xl font-bold text-brand-600">{p.titulo}</h1>
          <p className="text-sm text-brand-500">
            {feita
              ? `Feita${p.concluida_em ? ` em ${dataCurta(p.concluida_em.slice(0, 10))}` : ''}${
                  quemConcluiu ? ` por ${quemConcluiu.nome.split(' ')[0]}` : ''
                }`
              : 'Pendente'}
          </p>
        </div>
      </header>

      <button onClick={() => void alternar()} className={feita ? 'btn-soft w-full' : 'btn-primary w-full'}>
        {feita ? 'Reabrir' : '✓ Marcar como feita'}
      </button>

      <form onSubmit={salvar} className="card space-y-3 p-4">
        <div>
          <label className="label">Título</label>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea
            className="input min-h-24"
            placeholder="Detalhes, telefone, número do protocolo…"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
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
            <label className="label">Prazo</label>
            <input type="date" className="input px-3" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Quem resolve</label>
          <SeletorResponsavel perfis={perfis} valor={quem} onChange={setQuem} />
        </div>
        <button type="submit" className="btn-primary w-full">
          {salvou ? '✓ Salvo' : 'Salvar alterações'}
        </button>
      </form>

      <Anexos origem="pendencia" origemId={p.id} />

      <button onClick={() => void excluir()} className="btn w-full bg-rose-50 text-rose-600">
        Excluir item
      </button>
    </div>
  )
}
