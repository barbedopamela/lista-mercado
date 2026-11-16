import type { Perfil } from '../lib/types'

export default function Avatar({
  perfil,
  tamanho = 28,
}: {
  perfil?: Perfil | null
  tamanho?: number
}) {
  const estilo = { width: tamanho, height: tamanho }

  if (perfil?.avatar_url) {
    return (
      <img
        src={perfil.avatar_url}
        alt={perfil.nome}
        title={perfil.nome}
        referrerPolicy="no-referrer"
        style={estilo}
        className="shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    )
  }

  const inicial = (perfil?.nome ?? '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      title={perfil?.nome}
      style={{ ...estilo, fontSize: tamanho * 0.45 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-teal-400 font-semibold text-white ring-2 ring-white"
    >
      {inicial}
    </span>
  )
}
