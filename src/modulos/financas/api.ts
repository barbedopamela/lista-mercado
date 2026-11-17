import { supabase } from '../../lib/supabase'
import { mesAtual } from '../../lib/format'
import { apagarAnexosDe } from '../../lib/anexos-api'
import { sincronizar, type FixaBase } from './contas'

/** Depois de editar/desativar uma conta fixa, ajusta as linhas dos meses que já existem. */
export async function sincronizarFixa(fixa: FixaBase): Promise<void> {
  const { data } = await supabase
    .from('contas_mes')
    .select('id,conta_id,mes,paga,ajustada')
    .eq('conta_id', fixa.id)
  const r = sincronizar(
    fixa,
    (data ?? []) as { id: string; conta_id: string | null; mes: string; paga: boolean; ajustada: boolean }[],
    mesAtual(),
  )
  if (r.apagar.length > 0) {
    await apagarAnexosDe(r.apagar)
    await supabase.from('contas_mes').delete().in('id', r.apagar)
  }
  for (const a of r.atualizar) {
    await supabase.from('contas_mes').update(a.patch).eq('id', a.id)
  }
}

/**
 * Exclui uma conta fixa. Os meses já pagos e os passados ficam como histórico
 * (perdem só o vínculo com o molde); as linhas futuras não pagas são apagadas.
 */
export async function excluirFixa(id: string): Promise<boolean> {
  const { data } = await supabase.from('contas_mes').select('id,paga,mes').eq('conta_id', id)
  const futuras = ((data ?? []) as { id: string; paga: boolean; mes: string }[])
    .filter((l) => !l.paga && l.mes.slice(0, 7) >= mesAtual())
    .map((l) => l.id)
  if (futuras.length > 0) {
    await apagarAnexosDe(futuras)
    await supabase.from('contas_mes').delete().in('id', futuras)
  }
  const { error } = await supabase.from('contas_fixas').delete().eq('id', id)
  if (error) {
    alert('Ops, algo deu errado: ' + error.message)
    return false
  }
  return true
}
