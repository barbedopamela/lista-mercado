import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  // Se o Google voltou com erro (ex.: e-mail não liberado), mostramos aqui.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const busca = new URLSearchParams(window.location.search)
    const msg = hash.get('error_description') ?? busca.get('error_description')
    if (msg) setErro(msg)
  }, [])

  async function entrar() {
    setEntrando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setErro(error.message)
      setEntrando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-600 to-teal-500">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-xl3 bg-white/15 text-4xl backdrop-blur">
          🛒
        </div>
        <h1 className="text-3xl font-bold">Lista do Mercado</h1>
        <p className="mt-2 max-w-xs text-white/80">
          Listas, orçamento e pagamentos das compras de vocês dois, no mesmo lugar.
        </p>
      </div>

      <div className="rounded-t-[2rem] bg-white px-6 pb-10 pt-8 shadow-soft">
        <button onClick={entrar} disabled={entrando} className="btn-primary w-full py-4 text-base">
          {entrando ? 'Abrindo o Google…' : 'Entrar com Google'}
        </button>
        {erro && (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</p>
        )}
        <p className="mt-4 text-center text-xs text-brand-500">
          Acesso liberado apenas para os dois e-mails cadastrados.
        </p>
      </div>
    </div>
  )
}
