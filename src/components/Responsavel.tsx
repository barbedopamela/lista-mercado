import type { Perfil } from '../lib/types'
import Avatar from './Avatar'

/** Valor do seletor: 'ambos' ou o id de uma pessoa. */
export type QuemValor = string

export function quemDe(p: { responsavel_id: string | null; para_ambos: boolean }): QuemValor {
  return p.para_ambos ? 'ambos' : (p.responsavel_id ?? 'ambos')
}

export function quemParaBanco(v: QuemValor): { responsavel_id: string | null; para_ambos: boolean } {
  return v === 'ambos' ? { responsavel_id: null, para_ambos: true } : { responsavel_id: v, para_ambos: false }
}

/** Seletor "quem resolve": cada pessoa (com foto) ou os dois. */
export default function SeletorResponsavel({
  perfis,
  valor,
  onChange,
}: {
  perfis: Perfil[]
  valor: QuemValor
  onChange: (v: QuemValor) => void
}) {
  const opcoes: { id: string; nome: string; perfis: Perfil[] }[] = [
    ...perfis.map((p) => ({ id: p.id, nome: p.nome.split(' ')[0], perfis: [p] })),
    { id: 'ambos', nome: 'Os dois', perfis },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
            valor === o.id
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-brand-200 bg-teal-50 text-brand-600'
          }`}
        >
          <span className="flex -space-x-2">
            {o.perfis.map((p) => (
              <Avatar key={p.id} perfil={p} tamanho={22} />
            ))}
          </span>
          {o.nome}
        </button>
      ))}
    </div>
  )
}

/** Mostra só as fotos de quem resolve (usado nas listas). */
export function FotosResponsavel({
  perfis,
  pendencia,
}: {
  perfis: Perfil[]
  pendencia: { responsavel_id: string | null; para_ambos: boolean }
}) {
  const quem = pendencia.para_ambos
    ? perfis
    : perfis.filter((p) => p.id === pendencia.responsavel_id)
  if (quem.length === 0) return null
  return (
    <span className="flex -space-x-2">
      {quem.map((p) => (
        <Avatar key={p.id} perfil={p} tamanho={24} />
      ))}
    </span>
  )
}
