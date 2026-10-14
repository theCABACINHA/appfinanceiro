import test from 'node:test';
import assert from 'node:assert/strict';
import { amount, emptyBudget, emptyMonth, summary, validBudget, migrateLegacy } from '../src/budget.js';
test('salário desconta três faturas e despesas externas sem somar limites', () => {
  const month = { salary: 500000, invoices: {Nubank:100000, PicPay:50000, Santander:25000}, expenses: [{id:'a', name:'Luz',category:'Luz',amount:20000}, {id:'b',name:'Água',category:'Água',amount:10000}] };
  assert.deepEqual(summary(month), {salary:500000,invoices:175000,expenses:30000,total:205000,remaining:295000});
  assert.equal(summary({...month,salary:100000}).remaining, -105000);
});
test('valores em reais preservam centavos, aceitam zero e rejeitam formatos ambíguos', () => {
  assert.equal(amount('3.500,50'), 350050);
  assert.equal(amount('0,00'),0);
  for(const input of ['-1', 'abc','1.25','1,234','', '1..000']) assert.equal(amount(input),null);
});
test('meses independentes e registros persistidos são validados', () => {
  const state = emptyBudget();
  state.months['2026-10'] = {...emptyMonth(),salary:500000};
  state.months['2026-11'] = emptyMonth();
  assert.equal(validBudget(state),true);
  assert.equal(summary(state.months['2026-11']).salary,0);
  assert.equal(validBudget({...state, limits:{...state.limits,Nubank:-1}}),false);
});
test('migração mantém receitas e despesas anteriores sem apagar dados originais', () => {
  const legacy={transactions:[{id:'i',type:'income',date:'2026-10-01',amount:100000},{id:'e',type:'expense',date:'2026-10-05',description:'Luz',category:'Moradia',amount:10000}]};
  const state=migrateLegacy(legacy);
  assert.equal(validBudget(state),true);
  assert.equal(summary(state.months['2026-10']).remaining,90000);
  assert.equal(legacy.transactions.length,2);
});
