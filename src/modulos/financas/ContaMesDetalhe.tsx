import { useEffect, useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, meuId, supabase } from '../../lib/supabase'
import { usePerfis } from '../../lib/contexto'
import { brl, hoje, num, txt } from '../../lib/format'
import { apagarAnexosDe } from '../../lib/anexos-api'
import type { CategoriaFinanca, ContaMes } from '../../lib/types'
import Anexos from '../../components/Anexos'
import SeletorConta from '../../components/SeletorConta'

export default function ContaMesDetalhe({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const { perfis } = usePerfis()
  const { dados, carregando, recarregar } = useTabela<ContaMes>('contas_mes', {
    coluna: 'id',
    valor: id,
  })
  const { dados: cats } = useTabela<CategoriaFinanca>('categorias_financas', { ordem: 'ordem' })
  const c = dados[0]

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [venc, setVenc] = useState('')
  const [cat, setCat] = useState('')
  const [conta, setConta] = useState('')
  const [pagoEm, setPagoEm] = useState('')
  const [carregou, setCarregou] = useState(false)
  const [salvou, setSalvou] = useState(false)

  useEffect(() => {
    if (c && !carregou) {
      setNome(c.nome)
      setValor(txt(c.valor))
      setVenc(c.vencimento)
      setCat(c.categoria_id ?? '')
      setConta(c.conta_pessoal_de ?? '')
      setPagoEm(c.pago_em ?? '')
      setCarregou(true)
    }
  }, [c, carregou])

  if (!c) {
    return carregando ? (
      <p className="py-10 text-center text-brand-500">Carregando…</p>
    ) : (
      <div className="space-y-4 py-10 text-center">
        <p className="text-brand-500">Esta conta não existe mais.</p>
        <button className="btn-primary" onClick={onVoltar}>
          Voltar
        </button>
      </div>
    )
  }

  const avulsa = c.conta_id === null
  const quemPagou = perfis.find((p) => p.id === c.pago_por)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const novoValor = num(valor)
    const mudouValorOuData = novoValor !== Number(c.valor) || venc !== c.vencimento
    const ok = await exec(
      supabase
        .from('contas_mes')
        .update({
          nome: nome.trim() || c.nome,
          valor: novoValor,
          vencimento: venc || c.vencimento,
          categoria_id: cat || null,
          conta_pessoal_de: conta || null,
          pago_em: c.paga ? pagoEm || hoje() : null,
          // se mudou só neste mês, as próximas edições da conta fixa não passam por cima
          ajustada: c.ajustada || (!avulsa && mudouValorOuData),
        })
        .eq('id', c.id),
    )
    if (ok) {
      setSalvou(true)
      setTimeout(() => setSalvou(false), 1800)
      void recarregar()
    }
  }

  async function alternarPaga() {
    const paga = !c.paga
    const autor = paga ? await meuId() : null
    const data = paga ? pagoEm || hoje() : null
    const ok = await exec(
      supabase.from('contas_mes').update({ paga, pago_em: data, pago_por: autor }).eq('id', c.id),
    )
    if (ok) {
      setPagoEm(data ?? '')
      void recarregar()
    }
  }

  async function alternarPulada() {
    if (!c.pulada && !window.confirm('Pular esta conta só neste mês? Ela deixa de contar nos totais.')) return
    if (await exec(supabase.from('contas_mes').update({ pulada: !c.pulada }).eq('id', c.id))) void recarregar()
  }

  async function excluir() {
    if (!window.confirm('Excluir esta conta e os comprovantes dela?')) return
    await apagarAnexosDe([c.id])
    if (await exec(supabase.from('contas_mes').delete().eq('id', c.id))) onVoltar()
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
          <h1 className="truncate text-2xl font-bold text-brand-600">{c.nome}</h1>
          <p className="text-sm text-brand-500">
            {c.pulada
              ? 'Pulada neste mês'
              : c.paga
                ? `Paga${quemPagou ? ` por ${quemPagou.nome.split(' ')[0]}` : ''} · ${brl(c.valor)}`
                : `A pagar · ${brl(c.valor)}`}
            {c.parcela_total ? ` · parcela ${c.parcela_n}/${c.parcela_total}` : ''}
          </p>
        </div>
      </header>

      {!c.pulada && (
        <button onClick={() => void alternarPaga()} className={c.paga ? 'btn-soft w-full' : 'btn-primary w-full'}>
          {c.paga ? 'Desmarcar como paga' : '✓ Marcar como paga'}
        </button>
      )}

      <form onSubmit={salvar} className="card space-y-3 p-4">
        <div>
          <label className="label">Nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor deste mês (R$)</label>
            <input className="input px-3" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <label className="label">Vencimento</label>
            <input type="date" className="input px-3" value={venc} onChange={(e) => setVenc(e.target.value)} />
          </div>
        </div>
        {!avulsa && (
          <p className="text-xs text-brand-500">
            Mudar o valor ou a data aqui vale só para este mês. Para mudar de agora em diante, edite
            na aba “Contas”.
          </p>
        )}
        {c.paga && (
          <div>
            <label className="label">Pago em</label>
            <input type="date" className="input px-3" value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
          </div>
        )}
        <div>
          <label className="label">Categoria</label>
          <select className="input px-3" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">—</option>
            {cats.map((k) => (
              <option key={k.id} value={k.id}>
                {k.emoji} {k.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sai de qual conta</label>
          <SeletorConta perfis={perfis} valor={conta} onChange={setConta} />
        </div>
        <button type="submit" className="btn-primary w-full">
          {salvou ? '✓ Salvo' : 'Salvar alterações'}
        </button>
      </form>

      <Anexos origem="conta" origemId={c.id} />

      {avulsa ? (
        <button onClick={() => void excluir()} className="btn w-full bg-rose-50 text-rose-600">
          Excluir conta
        </button>
      ) : (
        <button onClick={() => void alternarPulada()} className="btn w-full bg-brand-50 text-brand-600">
          {c.pulada ? 'Voltar a contar neste mês' : 'Pular só neste mês'}
        </button>
      )}
    </div>
  )
}
