/**
 * Barra de progresso do orçamento.
 * - `valor`: parte principal (ex.: o que já está no carrinho / já foi gasto)
 * - `segundo`: parte mais clara por trás (ex.: o total planejado / previsto)
 * - `limite`: o orçamento (100% da barra)
 */
export default function Barra({
  valor,
  segundo = 0,
  limite,
}: {
  valor: number
  segundo?: number
  limite: number
}) {
  const pct = (n: number) => (limite > 0 ? Math.min(100, (n / limite) * 100) : 0)
  const estourouValor = limite > 0 && valor > limite
  const estourouSegundo = limite > 0 && segundo > limite

  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-brand-50">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all ${
          estourouSegundo ? 'bg-amber-300' : 'bg-teal-200'
        }`}
        style={{ width: `${pct(Math.max(segundo, valor))}%` }}
      />
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all ${
          estourouValor ? 'bg-rose-500' : 'bg-brand-600'
        }`}
        style={{ width: `${pct(valor)}%` }}
      />
    </div>
  )
}
