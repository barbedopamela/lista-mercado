import { useState } from 'react'
import MesContas from './MesContas'
import ContaMesDetalhe from './ContaMesDetalhe'
import ContasFixas from './ContasFixas'
import Saldo, { type Alvo } from './Saldo'
import LancamentoDetalhe from './LancamentoDetalhe'

type Sub = 'mes' | 'saldo' | 'contas'

/** Módulo Finanças da casa. Projeção e caixinhas entram nas próximas entregas. */
export default function Financas() {
  const [sub, setSub] = useState<Sub>('mes')
  const [aberto, setAberto] = useState<Alvo | null>(null)

  if (aberto?.kind === 'conta') {
    return <ContaMesDetalhe id={aberto.id} onVoltar={() => setAberto(null)} />
  }
  if (aberto?.kind === 'lancamento') {
    return <LancamentoDetalhe id={aberto.id} onVoltar={() => setAberto(null)} />
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-full bg-brand-50 p-1">
        {(
          [
            ['mes', 'Mês'],
            ['saldo', 'Saldo'],
            ['contas', 'Contas'],
          ] as [Sub, string][]
        ).map(([chave, nome]) => (
          <button
            key={chave}
            onClick={() => setSub(chave)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              sub === chave ? 'bg-white text-brand-600 shadow-soft' : 'text-brand-500'
            }`}
          >
            {nome}
          </button>
        ))}
      </div>
      {sub === 'mes' && <MesContas onAbrir={(id) => setAberto({ kind: 'conta', id })} />}
      {sub === 'saldo' && <Saldo onAbrir={setAberto} />}
      {sub === 'contas' && <ContasFixas />}
    </div>
  )
}
