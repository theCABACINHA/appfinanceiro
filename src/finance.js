export const categories = ['Salário', 'Freelance', 'Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Compras', 'Outros'];
export const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
export const monthKey = (date) => date.slice(0, 7);
export function parseAmount(value) {
  const input = String(value).trim();
  if (!/^(\d+|\d{1,3}(\.\d{3})+)(,\d{1,2})?$/.test(input)) return null;
  const normalized = input.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
export function totals(transactions) {
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expense };
}
export function accountBalance(account, transactions) {
  return account.initialBalance + totals(transactions.filter(t => t.accountId === account.id)).balance;
}
export function validState(state) {
  return state?.version === 1 && Array.isArray(state.accounts) && state.accounts.length > 0 &&
    state.accounts.every(a => typeof a.id === 'string' && typeof a.name === 'string' && Number.isSafeInteger(a.initialBalance)) &&
    Array.isArray(state.transactions) && state.transactions.every(t =>
      typeof t.id === 'string' && typeof t.description === 'string' && categories.includes(t.category) &&
      ['income', 'expense'].includes(t.type) && Number.isSafeInteger(t.amount) && t.amount > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(t.date) && !Number.isNaN(Date.parse(t.date)) &&
      new Date(t.date).toISOString().slice(0, 10) === t.date && state.accounts.some(a => a.id === t.accountId));
}
export function emptyState() {
  return { version: 1, accounts: [{ id: 'principal', name: 'Conta principal', initialBalance: 0 }], transactions: [] };
}
