import './style.css';
import { categories, money, monthKey, parseAmount, totals, accountBalance, validState, emptyState } from './finance.js';

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  wallet: '<path d="M20 8V5a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v11H6a3 3 0 0 1-3-3V6"/><path d="M20 12h-5v4h5"/>',
  arrows: '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  chart: '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="m7 14 5-5 5 5M12 9v11"/><path d="M5 4h14"/>',
  down: '<path d="m7 10 5 5 5-5M12 4v11"/><path d="M5 20h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  leaf: '<path d="M20 3c-9-1-17 4-16 11 1 8 13 7 16-11Z"/><path d="m5 20 9-10"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  edit: '<path d="m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-4-4L4 15v5Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.wallet}</svg>`;
const esc = (value) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const storageKey = 'clara-finances-v1';
let storageWarning = '';
let state;
try {
  const stored = localStorage.getItem(storageKey);
  if (!stored) state = emptyState();
  else { state = JSON.parse(stored); if (!validState(state)) throw new Error('invalid'); }
} catch {
  state = emptyState();
  storageWarning = 'Não foi possível ler os dados salvos. Exporte os dados antes de fechar esta página e verifique o armazenamento do navegador.';
}
let page = 'overview';
let selectedMonth = monthKey(today());
let search = '';
let filter = 'all';
let toastTimer;

function persist(next) {
  try { localStorage.setItem(storageKey, JSON.stringify(next)); state = next; return true; }
  catch { toast('Não foi possível salvar. Verifique o espaço e as permissões do navegador.', true); return false; }
}
function toast(message, error = false) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className = `toast ${error ? 'error' : ''}`; el.setAttribute('role', 'status'); el.textContent = message;
  document.body.append(el); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 5000);
}
function monthLabel(month) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`));
}
function monthTransactions() { return state.transactions.filter(t => monthKey(t.date) === selectedMonth); }
function navItem(id, title, symbol) { return `<button class="nav-item ${page === id ? 'active' : ''}" data-page="${id}" ${page === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${title}</span></button>`; }
function render() {
  const titles = { overview: ['Visão geral', 'Um olhar tranquilo para o seu dinheiro.'], transactions: ['Transações', 'Cada movimento, no seu lugar.'], accounts: ['Minhas contas', 'Todas as suas contas, em um só lugar.'], reports: ['Relatórios', 'Entenda para onde seu dinheiro vai.'] };
  document.querySelector('#app').innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Clara, início"><span class="brand-icon">${icon('leaf')}</span>clara<span class="brand-dot">.</span></a>
      <div class="workspace"><span class="avatar">P</span><div><strong>Meu espaço</strong><small>Finanças pessoais</small></div><span class="workspace-dot"></span></div>
      <p class="nav-label">SEU DINHEIRO</p>
      <nav aria-label="Navegação principal">${navItem('overview', 'Visão geral', 'grid')}${navItem('transactions', 'Transações', 'arrows')}${navItem('accounts', 'Minhas contas', 'wallet')}${navItem('reports', 'Relatórios', 'chart')}</nav>
      <div class="sidebar-tip"><span class="tip-icon">${icon('leaf')}</span><strong>Pequenos passos.<br>Mais tranquilidade.</strong><p>Organizar hoje é cuidar<br>do seu amanhã.</p></div>
      <button class="export-button" id="export">${icon('download')} Exportar meus dados</button>
      <div class="sidebar-footer"><span class="avatar small">P</span><div><strong>Seu espaço pessoal</strong><small>Salvo neste navegador</small></div></div>
    </aside>
    <main>
      <div class="topbar"><span>Meu espaço <span class="breadcrumb">/</span> <strong>${titles[page][0]}</strong></span><span class="private-badge"><span></span> Seu dinheiro, com clareza</span></div>
      <div class="content">
        ${storageWarning ? `<div class="warning" role="alert">${esc(storageWarning)}</div>` : ''}
        <header class="page-header"><div><div class="eyebrow">FINANÇAS EM DIA, VIDA MAIS LEVE</div><h1>${titles[page][0]}</h1><p>${titles[page][1]}</p></div><button class="button primary" id="add-transaction">${icon('plus')} Nova transação</button></header>
        <div class="period-bar"><span>${page === 'accounts' ? 'Seu patrimônio, conta por conta' : 'Vamos acompanhar o seu mês'}</span><div class="month-picker"><button id="prev-month" aria-label="Mês anterior">${icon('chevron')}</button><span>${esc(monthLabel(selectedMonth))}</span><button id="next-month" aria-label="Próximo mês">${icon('chevron')}</button></div></div>
        ${page === 'accounts' ? accountsPage() : page === 'transactions' ? transactionsPage() : page === 'reports' ? reportsPage() : overviewPage()}
        <footer class="main-footer"><span>Mais clareza. Menos preocupação.</span><span>clara · seu próximo passo começa aqui</span></footer>
      </div>
    </main><dialog id="modal"></dialog>`;
  bindEvents();
}
function summaryCards() {
  const { income, expense, balance } = totals(monthTransactions());
  const totalBalance = state.accounts.reduce((sum, a) => sum + accountBalance(a, state.transactions), 0);
  return `<div class="summary-grid">
    <article class="summary-card balance-card"><div class="card-label">Saldo total <span>${icon('wallet')}</span></div><div class="card-value">${money(totalBalance)}</div><div class="card-note"><span class="light-dot"></span> Em ${state.accounts.length} ${state.accounts.length === 1 ? 'conta' : 'contas'}</div><span class="balance-decoration"></span></article>
    <article class="summary-card"><div class="card-label">Receitas do mês <span class="income-icon">${icon('up')}</span></div><div class="card-value">${money(income)}</div><div class="card-note">Tudo o que entrou neste mês</div></article>
    <article class="summary-card"><div class="card-label">Despesas do mês <span class="expense-icon">${icon('down')}</span></div><div class="card-value">${money(expense)}</div><div class="card-note">Tudo o que saiu neste mês</div></article>
    <article class="summary-card"><div class="card-label">Resultado do mês <span class="result-icon">${icon('chart')}</span></div><div class="card-value ${balance < 0 ? 'negative' : ''}">${money(balance)}</div><div class="card-note">Receitas menos despesas</div></article>
  </div>`;
}
function overviewPage() {
  return `${summaryCards()}<div class="analysis-grid">${flowChart()}${categoryChart()}</div><div class="bottom-grid"><section class="panel"><div class="panel-heading"><div><h2>Últimas transações</h2><p>Os movimentos mais recentes do mês</p></div><button class="text-button" data-page="transactions">Ver todas ${icon('chevron')}</button></div>${transactionList(monthTransactions().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5))}</section><section class="panel accounts-panel"><div class="panel-heading"><div><h2>Minhas contas</h2><p>Seu dinheiro bem organizado</p></div><button class="icon-button" id="add-account" aria-label="Adicionar conta">${icon('plus')}</button></div>${accountList()}<div class="account-total"><span>Saldo em todas as contas</span><strong>${money(state.accounts.reduce((s, a) => s + accountBalance(a, state.transactions), 0))}</strong></div></section></div>`;
}
function flowChart() {
  const selected = new Date(`${selectedMonth}-01T12:00:00`);
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(selected.getFullYear(), selected.getMonth() - 5 + i, 1, 12);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), ...totals(state.transactions.filter(t => monthKey(t.date) === key)) };
  });
  const max = Math.max(...months.flatMap(m => [m.income, m.expense]), 10000);
  return `<section class="panel flow-panel"><div class="panel-heading"><div><h2>Seu dinheiro em movimento</h2><p>Receitas e despesas nos últimos 6 meses</p></div><div class="legend"><span><i class="income-dot"></i>Receitas</span><span><i class="expense-dot"></i>Despesas</span></div></div><div class="bar-chart" role="img" aria-label="Comparativo mensal: ${esc(months.map(m => `${m.label}, receitas ${money(m.income)}, despesas ${money(m.expense)}`).join('; '))}"><div class="y-axis">${[1, .75, .5, .25, 0].map(n => `<span>${money(Math.round(max * n)).replace(',00', '')}</span>`).join('')}</div><div class="plot"><div class="grid-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="bar-groups">${months.map(m => `<div class="bar-group"><div class="bars"><div class="bar income-bar" style="height:${m.income / max * 100}%" title="Receitas: ${money(m.income)}"></div><div class="bar expense-bar" style="height:${m.expense / max * 100}%" title="Despesas: ${money(m.expense)}"></div></div><span>${m.label}</span></div>`).join('')}</div></div></div>${state.transactions.length ? '' : '<div class="chart-caption">Seu histórico começa com a primeira transação.</div>'}</section>`;
}
const palette = ['#296c57', '#a5bda1', '#dfb17f', '#a8b4d0', '#e2a5a0', '#d6ceaf', '#81b7b8', '#b4a0c4', '#a0a8a4'];
function categoryChart() {
  const items = categories.map(category => ({ name: category, value: monthTransactions().filter(t => t.type === 'expense' && t.category === category).reduce((s, t) => s + t.amount, 0) })).filter(c => c.value).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, c) => s + c.value, 0);
  let angle = 0;
  const stops = items.map((c, i) => { const start = angle; angle += c.value / total * 360; return `${palette[i]} ${start}deg ${angle}deg`; });
  return `<section class="panel category-panel"><div class="panel-heading"><div><h2>Para onde foi?</h2><p>Despesas por categoria</p></div><span class="subtle-icon">${icon('chart')}</span></div><div class="category-body"><div class="donut" style="background:${total ? `conic-gradient(${stops.join(',')})` : '#e9eeea'}" role="img" aria-label="Total de despesas: ${money(total)}"><div><small>Total de despesas</small><strong>${money(total)}</strong></div></div><div class="category-legend">${items.length ? items.map((c, i) => `<div><span><i style="background:${palette[i]}"></i>${esc(c.name)}</span><strong>${Math.round(c.value / total * 100)}%</strong></div>`).join('') : '<div class="category-empty">Suas categorias aparecerão aqui<br>quando você registrar uma despesa.</div>'}</div></div></section>`;
}
function transactionList(items) {
  if (!items.length) return `<div class="empty-state"><span>${icon('arrows')}</span><h3>Um novo começo para suas finanças</h3><p>Registre uma receita ou despesa<br>e veja seu dinheiro com mais clareza.</p><button class="text-button" data-new-transaction>Adicionar transação ${icon('plus')}</button></div>`;
  return `<div class="transaction-table"><div class="table-header"><span>Descrição</span><span>Data</span><span>Valor</span><span></span></div>${items.map(t => `<div class="transaction-row"><div class="transaction-description"><span class="transaction-symbol ${t.type}">${icon(t.type === 'income' ? 'up' : 'down')}</span><div><strong>${esc(t.description)}</strong><small>${esc(t.category)} <span>·</span> ${esc(state.accounts.find(a => a.id === t.accountId)?.name || '')}</small></div></div><time datetime="${t.date}">${new Date(`${t.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}</time><strong class="transaction-value ${t.type}">${t.type === 'income' ? '+' : '−'} ${money(t.amount)}</strong><div class="row-actions"><button class="icon-button" data-edit="${esc(t.id)}" aria-label="Editar ${esc(t.description)}">${icon('edit')}</button><button class="icon-button" data-delete="${esc(t.id)}" aria-label="Excluir ${esc(t.description)}">${icon('trash')}</button></div></div>`).join('')}</div>`;
}
function accountList() {
  return `<div class="account-list">${state.accounts.map((a, i) => `<div class="account-row"><span class="account-symbol" style="--account-color:${palette[i % palette.length]}">${icon('wallet')}</span><div><strong>${esc(a.name)}</strong><small>Conta pessoal</small></div><strong>${money(accountBalance(a, state.transactions))}</strong></div>`).join('')}</div>`;
}
function accountsPage() {
  return `<section class="panel"><div class="panel-heading"><div><h2>Suas contas</h2><p>Os saldos incluem todas as transações, independentemente do mês selecionado.</p></div><button class="button secondary" id="add-account">${icon('plus')} Adicionar conta</button></div>${accountList()}<div class="account-total"><span>Saldo total</span><strong>${money(state.accounts.reduce((s, a) => s + accountBalance(a, state.transactions), 0))}</strong></div></section><button class="button secondary account-export" id="account-export">${icon('download')} Exportar meus dados</button><div class="info-note">${icon('leaf')} Cadastre suas contas com o saldo inicial. As próximas receitas e despesas atualizam os saldos automaticamente.</div>`;
}
function filteredTransactions() {
  return monthTransactions().filter(t => (filter === 'all' || t.type === filter) && `${t.description} ${t.category} ${state.accounts.find(a => a.id === t.accountId)?.name}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).sort((a, b) => b.date.localeCompare(a.date));
}
function transactionsPage() {
  return `${summaryCards()}<section class="panel"><div class="panel-heading"><div><h2>Movimentos do mês</h2><p>Consulte, edite ou exclua suas transações</p></div></div><div class="table-toolbar"><label class="search-input">${icon('search')}<input id="search" type="search" placeholder="Buscar transação…" value="${esc(search)}" aria-label="Buscar transação"></label><div class="filter-tabs" aria-label="Filtrar tipo">${[['all', 'Todas'], ['income', 'Receitas'], ['expense', 'Despesas']].map(([id, label]) => `<button data-filter="${id}" class="${filter === id ? 'selected' : ''}" aria-pressed="${filter === id}">${label}</button>`).join('')}</div></div><div id="transaction-results">${transactionList(filteredTransactions())}</div></section>`;
}
function reportsPage() { return `${summaryCards()}<div class="analysis-grid">${flowChart()}${categoryChart()}</div><div class="info-note">${icon('chart')} Use o seletor de mês para explorar seu histórico. O saldo total sempre considera todas as contas e transações.</div>`; }
function changeMonth(offset) {
  const date = new Date(`${selectedMonth}-01T12:00:00`); date.setMonth(date.getMonth() + offset); selectedMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; render();
}
function bindTransactionActions() {
  document.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => transactionModal(state.transactions.find(t => t.id === el.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach(el => el.onclick = () => deleteModal(el.dataset.delete));
  document.querySelectorAll('[data-new-transaction]').forEach(el => el.onclick = () => transactionModal());
}
function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(el => el.onclick = () => { page = el.dataset.page; search = ''; filter = 'all'; render(); });
  document.querySelector('.brand').onclick = e => { e.preventDefault(); page = 'overview'; render(); };
  document.querySelector('#prev-month').onclick = () => changeMonth(-1);
  document.querySelector('#next-month').onclick = () => changeMonth(1);
  document.querySelector('#add-transaction').onclick = () => transactionModal();
  document.querySelector('#add-account')?.addEventListener('click', accountModal);
  document.querySelector('#export').onclick = exportData;
  document.querySelector('#account-export')?.addEventListener('click', exportData);
  document.querySelector('#search')?.addEventListener('input', e => { search = e.target.value; document.querySelector('#transaction-results').innerHTML = transactionList(filteredTransactions()); bindTransactionActions(); });
  document.querySelectorAll('[data-filter]').forEach(el => el.onclick = () => { filter = el.dataset.filter; render(); });
  bindTransactionActions();
}
function openModal(title, subtitle, contents) {
  const modal = document.querySelector('#modal');
  modal.innerHTML = `<div class="modal-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="icon-button" id="close-modal" aria-label="Fechar">${icon('close')}</button></div>${contents}`;
  modal.setAttribute('aria-label', title);
  modal.showModal(); modal.querySelector('#close-modal').onclick = () => modal.close();
  modal.querySelector('[data-cancel]')?.addEventListener('click', () => modal.close());
  return modal;
}
function transactionModal(transaction) {
  const t = transaction || { type: 'expense', description: '', amount: 0, category: 'Alimentação', accountId: state.accounts[0].id, date: monthKey(today()) === selectedMonth ? today() : `${selectedMonth}-01` };
  const modal = openModal(transaction ? 'Editar transação' : 'Nova transação', 'Mais um passo para organizar seu dinheiro.', `<form id="transaction-form"><div class="type-selector"><label><input type="radio" name="type" value="expense" ${t.type === 'expense' ? 'checked' : ''}>${icon('down')} Despesa</label><label><input type="radio" name="type" value="income" ${t.type === 'income' ? 'checked' : ''}>${icon('up')} Receita</label></div><label class="field">Descrição<input name="description" required maxlength="100" placeholder="Ex.: Compras do mercado" value="${esc(t.description)}"></label><div class="form-grid"><label class="field">Valor (R$)<input name="amount" inputmode="decimal" required placeholder="0,00" value="${t.amount ? (t.amount / 100).toFixed(2).replace('.', ',') : ''}"><small>Use vírgula para os centavos.</small></label><label class="field">Data<input name="date" type="date" required value="${t.date}" min="1900-01-01" max="9999-12-31"></label><label class="field">Categoria<select name="category" aria-label="Categoria">${categories.map(c => `<option ${c === t.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="field">Conta<select name="accountId" aria-label="Conta">${state.accounts.map(a => `<option value="${esc(a.id)}" ${a.id === t.accountId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label></div><p class="form-error" role="alert"></p><div class="modal-actions"><button class="button secondary" type="button" data-cancel>Cancelar</button><button class="button primary" type="submit">${icon('check')} Salvar transação</button></div></form>`);
  modal.querySelector('form').onsubmit = e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); const amount = parseAmount(data.amount);
    if (!amount || !data.description.trim()) { modal.querySelector('.form-error').textContent = 'Informe uma descrição e um valor positivo válido (ex.: 125,90).'; return; }
    const item = { ...data, description: data.description.trim(), amount, id: transaction?.id || crypto.randomUUID() };
    const next = { ...state, transactions: transaction ? state.transactions.map(t => t.id === item.id ? item : t) : [...state.transactions, item] };
    if (!validState(next)) { modal.querySelector('.form-error').textContent = 'Confira a data, a categoria e a conta selecionadas.'; return; }
    if (persist(next)) { selectedMonth = monthKey(item.date); modal.close(); render(); toast('Transação salva. Tudo organizado!'); }
  };
}
function accountModal() {
  const modal = openModal('Adicionar conta', 'Onde você guarda seu dinheiro?', `<form><label class="field">Nome da conta<input name="name" required maxlength="50" placeholder="Ex.: Banco, carteira, poupança"></label><label class="field">Saldo inicial (R$)<input name="balance" inputmode="decimal" required value="0,00"><small>Para um saldo negativo, use o sinal − antes do valor.</small></label><p class="form-error" role="alert"></p><div class="modal-actions"><button type="button" class="button secondary" data-cancel>Cancelar</button><button class="button primary">${icon('check')} Adicionar conta</button></div></form>`);
  modal.querySelector('form').onsubmit = e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); const text = data.balance.trim().replace('−', '-');
    const unsigned = text.replace(/^-/, ''); const amount = /^0([,.]0{1,2})?$/.test(unsigned) ? 0 : parseAmount(unsigned);
    if (amount === null || !data.name.trim()) { modal.querySelector('.form-error').textContent = 'Informe o nome e um saldo válido (ex.: 500,00).'; return; }
    const account = { id: crypto.randomUUID(), name: data.name.trim(), initialBalance: text.startsWith('-') ? -amount : amount };
    if (persist({ ...state, accounts: [...state.accounts, account] })) { modal.close(); render(); toast('Conta adicionada.'); }
  };
}
function deleteModal(id) {
  const t = state.transactions.find(t => t.id === id);
  const modal = openModal('Excluir transação?', 'O saldo da conta será atualizado.', `<p class="delete-description">${esc(t.description)} · ${money(t.amount)}</p><div class="modal-actions"><button class="button secondary" data-cancel>Cancelar</button><button class="button danger" id="confirm-delete">Excluir transação</button></div>`);
  modal.querySelector('#confirm-delete').onclick = () => { if (persist({ ...state, transactions: state.transactions.filter(t => t.id !== id) })) { modal.close(); render(); toast('Transação excluída.'); } };
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `clara-financas-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Seus dados foram exportados.');
}
render();
