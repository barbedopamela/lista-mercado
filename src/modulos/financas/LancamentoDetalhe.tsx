import { useEffect, useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, supabase } from '../../lib/supabase'
import { usePerfis } from '../../lib/contexto'
import { brl, num, txt } from '../../lib/format'
import { apagarAnexosDe } from '../../lib/anexos-api'
import type { CategoriaFinanca, Lancamento } from '../../lib/types'
import Anexos from '../../components/Anexos'
import SeletorConta from '../../components/SeletorConta'

export default function LancamentoDetalhe({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const { perfis } = usePerfis()
  const { dados, carregando, recarregar } = useTabela<Lancamento>('lancamentos', { coluna: 'id', valor: id })
  const { dados: cats } = useTabela<CategoriaFinanca>('categorias_financas', { ordem: 'ordem' })
  const l = dados[0]

  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('')
  const [conta, setConta] = useState('')
  const [carregou, setCarregou] = useState(false)
  const [salvou, setSalvou] = useState(false)

  useEffect(() => {
    if (l && !carregou) {
      setValor(txt(l.valor))
      setData(l.data)
      setDesc(l.descricao)
      setCat(l.categoria_id ?? '')
      setConta(l.conta_pessoal_de ?? '')
      setCarregou(true)
    }
  }, [l, carregou])

  if (!l) {
    return carregando ? (
      <p className="py-10 text-center text-brand-500">Carregando…</p>
    ) : (
      <div className="space-y-4 py-10 text-center">
        <p className="text-brand-500">Este lançamento não existe mais.</p>
        <button className="btn-primary" onClick={onVoltar}>
          Voltar
        </button>
      </div>
    )
  }

  const entrada = l.tipo === 'entrada'

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const ok = await exec(
      supabase
        .from('lancamentos')
        .update({
          valor: num(valor),
          data: data || l.data,
          descricao: desc.trim(),
          categoria_id: cat || null,
          conta_pessoal_de: conta || null,
        })
        .eq('id', l.id),
    )
    if (ok) {
      setSalvou(true)
      setTimeout(() => setSalvou(false), 1800)
      void recarregar()
    }
  }

  async function excluir() {
    if (!window.confirm('Excluir este lançamento e os anexos dele?')) return
    await apagarAnexosDe([l.id])
    if (await exec(supabase.from('lancamentos').delete().eq('id', l.id))) onVoltar()
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
          <h1 className="truncate text-2xl font-bold text-brand-600">{l.descricao || (entrada ? 'Entrada' : 'Saída')}</h1>
          <p className="text-sm text-brand-500">
            {entrada ? 'Entrada' : 'Saída'} · {brl(l.valor)}
          </p>
        </div>
      </header>

      <form onSubmit={salvar} className="card space-y-3 p-4">
        <div>
          <label className="label">Descrição</label>
          <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$)</label>
            <input className="input px-3" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <label className="label">Data</label>
            <input type="date" className="input px-3" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input px-3" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">—</option>
            {cats
              .filter((k) => (k.tipo ?? 'saida') === l.tipo)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.emoji} {k.nome}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="label">{entrada ? 'Entra em qual conta' : 'Sai de qual conta'}</label>
          <SeletorConta perfis={perfis} valor={conta} onChange={setConta} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={num(valor) <= 0}>
          {salvou ? '✓ Salvo' : 'Salvar alterações'}
        </button>
      </form>

      <Anexos origem="lancamento" origemId={l.id} />

      <button onClick={() => void excluir()} className="btn w-full bg-rose-50 text-rose-600">
        Excluir lançamento
      </button>
    </div>
  )
}
