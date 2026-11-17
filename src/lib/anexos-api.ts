import { supabase } from './supabase'
import type { Anexo } from './types'

/** Apaga os arquivos (no Storage) e o cadastro dos anexos de vários registros de uma vez. */
export async function apagarAnexosDe(origemIds: string[]): Promise<void> {
  if (origemIds.length === 0) return
  const { data } = await supabase.from('anexos').select('*').in('origem_id', origemIds)
  const caminhos = ((data ?? []) as Anexo[]).map((a) => a.caminho)
  if (caminhos.length > 0) await supabase.storage.from('anexos').remove(caminhos)
  await supabase.from('anexos').delete().in('origem_id', origemIds)
}
