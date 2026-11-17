import type { Perfil } from '../lib/types'
import Avatar from './Avatar'

/** Pequena etiqueta mostrando de qual conta a despesa sai. */
export function ChipConta({ perfis, contaDe }: { perfis: Perfil[]; contaDe: string | null }) {
  if (!contaDe) {
    return (
      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
        🏦 Conjunta
      </span>
    )
  }
  const p = perfis.find((x) => x.id === contaDe)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
      <Avatar perfil={p} tamanho={14} />
      {p?.nome.split(' ')[0] ?? 'Pessoal'}
    </span>
  )
}

/**
 * De onde o dinheiro sai: conta conjunta ('' ) ou conta pessoal de alguém (id).
 * O app só marca a origem; só a conta conjunta tem saldo.
 */
export default function SeletorConta({
  perfis,
  valor,
  onChange,
}: {
  perfis: Perfil[]
  valor: string
  onChange: (v: string) => void
}) {
  const opcoes: { id: string; nome: string; perfil?: Perfil }[] = [
    { id: '', nome: 'Conta conjunta' },
    ...perfis.map((p) => ({ id: p.id, nome: `Conta de ${p.nome.split(' ')[0]}`, perfil: p })),
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o.id || 'conjunta'}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
            valor === o.id
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-brand-200 bg-teal-50 text-brand-600'
          }`}
        >
          {o.perfil ? <Avatar perfil={o.perfil} tamanho={20} /> : <span>🏦</span>}
          {o.nome}
        </button>
      ))}
    </div>
  )
}
