import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resumoDoMes, saldoAtual } from './saldo.ts'

const base = { valor: 5000, data: '2026-11-01' }
const l = (tipo: 'entrada' | 'saida', valor: number, data: string, pessoal: string | null = null) => ({
  tipo,
  valor,
  data,
  conta_pessoal_de: pessoal,
})
const c = (valor: number, pago_em: string | null, extra = {}) => ({
  valor,
  paga: !!pago_em,
  pulada: false,
  pago_em,
  conta_pessoal_de: null,
  ...extra,
})

test('soma entradas e tira saídas e contas pagas depois da data de partida', () => {
  const s = saldoAtual(base, [l('entrada', 3000, '2026-11-05'), l('saida', 120, '2026-11-06')], [c(1500.5, '2026-11-10')], '2026-11-17')
  assert.equal(s, 6379.5)
})

test('ignora o que é futuro, anterior à partida, pessoal, pulado ou não pago', () => {
  const s = saldoAtual(
    base,
    [l('entrada', 999, '2026-11-30'), l('saida', 50, '2026-10-20'), l('saida', 70, '2026-11-08', 'p1')],
    [c(100, null), c(200, '2026-11-09', { pulada: true }), c(300, '2026-11-09', { conta_pessoal_de: 'p1' })],
    '2026-11-17',
  )
  assert.equal(s, 5000)
})

test('sem saldo de partida começa do zero', () => {
  assert.equal(saldoAtual(null, [l('entrada', 10, '2026-01-01')], [], '2026-11-17'), 10)
})

test('resumo do mês só da conta conjunta', () => {
  const r = resumoDoMes(
    [l('entrada', 3000, '2026-11-05'), l('saida', 120, '2026-11-06'), l('saida', 9, '2026-11-06', 'p1'), l('entrada', 1, '2026-12-01')],
    [c(1500.5, '2026-11-10')],
    '2026-11',
  )
  assert.deepEqual(r, { entradas: 3000, saidas: 1620.5, resultado: 1379.5 })
})
