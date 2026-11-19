import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linhasPorForma, somaOrcamentos } from './orcamento.ts'

const formas = [
  { id: 'vr', nome: 'VR', ordem: 2 },
  { id: 'cartao', nome: 'Cartão', ordem: 1 },
  { id: 'pix', nome: 'Pix', ordem: 3 },
]

test('mostra orçamento, gasto e quanto resta por forma, na ordem de Ajustes', () => {
  const l = linhasPorForma(formas, new Map([['cartao', 800], ['vr', 600]]), new Map([['cartao', 250.5], ['vr', 700]]))
  assert.deepEqual(l.map((x) => [x.nome, x.orcamento, x.gasto, x.restante]), [
    ['Cartão', 800, 250.5, 549.5],
    ['VR', 600, 700, -100],
  ])
})

test('forma sem orçamento mas com gasto aparece; sem nada, some', () => {
  const l = linhasPorForma(formas, new Map(), new Map([['pix', 40]]))
  assert.deepEqual(l.map((x) => x.nome), ['Pix'])
  assert.equal(l[0]?.orcamento, 0)
})

test('pagamentos sem forma ou de forma apagada viram "Outra forma"', () => {
  const l = linhasPorForma(formas, new Map(), new Map([['outra', 10], ['apagada', 5]]))
  assert.deepEqual(l.map((x) => [x.nome, x.gasto]), [['Outra forma', 15]])
})

test('total é a soma dos orçamentos das formas', () => {
  assert.equal(somaOrcamentos(new Map([['a', 800.1], ['b', 600.2]])), 1400.3)
})
