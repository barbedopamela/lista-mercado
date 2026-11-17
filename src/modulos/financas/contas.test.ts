// Rodar: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  faltandoGerar,
  ocorrenciaNoMes,
  resumoMes,
  sincronizar,
  situacao,
  vencimentoDoMes,
  type FixaBase,
} from './contas.ts'

const fixa = (extra: Partial<FixaBase> = {}): FixaBase => ({
  id: 'f1',
  nome: 'Internet',
  valor: 100,
  dia_vencimento: 10,
  categoria_id: null,
  conta_pessoal_de: null,
  primeiro_mes: '2026-11-01',
  parcelas: null,
  ativa: true,
  ...extra,
})

test('vencimento: dia 31 em fevereiro vira o último dia do mês', () => {
  assert.equal(vencimentoDoMes('2027-02', 31), '2027-02-28')
  assert.equal(vencimentoDoMes('2028-02', 31), '2028-02-29') // bissexto
  assert.equal(vencimentoDoMes('2026-11', 10), '2026-11-10')
  assert.equal(vencimentoDoMes('2026-04', 31), '2026-04-30')
})

test('conta sem fim: existe a partir do primeiro mês, nunca antes', () => {
  assert.equal(ocorrenciaNoMes(fixa(), '2026-10'), null)
  assert.deepEqual(ocorrenciaNoMes(fixa(), '2026-11'), { parcela_n: null, parcela_total: null })
  assert.deepEqual(ocorrenciaNoMes(fixa(), '2030-01'), { parcela_n: null, parcela_total: null })
})

test('conta parcelada: parcela x de y e termina sozinha', () => {
  const f = fixa({ parcelas: 3, primeiro_mes: '2026-11-01' })
  assert.deepEqual(ocorrenciaNoMes(f, '2026-11'), { parcela_n: 1, parcela_total: 3 })
  assert.deepEqual(ocorrenciaNoMes(f, '2027-01'), { parcela_n: 3, parcela_total: 3 })
  assert.equal(ocorrenciaNoMes(f, '2027-02'), null)
})

test('virada de ano na contagem de parcelas', () => {
  const f = fixa({ parcelas: 4, primeiro_mes: '2026-11-01' })
  assert.deepEqual(ocorrenciaNoMes(f, '2027-02'), { parcela_n: 4, parcela_total: 4 })
})

test('conta desativada não aparece', () => {
  assert.equal(ocorrenciaNoMes(fixa({ ativa: false }), '2026-12'), null)
})

test('faltandoGerar cria só o que ainda não existe e nunca duplica', () => {
  const fixas = [fixa({ id: 'a' }), fixa({ id: 'b', dia_vencimento: 31 })]
  const primeira = faltandoGerar(fixas, [], '2026-11')
  assert.equal(primeira.length, 2)
  assert.equal(primeira[1]?.vencimento, '2026-11-30')
  assert.equal(primeira[0]?.mes, '2026-11-01')
  const segunda = faltandoGerar(fixas, [{ conta_id: 'a' }, { conta_id: null }], '2026-11')
  assert.deepEqual(segunda.map((x) => x.conta_id), ['b'])
  assert.equal(faltandoGerar(fixas, [{ conta_id: 'a' }, { conta_id: 'b' }], '2026-11').length, 0)
})

test('faltandoGerar respeita início e parcelas', () => {
  const f = fixa({ parcelas: 2, primeiro_mes: '2026-12-01' })
  assert.equal(faltandoGerar([f], [], '2026-11').length, 0)
  assert.equal(faltandoGerar([f], [], '2026-12').length, 1)
  assert.equal(faltandoGerar([f], [], '2027-02').length, 0)
})

test('sincronizar: muda valor só do que não foi ajustado nem pago, e só dali em diante', () => {
  const novo = fixa({ valor: 150, dia_vencimento: 15 })
  const linhas = [
    { id: 'passado', conta_id: 'f1', mes: '2026-10-01', paga: false, ajustada: false },
    { id: 'pago', conta_id: 'f1', mes: '2026-11-01', paga: true, ajustada: false },
    { id: 'ajustado', conta_id: 'f1', mes: '2026-12-01', paga: false, ajustada: true },
    { id: 'normal', conta_id: 'f1', mes: '2027-01-01', paga: false, ajustada: false },
    { id: 'outra', conta_id: 'zzz', mes: '2027-01-01', paga: false, ajustada: false },
  ]
  const r = sincronizar(novo, linhas, '2026-11')
  assert.deepEqual(r.apagar, [])
  assert.deepEqual(r.atualizar.map((a) => a.id), ['ajustado', 'normal'])
  const ajustado = r.atualizar.find((a) => a.id === 'ajustado')!.patch
  assert.equal(ajustado.valor, undefined) // mantém o valor que você ajustou
  assert.equal(ajustado.vencimento, undefined)
  const normal = r.atualizar.find((a) => a.id === 'normal')!.patch
  assert.equal(normal.valor, 150)
  assert.equal(normal.vencimento, '2027-01-15')
})

test('sincronizar: desativar ou encurtar apaga só linhas futuras não pagas', () => {
  const linhas = [
    { id: 'pago', conta_id: 'f1', mes: '2026-11-01', paga: true, ajustada: false },
    { id: 'f12', conta_id: 'f1', mes: '2026-12-01', paga: false, ajustada: false },
    { id: 'f01', conta_id: 'f1', mes: '2027-01-01', paga: false, ajustada: false },
  ]
  const desativada = sincronizar(fixa({ ativa: false }), linhas, '2026-11')
  assert.deepEqual(desativada.apagar.sort(), ['f01', 'f12'])
  const encurtada = sincronizar(fixa({ parcelas: 2 }), linhas, '2026-11')
  assert.deepEqual(encurtada.apagar, ['f01'])
})

test('situação: paga, atrasada, hoje, aberta', () => {
  assert.equal(situacao({ paga: true, vencimento: '2020-01-01' }, '2026-11-17'), 'paga')
  assert.equal(situacao({ paga: false, vencimento: '2026-11-16' }, '2026-11-17'), 'atrasada')
  assert.equal(situacao({ paga: false, vencimento: '2026-11-17' }, '2026-11-17'), 'hoje')
  assert.equal(situacao({ paga: false, vencimento: '2026-11-18' }, '2026-11-17'), 'aberta')
})

test('resumo do mês ignora puladas e separa a conta conjunta', () => {
  const r = resumoMes([
    { valor: 100.1, paga: true, pulada: false, conta_pessoal_de: null },
    { valor: 200.2, paga: false, pulada: false, conta_pessoal_de: null },
    { valor: 50, paga: false, pulada: false, conta_pessoal_de: 'pam' },
    { valor: 999, paga: false, pulada: true, conta_pessoal_de: null },
  ])
  assert.equal(r.total, 350.3)
  assert.equal(r.pago, 100.1)
  assert.equal(r.falta, 250.2)
  assert.equal(r.conjuntaTotal, 300.3)
  assert.equal(r.conjuntaFalta, 200.2)
})
