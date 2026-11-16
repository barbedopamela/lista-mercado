import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Opcoes = {
  /** filtra por coluna = valor (ex.: compra_id = '123') */
  coluna?: string
  valor?: string
  ordem?: string
  asc?: boolean
}

/**
 * Carrega uma tabela e se mantém atualizada em tempo real: quando a outra
 * pessoa adiciona ou altera algo, a tela atualiza sozinha.
 */
export function useTabela<T>(tabela: string, opcoes: Opcoes = {}) {
  const { coluna, valor, ordem, asc = true } = opcoes
  const [dados, setDados] = useState<T[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    let consulta = supabase.from(tabela).select('*')
    if (coluna && valor) consulta = consulta.eq(coluna, valor)
    if (ordem) consulta = consulta.order(ordem, { ascending: asc })
    const { data } = await consulta
    setDados((data ?? []) as T[])
    setCarregando(false)
  }, [tabela, coluna, valor, ordem, asc])

  useEffect(() => {
    void carregar()
    const canal = supabase
      .channel(`rt-${tabela}-${coluna ?? ''}-${valor ?? ''}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => {
        void carregar()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [carregar, tabela, coluna, valor])

  return { dados, carregando, recarregar: carregar }
}
