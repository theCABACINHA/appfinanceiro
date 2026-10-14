import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyTrackingBudget,emptyTrackingMonth,monthlySummary,validTrackingBudget,invoiceTotal,installmentNumber,upgradeBudget,emptyBudget,emptyMonth} from '../src/budget.js';
const key='2026-10';
const make=()=>{const s=emptyTrackingBudget();s.months[key]={...emptyTrackingMonth(),salary:500000,invoiceManual:{Nubank:false,PicPay:false,Santander:true},invoices:{Nubank:0,PicPay:0,Santander:90000},expenses:[{id:'light',name:'Luz',category:'Luz',amount:20000}]};return s;};
const income=(id,value,kind='extra',status='received')=>({id,name:'Entrada',account:'Conta',amount:value,kind,status,date:'2026-10-14'});
const payment=(id,value,type='expense',target='light')=>({id,amount:value,type,target,date:'2026-10-14'});
test('entrada prevista não é caixa e pagamento parcial reduz caixa e dívida sem duplicar despesa',()=>{
 const s=make();s.months[key].incomes=[income('extra',30000),income('future',50000,'extra','expected')];s.months[key].payments=[payment('p',10000)];
 const totals=monthlySummary(s,key);
 assert.equal(totals.cash,20000);assert.equal(totals.paid,10000);assert.equal(totals.pending,100000);assert.equal(totals.reserve,80000);
 assert.equal(totals.total,110000);assert.equal(totals.remaining,470000);assert.equal(validTrackingBudget(s),true);
});
test('adiantamento não duplica salário e receber salário não muda projeção final',()=>{
 const s=make();s.months[key].incomes=[income('advance',100000,'salary')];
 const first=monthlySummary(s,key);assert.equal(first.salaryPending,400000);assert.equal(first.cash,100000);assert.equal(first.remaining,390000);
 s.months[key].incomes.push(income('salary',400000,'salary'));
 assert.equal(monthlySummary(s,key).salaryPending,0);assert.equal(monthlySummary(s,key).remaining,first.remaining);
 s.months[key].incomes.push(income('duplicate',1,'salary'));assert.equal(validTrackingBudget(s),false);
});
test('limite disponível é independente da fatura e do utilizado informados',()=>{
 const s=make();s.limits.Santander=500000;s.credit.Santander={used:280000,available:110000};
 assert.equal(validTrackingBudget(s),true);assert.equal(invoiceTotal(s,key,'Santander'),90000);
 assert.equal(s.credit.Santander.available,110000);
 s.months[key].payments=[payment('card',40000,'card','Santander')];
 assert.equal(validTrackingBudget(s),true);assert.equal(s.credit.Santander.available,110000);
 assert.equal(monthlySummary(s,key).pending,70000);
});
test('parcelas terminam no prazo e fatura informada substitui previsão sem duplicar',()=>{
 const s=make();s.installments=[{id:'plan',name:'Celular',bank:'Nubank',amount:12000,start:'2026-10',count:3}];
 assert.equal(invoiceTotal(s,'2026-09','Nubank'),0);assert.equal(invoiceTotal(s,'2026-10','Nubank'),12000);
 assert.equal(installmentNumber(s.installments[0],'2026-12'),3);assert.equal(invoiceTotal(s,'2027-01','Nubank'),0);
 s.months[key].invoiceManual.Nubank=true;s.months[key].invoices.Nubank=50000;
 assert.equal(invoiceTotal(s,key,'Nubank'),50000);assert.equal(monthlySummary(s,key).invoices,140000);
});
test('overpayment, referência inexistente e data em outro mês são rejeitados',()=>{
 const s=make();s.months[key].payments=[payment('p',20001)];assert.equal(validTrackingBudget(s),false);
 s.months[key].payments=[payment('p',1,'expense','unknown')];assert.equal(validTrackingBudget(s),false);
 s.months[key].payments=[{...payment('p',100),date:'2026-11-01'}];assert.equal(validTrackingBudget(s),false);
 s.months[key].payments=[{...payment('p',100),date:'2026-10-32'}];assert.equal(validTrackingBudget(s),false);
});
test('migração preserva limites, salário e faturas, sem inventar recebimentos ou pagamentos',()=>{
 const old=emptyBudget();old.limits.Santander=500000;old.months[key]={...emptyMonth(),salary:500000,invoices:{Nubank:0,PicPay:0,Santander:90000}};
 const migrated=upgradeBudget(old);assert.equal(validTrackingBudget(migrated),true);
 assert.equal(invoiceTotal(migrated,key,'Santander'),90000);assert.equal(monthlySummary(migrated,key).cash,0);
 assert.equal(migrated.credit.Santander.available,null);assert.equal(old.version,2);
});
