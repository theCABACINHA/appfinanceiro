import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, totals, accountBalance, emptyState, validState } from '../src/finance.js';

test('valores brasileiros são armazenados em centavos, sem arredondar entradas inválidas', () => {
  assert.equal(parseAmount('1.234,56'), 123456);
  assert.equal(parseAmount('0,01'), 1);
  assert.equal(parseAmount('100'), 10000);
  for (const value of ['', '0', '-10', '1,234', 'abc', 'Infinity', '1.25', '1..000', '1 00']) assert.equal(parseAmount(value), null);
});
test('receitas e despesas atualizam o saldo apenas da conta selecionada', () => {
  const transactions = [{ type: 'income', amount: 10000, accountId: 'a' }, { type: 'expense', amount: 2500, accountId: 'a' }, { type: 'expense', amount: 2000, accountId: 'b' }];
  assert.deepEqual(totals(transactions), { income: 10000, expense: 4500, balance: 5500 });
  assert.equal(accountBalance({ id: 'a', initialBalance: 5000 }, transactions), 12500);
  assert.equal(accountBalance({ id: 'b', initialBalance: 0 }, transactions), -2000);
});
test('estado persistido rejeita contas inexistentes e valores inválidos', () => {
  const state = emptyState();
  assert.equal(validState(state), true);
  const item = { id: 't1', description: 'Mercado', category: 'Alimentação', type: 'expense', amount: 1290, date: '2026-10-14', accountId: 'principal' };
  assert.equal(validState({ ...state, transactions: [item] }), true);
  assert.equal(validState({ ...state, transactions: [{ ...item, accountId: 'unknown' }] }), false);
  assert.equal(validState({ ...state, transactions: [{ ...item, amount: -1 }] }), false);
  assert.equal(validState({ ...state, transactions: [{ ...item, date: '2026-02-30' }] }), false);
});
