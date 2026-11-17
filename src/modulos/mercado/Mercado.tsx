import { useState } from 'react'
import Listas from './Listas'
import CompraDetalhe from './CompraDetalhe'
import Mes from './Mes'

type Sub = 'compras' | 'mes'

/** Módulo Mercado: junta as telas de compras e o resumo do mês. */
export default function Mercado() {
  const [sub, setSub] = useState<Sub>('compras')
  const [compraAberta, setCompraAberta] = useState<string | null>(null)

  function abrirCompra(id: string) {
    setSub('compras')
    setCompraAberta(id)
  }

  // Dentro de uma compra, mostramos só o detalhe (com botão de voltar).
  if (compraAberta) {
    return <CompraDetalhe id={compraAberta} onVoltar={() => setCompraAberta(null)} />
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-full bg-brand-50 p-1">
        {(
          [
            ['compras', 'Compras'],
            ['mes', 'Mês'],
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
      {sub === 'compras' ? <Listas onAbrir={abrirCompra} /> : <Mes onAbrir={abrirCompra} />}
    </div>
  )
}
