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
