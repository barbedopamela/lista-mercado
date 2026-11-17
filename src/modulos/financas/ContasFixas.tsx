import { useState } from 'react'
import { useTabela } from '../../hooks/useTabela'
import { exec, meuId, supabase } from '../../lib/supabase'
import { usePerfis } from '../../lib/contexto'
import { brl, mesAtual, num, txt } from '../../lib/format'
import type { CategoriaFinanca, ContaFixa } from '../../lib/types'
import SeletorConta, { ChipConta } from '../../components/SeletorConta'
import { excluirFixa, sincronizarFixa } from './api'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mesCurto = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`

export default function ContasFixas() {
  const { perfis } = usePerfis()
  const { dados: fixas, recarregar } = useTabela<ContaFixa>('contas_fixas', { ordem: 'created_at' })
  const { dados: cats } = useTabela<CategoriaFinanca>('categorias_financas', { ordem: 'ordem' })
  const [editando, setEditando] = useState<string | 'nova' | null>(null)

  const catPor = (id: string | null) => cats.find((c) => c.id === id)
  const ativas = fixas.filter((f) => f.ativa)
  const pausadas = fixas.filter((f) => !f.ativa)
  const totalFixo = ativas.reduce((s, f) => s + Number(f.valor), 0)

  async function alternarAtiva(f: ContaFixa) {
    const ok = await exec(supabase.from('contas_fixas').update({ ativa: !f.ativa }).eq('id', f.id))
    if (ok) {
      await sincronizarFixa({ ...f, ativa: !f.ativa })
      void recarregar()
    }
  }

  function linha(f: ContaFixa) {
    const k = catPor(f.categoria_id)
    if (editando === f.id) {
      return (
        <li key={f.id}>
          <FormConta
            inicial={f}
            cats={cats}
            onCancelar={() => setEditando(null)}
            onSalvo={() => {
              setEditando(null)
              void recarregar()
            }}
          />
        </li>
      )
    }
    return (
      <li key={f.id} className={`card flex items-center gap-3 p-3 ${f.ativa ? '' : 'opacity-60'}`}>
        <button onClick={() => setEditando(f.id)} className="min-w-0 flex-1 text-left">
          <p className="truncate font-semibold">{f.nome}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-500">
            <span>
              {f.parcelas
                ? `${f.parcelas}x · de ${mesCurto(f.primeiro_mes.slice(0, 7))}`
                : `Todo dia ${f.dia_vencimento}`}
              {f.parcelas ? ` · dia ${f.dia_vencimento}` : ''}
            </span>
            {k && (
              <span>
                {k.emoji} {k.nome}
              </span>
            )}
            <ChipConta perfis={perfis} contaDe={f.conta_pessoal_de} />
          </p>
        </button>
        <p className="shrink-0 font-bold">{brl(f.valor)}</p>
        <button
          onClick={() => void alternarAtiva(f)}
          className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600"
        >
          {f.ativa ? 'Pausar' : 'Ativar'}
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-brand-500">Se repetem todo mês</p>
          <h1 className="text-2xl font-bold text-brand-600">Contas</h1>
        </div>
        <button className="btn-primary" onClick={() => setEditando(editando === 'nova' ? null : 'nova')}>
          {editando === 'nova' ? 'Cancelar' : '+ Nova'}
        </button>
      </header>

      {editando === 'nova' && (
        <FormConta
          cats={cats}
          onCancelar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null)
            void recarregar()
          }}
        />
      )}

      {ativas.length > 0 && (
        <p className="text-sm text-brand-500">
          {ativas.length} {ativas.length === 1 ? 'conta ativa' : 'contas ativas'} · somam{' '}
          <strong>{brl(totalFixo)}</strong> por mês
        </p>
      )}

      {fixas.length === 0 && editando !== 'nova' && (
        <div className="card space-y-2 p-8 text-center text-brand-500">
          <p>Nenhuma conta cadastrada ainda.</p>
          <p className="text-sm">
            Cadastre aluguel, luz, internet, assinaturas… Elas aparecem sozinhas todo mês, no dia do
            vencimento.
          </p>
        </div>
      )}

      <ul className="space-y-3">{ativas.map(linha)}</ul>

      {pausadas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-500">Pausadas</h2>
          <ul className="space-y-3">{pausadas.map(linha)}</ul>
        </section>
      )}
    </div>
  )
}

function FormConta({
  inicial,
  cats,
  onSalvo,
  onCancelar,
}: {
  inicial?: ContaFixa
  cats: CategoriaFinanca[]
  onSalvo: () => void
  onCancelar: () => void
}) {
  const { perfis } = usePerfis()
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [valor, setValor] = useState(inicial ? txt(inicial.valor) : '')
  const [dia, setDia] = useState(inicial ? String(inicial.dia_vencimento) : '')
  const [cat, setCat] = useState(inicial?.categoria_id ?? '')
  const [conta, setConta] = useState(inicial?.conta_pessoal_de ?? '')
  const [parcelado, setParcelado] = useState(!!inicial?.parcelas)
  const [parcelas, setParcelas] = useState(inicial?.parcelas ? String(inicial.parcelas) : '')
  const [inicio, setInicio] = useState((inicial?.primeiro_mes ?? `${mesAtual()}-01`).slice(0, 7))
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    const dados = {
      nome: nome.trim(),
      valor: num(valor),
      dia_vencimento: Math.min(31, Math.max(1, parseInt(dia, 10) || 1)),
      categoria_id: cat || null,
      conta_pessoal_de: conta || null,
      parcelas: parcelado ? Math.max(1, parseInt(parcelas, 10) || 1) : null,
      primeiro_mes: `${inicio}-01`,
    }
    let ok: boolean
    if (inicial) {
      ok = await exec(supabase.from('contas_fixas').update(dados).eq('id', inicial.id))
      if (ok) await sincronizarFixa({ ...inicial, ...dados })
    } else {
      ok = await exec(supabase.from('contas_fixas').insert({ ...dados, criado_por: await meuId() }))
    }
    setSalvando(false)
    if (ok) onSalvo()
  }

  async function excluir() {
    if (!inicial) return
    const ok = window.confirm(
      `Excluir “${inicial.nome}”? Os meses já pagos e os anteriores continuam no histórico; os meses futuros ainda não pagos somem.`,
    )
    if (ok && (await excluirFixa(inicial.id))) onSalvo()
  }

  return (
    <form onSubmit={salvar} className="card space-y-3 p-4">
      <div>
        <label className="label">Nome da conta</label>
        <input
          className="input"
          placeholder="Ex.: Aluguel, Luz, Internet"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus={!inicial}
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
          <label className="label">Vence todo dia</label>
          <input
            className="input px-3"
            inputMode="numeric"
            placeholder="10"
            value={dia}
            onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
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
      <div className="space-y-2 rounded-2xl bg-teal-50 p-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-600">
          <input type="checkbox" checked={parcelado} onChange={(e) => setParcelado(e.target.checked)} />É parcelada
          (termina sozinha)
        </label>
        {parcelado && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nº de parcelas</label>
              <input
                className="input px-3"
                inputMode="numeric"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </div>
            <div>
              <label className="label">1ª parcela em</label>
              <input type="month" className="input px-3" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
          </div>
        )}
        {!parcelado && (
          <div>
            <label className="label">Começa a valer em</label>
            <input type="month" className="input px-3" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
        )}
      </div>
      {inicial && (
        <p className="text-xs text-brand-500">
          Mudanças valem do mês atual em diante. Meses já pagos, passados ou que você ajustou na mão
          não são alterados.
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={salvando || !nome.trim()}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancelar}>
          Cancelar
        </button>
        {inicial && (
          <button type="button" className="btn bg-rose-50 text-rose-600" onClick={() => void excluir()}>
            Excluir
          </button>
        )}
      </div>
    </form>
  )
}
