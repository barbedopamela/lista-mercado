import { useEffect, useMemo, useRef, useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, meuId, supabase } from '../../lib/supabase'
import { usePerfis } from '../../lib/contexto'
import { brl, dataCurta, hoje, mesAtual, mudarMes, nomeMes, num } from '../../lib/format'
import type { Anexo, CategoriaFinanca, ContaFixa, ContaMes } from '../../lib/types'
import Barra from '../../components/Barra'
import SeletorConta, { ChipConta } from '../../components/SeletorConta'
import { faltandoGerar, resumoMes, situacao } from './contas'

export default function MesContas({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { perfis } = usePerfis()
  const { dados: fixas, carregando: carregandoFixas } = useTabela<ContaFixa>('contas_fixas', {
    ordem: 'created_at',
  })
  const {
    dados: todas,
    carregando: carregandoMeses,
    recarregar: recarregarMeses,
  } = useTabela<ContaMes>('contas_mes')
  const { dados: cats } = useTabela<CategoriaFinanca>('categorias_financas', { ordem: 'ordem' })
  const { dados: anexos } = useTabela<Anexo>('anexos')

  const [ym, setYm] = useState(mesAtual())
  const [criando, setCriando] = useState(false)

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [venc, setVenc] = useState('')
  const [cat, setCat] = useState('')
  const [conta, setConta] = useState('')

  // Ao abrir um mês, cria a linha de cada conta fixa que ainda não existe nele.
  // (O par conta+mês é único no banco, então abrir ao mesmo tempo não duplica.)
  const ultimaGeracao = useRef('')
  useEffect(() => {
    if (carregandoFixas || carregandoMeses) return
    const doMes = todas.filter((c) => c.mes.startsWith(ym))
    const falta = faltandoGerar(fixas, doMes, ym)
    if (falta.length === 0) return
    const chave = `${ym}|${falta.map((f) => f.conta_id).sort().join(',')}`
    if (ultimaGeracao.current === chave) return
    ultimaGeracao.current = chave
    void supabase
      .from('contas_mes')
      .upsert(falta, { onConflict: 'conta_id,mes', ignoreDuplicates: true })
      .then(({ error }) => {
        if (error) {
          ultimaGeracao.current = ''
          alert('Não foi possível criar as contas do mês: ' + error.message)
        } else {
          void recarregarMeses()
        }
      })
  }, [ym, fixas, todas, carregandoFixas, carregandoMeses, recarregarMeses])

  const doMes = useMemo(
    () =>
      todas
        .filter((c) => c.mes.startsWith(ym))
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.nome.localeCompare(b.nome)),
    [todas, ym],
  )
  const ativas = doMes.filter((c) => !c.pulada)
  const puladas = doMes.filter((c) => c.pulada)
  const resumo = resumoMes(doMes)
  const hojeStr = hoje()

  const anexosPor = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of anexos) if (a.origem === 'conta') m.set(a.origem_id, (m.get(a.origem_id) ?? 0) + 1)
    return m
  }, [anexos])

  async function alternarPaga(c: ContaMes) {
    const paga = !c.paga
    const autor = paga ? await meuId() : null
    const ok = await exec(
      supabase
        .from('contas_mes')
        .update({ paga, pago_em: paga ? hoje() : null, pago_por: autor })
        .eq('id', c.id),
    )
    if (ok) void recarregarMeses()
  }

  function abrirForm() {
    setNome('')
    setValor('')
    setCat('')
    setConta('')
    setVenc(hoje().startsWith(ym) ? hoje() : `${ym}-01`)
    setCriando((v) => !v)
  }

  async function criarAvulsa(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !venc) return
    const autor = await meuId()
    const mes = venc.slice(0, 7)
    const ok = await exec(
      supabase.from('contas_mes').insert({
        conta_id: null,
        mes: `${mes}-01`,
        nome: nome.trim(),
        valor: num(valor),
        vencimento: venc,
        categoria_id: cat || null,
        conta_pessoal_de: conta || null,
        criado_por: autor,
      }),
    )
    if (ok) {
      setCriando(false)
      setYm(mes)
      void recarregarMeses()
    }
  }

  const catPor = (id: string | null) => cats.find((c) => c.id === id)

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-brand-500">Contas da casa</p>
          <h1 className="text-2xl font-bold text-brand-600">Mês</h1>
        </div>
        <button className="btn-primary" onClick={abrirForm}>
          {criando ? 'Cancelar' : '+ Avulsa'}
        </button>
      </header>

      {criando && (
        <form onSubmit={criarAvulsa} className="card space-y-3 p-4">
          <p className="text-xs text-brand-500">
            Conta avulsa vale só para este lançamento (ex.: um conserto). Para contas que se repetem,
            use a aba “Contas”.
          </p>
          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              placeholder="Ex.: Conserto da geladeira"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                className="input px-3"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Vencimento</label>
              <input type="date" className="input px-3" value={venc} onChange={(e) => setVenc(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input px-3" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">—</option>
              {cats.filter((c) => (c.tipo ?? 'saida') === 'saida').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Sai de qual conta</label>
            <SeletorConta perfis={perfis} valor={conta} onChange={setConta} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={!nome.trim() || !venc}>
            Adicionar
          </button>
        </form>
      )}

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
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Total</p>
            <p className="text-base font-bold">{brl(resumo.total)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Pago</p>
            <p className="text-base font-bold text-teal-600">{brl(resumo.pago)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Falta</p>
            <p className="text-lg font-bold text-brand-600">{brl(resumo.falta)}</p>
          </div>
        </div>
        <Barra valor={resumo.pago} limite={resumo.total} />
        {resumo.conjuntaTotal > 0 && (
          <p className="text-sm text-brand-500">
            🏦 Na conta conjunta: <strong>{brl(resumo.conjuntaTotal)}</strong>
            {resumo.conjuntaFalta > 0 && <> · ainda faltam {brl(resumo.conjuntaFalta)}</>}
          </p>
        )}
      </section>

      {ativas.length === 0 && puladas.length === 0 && (
        <div className="card space-y-2 p-8 text-center text-brand-500">
          <p>Nenhuma conta neste mês.</p>
          <p className="text-sm">
            Cadastre as contas que se repetem na aba <strong>Contas</strong>, ou toque em “+ Avulsa”.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {ativas.map((c) => {
          const sit = situacao(c, hojeStr)
          const k = catPor(c.categoria_id)
          const nAnexos = anexosPor.get(c.id) ?? 0
          return (
            <li key={c.id} className="card flex items-center gap-3 p-3">
              <button
                onClick={() => void alternarPaga(c)}
                aria-label={c.paga ? 'Desmarcar como paga' : 'Marcar como paga'}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                  c.paga ? 'border-teal-500 bg-teal-500 text-white' : 'border-brand-200 text-transparent'
                }`}
              >
                ✓
              </button>
              <button onClick={() => onAbrir(c.id)} className="min-w-0 flex-1 text-left">
                <p className={`truncate font-semibold ${c.paga ? 'text-brand-500 line-through' : ''}`}>
                  {c.nome}
                  {c.parcela_total ? (
                    <span className="ml-2 text-xs font-medium text-brand-500">
                      {c.parcela_n}/{c.parcela_total}
                    </span>
                  ) : null}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-500">
                  <span
                    className={
                      sit === 'atrasada'
                        ? 'font-semibold text-rose-600'
                        : sit === 'hoje'
                          ? 'font-semibold text-amber-700'
                          : ''
                    }
                  >
                    {sit === 'atrasada' ? 'Atrasada · ' : sit === 'hoje' ? 'Hoje · ' : c.paga ? 'Paga · ' : 'Vence '}
                    {dataCurta(c.paga && c.pago_em ? c.pago_em : c.vencimento)}
                  </span>
                  {k && <span>{k.emoji}</span>}
                  <ChipConta perfis={perfis} contaDe={c.conta_pessoal_de} />
                  {nAnexos > 0 && <span>📎 {nAnexos}</span>}
                </p>
              </button>
              <p className="shrink-0 font-bold">{brl(c.valor)}</p>
            </li>
          )
        })}
      </ul>

      {puladas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-500">Puladas neste mês</h2>
          <ul className="space-y-2">
            {puladas.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onAbrir(c.id)}
                  className="card flex w-full items-center justify-between p-3 text-left opacity-60"
                >
                  <span className="truncate">{c.nome}</span>
                  <span className="text-sm line-through">{brl(c.valor)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
