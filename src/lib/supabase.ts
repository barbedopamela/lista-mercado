import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Se as variáveis não estiverem preenchidas, o app mostra uma tela de
// configuração em vez de quebrar.
export const supabaseConfigurado = Boolean(url && chave)

export const supabase = createClient(
  url ?? 'http://localhost:54321',
  chave ?? 'chave-nao-configurada',
)

/** Executa uma escrita no banco e avisa se der erro. Retorna true se deu certo. */
export async function exec(
  promessa: PromiseLike<{ error: { message: string } | null }>,
): Promise<boolean> {
  const { error } = await promessa
  if (error) {
    alert('Ops, algo deu errado: ' + error.message)
    return false
  }
  return true
}
