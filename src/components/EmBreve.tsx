export default function EmBreve({
  titulo,
  subtitulo,
  emoji,
  descricao,
}: {
  titulo: string
  subtitulo: string
  emoji: string
  descricao: string
}) {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-brand-500">{subtitulo}</p>
        <h1 className="text-2xl font-bold text-brand-600">{titulo}</h1>
      </header>
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <span className="text-5xl">{emoji}</span>
        <p className="font-semibold text-brand-600">Chegando em breve</p>
        <p className="text-sm text-brand-500">{descricao}</p>
      </div>
    </div>
  )
}
