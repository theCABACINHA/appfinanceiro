export const banks = ['Nubank', 'PicPay', 'Santander'];
export const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
export function amount(value) {
  const input = String(value).trim();
  if (!/^(\d+|\d{1,3}(\.\d{3})+)(,\d{1,2})?$/.test(input)) return null;
  const number = Math.round(Number(input.replace(/\./g, '').replace(',', '.')) * 100);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
export const inputMoney = value => (value / 100).toFixed(2).replace('.', ',');
export const emptyBudget = () => ({ version: 2, limits: { Nubank: 0, PicPay: 0, Santander: 0 }, months: {} });
export const emptyMonth = () => ({ salary: 0, invoices: { Nubank: 0, PicPay: 0, Santander: 0 }, expenses: [] });
export function summary(month) {
  const invoices = banks.reduce((sum, bank) => sum + month.invoices[bank], 0);
  const expenses = month.expenses.reduce((sum, item) => sum + item.amount, 0);
  return { salary: month.salary, invoices, expenses, total: invoices + expenses, remaining: month.salary - invoices - expenses };
}
const cents = value => Number.isSafeInteger(value) && value >= 0;
export function validBudget(value) {
  return value?.version === 2 && value.limits && banks.every(b => cents(value.limits[b])) &&
    value.months && typeof value.months === 'object' && !Array.isArray(value.months) &&
    Object.entries(value.months).every(([key, m]) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key) &&
      cents(m?.salary) && m.invoices && banks.every(b => cents(m.invoices[b])) &&
      Array.isArray(m.expenses) && m.expenses.every(e => typeof e.id === 'string' && typeof e.name === 'string' && typeof e.category === 'string' && cents(e.amount) && e.amount > 0));
}
export function migrateLegacy(legacy) {
  const result = emptyBudget();
  if (!Array.isArray(legacy?.transactions)) return result;
  for (const t of legacy.transactions) {
    if (!Number.isSafeInteger(t.amount) || t.amount <= 0 || !/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(t.date)) continue;
    const key = t.date.slice(0, 7);
    const month = result.months[key] ||= emptyMonth();
    if (t.type === 'income') month.salary += t.amount;
    else if (t.type === 'expense') month.expenses.push({ id: t.id, name: t.description, category: t.category, amount: t.amount });
  }
  return result;
}

export const emptyTrackingMonth = () => ({ ...emptyMonth(), openingCash: 0, incomes: [], payments: [], invoiceManual: Object.fromEntries(banks.map(b => [b, false])) });
export const emptyTrackingBudget = () => ({ version: 3, limits: { Nubank: 0, PicPay: 0, Santander: 0 }, credit: Object.fromEntries(banks.map(b => [b, {used: null, available: null}])), installments: [], months: {} });
export function upgradeBudget(previous) {
  if (previous?.version === 3) return previous;
  if (!validBudget(previous)) throw new Error('Backup inválido');
  const result = emptyTrackingBudget();
  result.limits = { ...previous.limits };
  for (const [key, m] of Object.entries(previous.months)) {
    result.months[key] = { ...emptyTrackingMonth(), ...m, invoiceManual: Object.fromEntries(banks.map(b => [b, m.invoices[b] > 0])) };
  }
  return result;
}
export const trackingMonth = (state, key) => state.months[key] || emptyTrackingMonth();
export function monthIndex(key) { const [year, month] = key.split('-').map(Number); return year * 12 + month - 1; }
export function installmentNumber(plan, key) { const index = monthIndex(key) - monthIndex(plan.start) + 1; return index > 0 && index <= plan.count ? index : null; }
export function scheduledInvoice(state, key, bank) {
  return state.installments.filter(p => p.bank === bank && installmentNumber(p, key)).reduce((sum, p) => sum + p.amount, 0);
}
export function invoiceTotal(state, key, bank) {
  const m = trackingMonth(state, key);
  return m.invoiceManual[bank] ? m.invoices[bank] : scheduledInvoice(state, key, bank);
}
export function paidFor(month, type, target) { return month.payments.filter(p => p.type === type && p.target === target).reduce((sum, p) => sum + p.amount, 0); }
export function obligations(state, key) {
  const m = trackingMonth(state, key);
  return [
    ...banks.map(bank => ({type:'card', target:bank, name:`Fatura ${bank}`, total:invoiceTotal(state,key,bank), paid:paidFor(m,'card',bank)})),
    ...m.expenses.map(e => ({type:'expense',target:e.id,name:e.name,total:e.amount,paid:paidFor(m,'expense',e.id)})),
  ].map(item => ({...item,pending:item.total-item.paid}));
}
export function monthlySummary(state, key) {
  const m = trackingMonth(state, key);
  const items = obligations(state, key);
  const receivedSalary = m.incomes.filter(i => i.kind === 'salary' && i.status === 'received').reduce((sum,i) => sum+i.amount,0);
  const extraReceived = m.incomes.filter(i => i.kind === 'extra' && i.status === 'received').reduce((sum,i) => sum+i.amount,0);
  const extraExpected = m.incomes.filter(i => i.kind === 'extra' && i.status === 'expected').reduce((sum,i) => sum+i.amount,0);
  const paid = m.payments.reduce((sum,p) => sum+p.amount,0);
  const total = items.reduce((sum,item) => sum+item.total,0);
  const cash = m.openingCash + receivedSalary + extraReceived - paid;
  const pending = total - paid;
  return {salary:m.salary, receivedSalary, extraReceived, extraExpected, paid, total, pending, cash,
    salaryPending: Math.max(0,m.salary-receivedSalary), reserve:Math.max(0,pending-Math.max(0,cash)),
    remaining:m.openingCash+m.salary+extraReceived+extraExpected-total,
    invoices:items.filter(i => i.type==='card').reduce((sum,i)=>sum+i.total,0),
    expenses:items.filter(i => i.type==='expense').reduce((sum,i)=>sum+i.total,0)};
}
const validMonthKey = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const uniqueIds = items => new Set(items.map(i=>i.id)).size === items.length;
export function validTrackingBudget(state) {
  try {
    if (state?.version !== 3 || !state.limits || !banks.every(b=>cents(state.limits[b])) || !state.credit || !banks.every(b=>state.credit[b] && [state.credit[b].used,state.credit[b].available].every(v=>v===null || cents(v)))) return false;
    if (!Array.isArray(state.installments) || !uniqueIds(state.installments) || !state.installments.every(p=>typeof p.id==='string' && typeof p.name==='string' && banks.includes(p.bank) && cents(p.amount) && p.amount>0 && validMonthKey(p.start) && Number.isInteger(p.count) && p.count>0 && p.count<=600)) return false;
    if (!state.months || typeof state.months!=='object' || Array.isArray(state.months)) return false;
    return Object.entries(state.months).every(([key,m])=>{
      if (!validMonthKey(key) || !cents(m.salary) || !cents(m.openingCash) || !m.invoices || !banks.every(b=>cents(m.invoices[b]) && typeof m.invoiceManual?.[b]==='boolean')) return false;
      if (!Array.isArray(m.expenses) || !uniqueIds(m.expenses) || !m.expenses.every(e=>typeof e.id==='string' && typeof e.name==='string' && typeof e.category==='string' && cents(e.amount) && e.amount>0)) return false;
      if (!Array.isArray(m.incomes) || !uniqueIds(m.incomes) || !m.incomes.every(i=>typeof i.id==='string' && typeof i.name==='string' && typeof i.account==='string' && ['extra','salary'].includes(i.kind) && ['received','expected'].includes(i.status) && cents(i.amount) && i.amount>0 && validDate(i.date) && i.date.slice(0,7)===key)) return false;
      if (m.incomes.filter(i=>i.kind==='salary').reduce((sum,i)=>sum+i.amount,0)>m.salary) return false;
      if (!Array.isArray(m.payments) || !uniqueIds(m.payments) || !m.payments.every(p=>typeof p.id==='string' && cents(p.amount) && p.amount>0 && validDate(p.date) && p.date.slice(0,7)===key && (p.type==='card' ? banks.includes(p.target) : p.type==='expense' && m.expenses.some(e=>e.id===p.target)))) return false;
      return obligations(state,key).every(item=>item.pending>=0);
    });
  } catch { return false; }
}
