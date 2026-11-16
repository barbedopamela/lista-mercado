import { createContext, useContext } from 'react'
import type { Perfil } from './types'

type Valor = { eu: Perfil | null; perfis: Perfil[] }

export const PerfisCtx = createContext<Valor>({ eu: null, perfis: [] })

export const usePerfis = () => useContext(PerfisCtx)
