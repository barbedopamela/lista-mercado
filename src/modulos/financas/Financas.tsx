import { useState } from 'react'
import MesContas from './MesContas'
import ContaMesDetalhe from './ContaMesDetalhe'
import ContasFixas from './ContasFixas'

type Sub = 'mes' | 'contas'

/** Módulo Finanças da casa. Saldo, projeção e caixinhas entram nas próximas entregas. */
export default function Financas() {
  const [sub, setSub] = useState<Sub>('mes')
  const [contaAberta, setContaAberta] = useState<string | null>(null)

  if (contaAberta) {
    return <ContaMesDetalhe id={contaAberta} onVoltar={() => setContaAberta(null)} />
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-full bg-brand-50 p-1">
        {(
          [
            ['mes', 'Mês'],
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
      {sub === 'mes' ? <MesContas onAbrir={setContaAberta} /> : <ContasFixas />}
    </div>
  )
}
