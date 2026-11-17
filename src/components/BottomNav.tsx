export type Aba = 'mercado' | 'resolver' | 'financas' | 'ajustes'

const icones: Record<Aba, string> = {
  // carrinho
  mercado: 'M3 4h2l2.4 11.2a1 1 0 001 .8h9.2a1 1 0 001-.8L20 8H6M9 20h.01M17 20h.01',
  // lista com check
  resolver: 'M9 6h11M9 12h11M9 18h11M3.5 6l1.2 1.2L6.8 5M3.5 12l1.2 1.2L6.8 11M3.5 18l1.2 1.2L6.8 17',
  // moedas / carteira
  financas: 'M3 7a2 2 0 012-2h13a1 1 0 011 1v2M3 7v11a2 2 0 002 2h14a1 1 0 001-1v-3M3 7h15a2 2 0 012 2v3M20 12h-4a2 2 0 100 4h4z',
  ajustes:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
}

const nomes: Record<Aba, string> = {
  mercado: 'Mercado',
  resolver: 'A resolver',
  financas: 'Finanças',
  ajustes: 'Ajustes',
}

export default function BottomNav({ aba, onMudar }: { aba: Aba; onMudar: (a: Aba) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md justify-around gap-1 px-2 py-2">
        {(Object.keys(nomes) as Aba[]).map((a) => {
          const ativa = a === aba
          return (
            <button
              key={a}
              onClick={() => onMudar(a)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition ${
                ativa ? 'bg-teal-100 text-brand-600' : 'text-brand-500/70'
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={icones[a]} />
              </svg>
              {nomes[a]}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
