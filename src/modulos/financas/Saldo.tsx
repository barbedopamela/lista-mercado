import { useMemo, useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, meuId, supabase } from '../../lib/supabase'
import { usePerfis } from '../../lib/contexto'
import { brl, dataCurta, hoje, mesAtual, mudarMes, nomeMes, num, txt } from '../../lib/format'
import type { Anexo, CategoriaFinanca, ContaMes, Lancamento, SaldoConjunta } from '../../lib/types'
import SeletorConta, { ChipConta } from '../../components/SeletorConta'
import { resumoDoMes, saldoAtual } from './saldo'

export type Alvo = { kind: 'conta' | 'lancamento'; id: string }

export default function Saldo({ onAbrir }: { onAbrir: (a: Alvo) => void }) {
  const { perfis } = usePerfis()
  const { dados: lancs, recarregar: recLancs } = useTabela<Lancamento>('lancamentos')
  const { dados: contas } = useTabela<ContaMes>('contas_mes')
  const { dados: bases, recarregar: recBase } = useTabela<SaldoConjunta>('saldo_conjunta')
  const { dados: cats } = useTabela<CategoriaFinanca>('categorias_financas', { ordem: 'ordem' })
  const { dados: anexos } = useTabela<Anexo>('anexos')

  const [ym, setYm] = useState(mesAtual())
  const [lancando, setLancando] = useState(false)
  const [informando, setInformando] = useState(false)

  // formulário de lançamento
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hoje())
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('')
  const [conta, setConta] = useState('')

  // formulário de saldo
  const [saldoTxt, setSaldoTxt] = useState('')
  const [saldoData, setSaldoData] = useState(hoje())

  const base = bases[0] ?? null
  const hojeStr = hoje()
  const saldo = saldoAtual(base, lancs, contas, hojeStr)
  const resumo = resumoDoMes(lancs, contas, ym)

  const catPor = (id: string | null) => cats.find((c) => c.id === id)
  const catsDoTipo = cats.filter((c) => (c.tipo ?? 'saida') === tipo)

  const anexosPor = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of anexos) if (a.origem === 'lancamento') m.set(a.origem_id, (m.get(a.origem_id) ?? 0) + 1)
    return m
  }, [anexos])

  // movimentos do mês: lançamentos (de qualquer conta) + contas conjuntas já pagas
  const movimentos = useMemo(() => {
    const l = lancs
      .filter((x) => x.data.startsWith(ym))
      .map((x) => ({ kind: 'lancamento' as const, id: x.id, data: x.data, l: x, c: null as ContaMes | null }))
    const c = contas
      .filter((x) => !x.pulada && x.paga && !x.conta_pessoal_de && x.pago_em?.startsWith(ym))
      .map((x) => ({ kind: 'conta' as const, id: x.id, data: x.pago_em as string, l: null as Lancamento | null, c: x }))
    return [...l, ...c].sort((a, b) => b.data.localeCompare(a.data))
  }, [lancs, contas, ym])

  function abrirForm() {
    setTipo('saida')
    setValor('')
    setDesc('')
    setCat('')
    setConta('')
    setData(hojeStr.startsWith(ym) ? hojeStr : `${ym}-01`)
    setLancando((v) => !v)
  }

  async function lancar(e: React.FormEvent) {
    e.preventDefault()
    const v = num(valor)
    if (v <= 0 || !data) return
    const ok = await exec(
      supabase.from('lancamentos').insert({
        tipo,
        valor: v,
        data,
        descricao: desc.trim(),
        categoria_id: cat || null,
        conta_pessoal_de: conta || null,
        criado_por: await meuId(),
      }),
    )
    if (ok) {
      setLancando(false)
      setYm(data.slice(0, 7))
      void recLancs()
    }
  }

  async function informarSaldo(e: React.FormEvent) {
    e.preventDefault()
    const ok = await exec(
      supabase.from('saldo_conjunta').upsert({
        id: 1,
        valor: num(saldoTxt),
        data: saldoData || hojeStr,
        atualizado_por: await meuId(),
        updated_at: new Date().toISOString(),
      }),
    )
    if (ok) {
      setInformando(false)
      void recBase()
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-brand-500">Conta conjunta</p>
          <h1 className="text-2xl font-bold text-brand-600">Saldo</h1>
        </div>
        <button className="btn-primary" onClick={abrirForm}>
          {lancando ? 'Cancelar' : '+ Lançar'}
        </button>
      </header>

      <section className="card space-y-3 p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">🏦 Saldo hoje</p>
        <p className={`text-3xl font-bold ${saldo < 0 ? 'text-rose-600' : 'text-brand-600'}`}>{brl(saldo)}</p>
        {base ? (
          <p className="text-xs text-brand-500">
            Partindo de {brl(base.valor)} em {dataCurta(base.data)}
          </p>
        ) : (
          <p className="text-xs text-brand-500">Informe quanto há na conta hoje para começar.</p>
        )}
        <button
          className="btn-soft px-4 py-2 text-sm"
          onClick={() => {
            setSaldoTxt(base ? txt(saldo) : '')
            setSaldoData(hojeStr)
            setInformando((v) => !v)
          }}
        >
          {informando ? 'Cancelar' : base ? 'Corrigir saldo' : 'Informar saldo'}
        </button>
        {informando && (
          <form onSubmit={informarSaldo} className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Saldo na conta (R$)</label>
                <input
                  className="input px-3"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={saldoTxt}
                  onChange={(e) => setSaldoTxt(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Em que dia</label>
                <input type="date" className="input px-3" value={saldoData} onChange={(e) => setSaldoData(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-brand-500">
              O app soma e subtrai só o que acontecer depois dessa data. Se o saldo do banco ficar
              diferente do app, use “Corrigir saldo” de novo.
            </p>
            <button type="submit" className="btn-primary w-full" disabled={!saldoTxt.trim()}>
              Salvar saldo
            </button>
          </form>
        )}
      </section>

      {lancando && (
        <form onSubmit={lancar} className="card space-y-3 p-4">
          <div className="flex gap-2 rounded-full bg-brand-50 p-1">
            {(
              [
                ['saida', 'Saída'],
                ['entrada', 'Entrada'],
              ] as const
            ).map(([k, nome]) => (
              <button
                type="button"
                key={k}
                onClick={() => {
                  setTipo(k)
                  setCat('')
                }}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                  tipo === k ? 'bg-white text-brand-600 shadow-soft' : 'text-brand-500'
                }`}
              >
                {nome}
              </button>
            ))}
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
                autoFocus
              />
            </div>
            <div>
              <label className="label">Data</label>
              <input type="date" className="input px-3" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <input
              className="input"
              placeholder={tipo === 'entrada' ? 'Ex.: Salário' : 'Ex.: Farmácia'}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input px-3" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">—</option>
              {catsDoTipo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{tipo === 'entrada' ? 'Entra em qual conta' : 'Sai de qual conta'}</label>
            <SeletorConta perfis={perfis} valor={conta} onChange={setConta} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={num(valor) <= 0 || !data}>
            Lançar
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

      <section className="card grid grid-cols-3 gap-2 p-4 text-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Entradas</p>
          <p className="text-base font-bold text-teal-600">{brl(resumo.entradas)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Saídas</p>
          <p className="text-base font-bold">{brl(resumo.saidas)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">Resultado</p>
          <p className={`text-base font-bold ${resumo.resultado < 0 ? 'text-rose-600' : 'text-brand-600'}`}>
            {brl(resumo.resultado)}
          </p>
        </div>
      </section>

      {movimentos.length === 0 && (
        <div className="card p-8 text-center text-brand-500">Nenhuma movimentação neste mês.</div>
      )}

      <ul className="space-y-3">
        {movimentos.map((m) => {
          if (m.kind === 'conta' && m.c) {
            const k = catPor(m.c.categoria_id)
            return (
              <li key={'c' + m.id}>
                <button onClick={() => onAbrir({ kind: 'conta', id: m.id })} className="card flex w-full items-center gap-3 p-3 text-left">
                  <span className="text-xl">{k?.emoji ?? '🧾'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{m.c.nome}</span>
                    <span className="text-xs text-brand-500">Conta paga · {dataCurta(m.data)}</span>
                  </span>
                  <span className="shrink-0 font-bold">−{brl(m.c.valor)}</span>
                </button>
              </li>
            )
          }
          const l = m.l as Lancamento
          const k = catPor(l.categoria_id)
          const pessoal = !!l.conta_pessoal_de
          const n = anexosPor.get(l.id) ?? 0
          return (
            <li key={'l' + m.id}>
              <button
                onClick={() => onAbrir({ kind: 'lancamento', id: l.id })}
                className={`card flex w-full items-center gap-3 p-3 text-left ${pessoal ? 'opacity-60' : ''}`}
              >
                <span className="text-xl">{k?.emoji ?? (l.tipo === 'entrada' ? '💰' : '🧾')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{l.descricao || k?.nome || (l.tipo === 'entrada' ? 'Entrada' : 'Saída')}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-500">
                    <span>{dataCurta(l.data)}</span>
                    {pessoal && <ChipConta perfis={perfis} contaDe={l.conta_pessoal_de} />}
                    {pessoal && <span>não entra no saldo</span>}
                    {n > 0 && <span>📎 {n}</span>}
                  </span>
                </span>
                <span className={`shrink-0 font-bold ${l.tipo === 'entrada' ? 'text-teal-600' : ''}`}>
                  {l.tipo === 'entrada' ? '+' : '−'}
                  {brl(l.valor)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
