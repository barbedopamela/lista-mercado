import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from './lib/supabase'
import { PerfisCtx } from './lib/contexto'
import { useTabela } from './hooks/useTabela'
import type { Perfil } from './lib/types'
import BottomNav, { type Aba } from './components/BottomNav'
import Login from './pages/Login'
import Configurar from './pages/Configurar'
import Listas from './pages/Listas'
import CompraDetalhe from './pages/CompraDetalhe'
import Mes from './pages/Mes'
import Ajustes from './pages/Ajustes'

export default function App() {
  // undefined = ainda verificando se existe login salvo
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!supabaseConfigurado) return
    void supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabaseConfigurado) return <Configurar />
  if (sessao === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-brand-500">Carregando…</div>
  }
  if (!sessao) return <Login />
  return <Principal userId={sessao.user.id} />
}

function Principal({ userId }: { userId: string }) {
  const [aba, setAba] = useState<Aba>('listas')
  const [compraAberta, setCompraAberta] = useState<string | null>(null)

  const { dados: perfis } = useTabela<Perfil>('perfis')
  const valor = useMemo(
    () => ({ perfis, eu: perfis.find((p) => p.id === userId) ?? null }),
    [perfis, userId],
  )

  function mudarAba(a: Aba) {
    setAba(a)
    setCompraAberta(null)
  }

  function abrirCompra(id: string) {
    setAba('listas')
    setCompraAberta(id)
  }

  return (
    <PerfisCtx.Provider value={valor}>
      <main className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5">
        {aba === 'listas' &&
          (compraAberta ? (
            <CompraDetalhe id={compraAberta} onVoltar={() => setCompraAberta(null)} />
          ) : (
            <Listas onAbrir={abrirCompra} />
          ))}
        {aba === 'mes' && <Mes onAbrir={abrirCompra} />}
        {aba === 'ajustes' && <Ajustes />}
      </main>
      <BottomNav aba={aba} onMudar={mudarAba} />
    </PerfisCtx.Provider>
  )
}
