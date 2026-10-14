import './style.css';
import { banks, money, amount, inputMoney, emptyBudget, emptyMonth, summary, validBudget, migrateLegacy } from './budget.js';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const now = new Date();
let selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
let page = 'summary';
const themeKey = 'clara-theme';
let theme = 'light';
try { if (localStorage.getItem(themeKey) === 'dark') theme = 'dark'; } catch {}
document.documentElement.dataset.theme = theme;
const key = 'clara-budget-v2';
let state = emptyBudget();
let blocked = false;
let initialMessage = '';
try {
  const saved = localStorage.getItem(key);
  if (saved) { const parsed = JSON.parse(saved); if (!validBudget(parsed)) throw new Error(); state = parsed; }
  else {
    const old = localStorage.getItem('clara-finances-v1');
    if (old) { state = migrateLegacy(JSON.parse(old)); initialMessage = 'Seus lançamentos anteriores foram mantidos: receitas no salário total e despesas na lista externa. Confira os valores deste mês.'; }
  }
} catch { blocked = true; initialMessage = 'Não foi possível ler os dados do navegador. Para proteger seus registros, novos salvamentos estão bloqueados. Exporte uma cópia antes de restaurar um backup válido.'; }
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const month = () => state.months[selectedMonth] || emptyMonth();
function save(next) {
  if (blocked) { notice('O armazenamento precisa ser recuperado antes de salvar.', true); return false; }
  if (!validBudget(next)) { notice('Confira os valores informados.', true); return false; }
  try { localStorage.setItem(key, JSON.stringify(next)); state = next; return true; }
  catch { notice('O navegador não permitiu salvar. Verifique as permissões de armazenamento.', true); return false; }
}
function saveMonth(next) { return save({ ...state, months: { ...state.months, [selectedMonth]: next } }); }
function notice(text, error = false) {
  const el = document.querySelector('#notice');
  el.textContent = text; el.className = `notice ${error ? 'error' : 'success'}`; el.hidden = false;
}
function monthTitle() { return new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('pt-BR', {month:'long',year:'numeric'}); }
const names = {summary: 'Meu mês', expenses: 'Despesas', cards: 'Meus cartões'};
function render() {
  const data = month(); const s = summary(data);
  document.querySelector('#app').innerHTML = `
  <header class="app-header"><a href="#" id="home" class="brand"><span class="logo">c</span>clara<span>.</span></a><span class="header-note">Suas finanças, sem complicação.</span><button class="theme-button" id="theme-toggle" type="button" aria-pressed="${theme === 'dark'}" aria-label="Tema escuro">${theme === 'dark' ? '☀ Tema claro' : '☾ Tema escuro'}</button><button class="backup-button" id="export">Baixar backup ↓</button></header>
  <main><div class="intro"><div><span class="eyebrow">UM PASSO DE CADA VEZ</span><h1>Seu dinheiro, organizado.</h1><p>Salário, despesas e cartões. Tudo na mesma conta.</p></div><label class="month-label">Mês de referência<input type="month" id="month" value="${selectedMonth}" min="1900-01" max="9999-12"></label></div>
  <nav aria-label="Abas financeiras">${Object.entries(names).map(([id, label]) => `<button data-page="${id}" class="${page === id ? 'active' : ''}" aria-current="${page === id ? 'page' : 'false'}">${label}</button>`).join('')}</nav>
  <div id="notice" class="notice" role="status" hidden></div>
  ${initialMessage ? `<div class="notice info">${esc(initialMessage)}</div>` : ''}
  <div class="summary-grid"><article class="stat"><span>Salário total</span><strong>${money(s.salary)}</strong><small>Valor disponível no mês</small></article><article class="stat"><span>Faturas dos cartões</span><strong>${money(s.invoices)}</strong><small>Nubank + PicPay + Santander</small></article><article class="stat"><span>Despesas externas</span><strong>${money(s.expenses)}</strong><small>Contas fora dos cartões</small></article><article class="stat highlight ${s.remaining < 0 ? 'deficit' : ''}"><span>${s.remaining < 0 ? 'Falta para fechar o mês' : 'Sobra do salário'}</span><strong>${money(Math.abs(s.remaining))}</strong><small>${s.remaining < 0 ? 'Os gastos ultrapassam seu salário' : 'Salário − faturas − despesas'}</small></article></div>
  ${page === 'summary' ? summaryPage(data, s) : page === 'expenses' ? expensesPage(data) : cardsPage(data)}
  <footer><span>Dados salvos apenas neste navegador. Faça backup regularmente.</span><button id="import">Restaurar backup</button><input id="backup-file" type="file" accept="application/json,.json" hidden></footer></main>`;
  document.querySelector('#home').onclick = e => { e.preventDefault(); page = 'summary'; render(); };
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { page = b.dataset.page; render(); });
  document.querySelector('#month').onchange = e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) { selectedMonth = e.target.value; render(); } };
  document.querySelector('#export').onclick = exportData;
  document.querySelector('#theme-toggle').onclick = event => {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    event.currentTarget.textContent = theme === 'dark' ? '☀ Tema claro' : '☾ Tema escuro';
    event.currentTarget.setAttribute('aria-pressed', String(theme === 'dark'));
    try { localStorage.setItem(themeKey, theme); }
    catch { notice('Tema alterado. O navegador não permitiu salvar a preferência.', true); }
  };
  document.querySelector('#import').onclick = () => document.querySelector('#backup-file').click();
  document.querySelector('#backup-file').onchange = importData;
  bindForms();
}
function summaryPage(data, s) {
  const percentage = data.salary > 0 ? Math.round(s.total / data.salary * 100) : null;
  return `<div class="two-columns"><section class="panel"><div class="panel-title"><span class="step">01</span><div><h2>Quanto você recebe?</h2><p>Informe o salário líquido total de ${esc(monthTitle())}.</p></div></div><form id="salary-form"><label class="field" for="salary">Salário total do mês (R$)</label><div class="salary-input"><input id="salary" name="salary" inputmode="decimal" required value="${inputMoney(data.salary)}"><button class="primary">Salvar salário</button></div><p class="help">Use o valor que realmente cai na sua conta. Ex.: 3.500,00.</p></form></section>
  <section class="panel"><div class="panel-title"><span class="step">02</span><div><h2>Como seu mês está ficando</h2><p>Uma conta simples para planejar melhor.</p></div></div><div class="calculation"><div><span>Salário total</span><strong>${money(s.salary)}</strong></div><div><span>− Faturas dos 3 cartões</span><strong>${money(s.invoices)}</strong></div><div><span>− Despesas externas</span><strong>${money(s.expenses)}</strong></div><div class="calculation-total"><span>${s.remaining < 0 ? 'Valor que falta' : 'Valor que sobra'}</span><strong class="${s.remaining < 0 ? 'red' : ''}">${money(Math.abs(s.remaining))}</strong></div></div><div class="progress-track"><span style="width:${percentage === null ? 0 : Math.min(percentage, 100)}%" class="${s.remaining < 0 ? 'over' : ''}"></span></div><p class="help">${percentage === null ? 'Salve seu salário para ver o percentual comprometido.' : `${percentage}% do salário comprometido com os gastos informados.`}</p></section></div>
  <div class="quick-actions"><button class="quick-action" data-page="expenses"><span>03</span><div><strong>Adicionar minhas despesas</strong><small>Luz, água, alimentação e outras contas</small></div><b>→</b></button><button class="quick-action" data-page="cards"><span>04</span><div><strong>Preencher meus cartões</strong><small>Limites de crédito e faturas do mês</small></div><b>→</b></button></div><div class="explanation">O limite dos cartões não entra no salário. No planejamento do mês, contamos somente o valor de cada fatura e as despesas externas.</div>`;
}
const expenseCategories = ['Luz', 'Água', 'Alimentação', 'Moradia', 'Internet', 'Transporte', 'Saúde', 'Outros'];
function expensesPage(data) {
  return `<section class="panel"><div class="panel-title"><span class="step">↗</span><div><h2>Despesas fora dos cartões</h2><p>Adicione o que você paga por Pix, dinheiro, débito ou boleto.</p></div></div><form id="expense-form" class="expense-form"><label class="field">Descrição<input name="name" maxlength="100" required placeholder="Ex.: Conta de luz"></label><label class="field">Categoria<select name="category" aria-label="Categoria">${expenseCategories.map(c => `<option>${c}</option>`).join('')}</select></label><label class="field">Valor (R$)<input name="amount" required inputmode="decimal" placeholder="150,00"></label><button class="primary">Adicionar despesa</button></form><p class="help">Uma compra que já está na fatura não deve ser adicionada aqui, para evitar contar duas vezes.</p>
  ${data.expenses.length ? `<div class="table-wrap"><table><thead><tr><th>Despesa</th><th>Categoria</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${data.expenses.map(e => `<tr><td>${esc(e.name)}</td><td><span class="category">${esc(e.category)}</span></td><td class="value">${money(e.amount)}</td><td class="row-actions"><button data-edit="${esc(e.id)}" aria-label="Editar ${esc(e.name)}">Editar</button><button data-delete="${esc(e.id)}" aria-label="Excluir ${esc(e.name)}">Excluir</button></td></tr>`).join('')}</tbody><tfoot><tr><th colspan="2">Total das despesas externas</th><td class="value">${money(summary(data).expenses)}</td><td></td></tr></tfoot></table></div>` : '<div class="empty"><span>＋</span><h3>Sua lista começa aqui</h3><p>Adicione suas contas acima. O total será calculado automaticamente.</p></div>'}</section>`;
}
function cardsPage(data) {
  return `<div class="explanation">Informe o valor total da fatura que você vai pagar neste mês. Ele será descontado do salário no resumo. Os limites são mantidos para os próximos meses; cada mês tem suas próprias faturas.</div><div class="cards-grid">${banks.map((bank, i) => {
    const limit = state.limits[bank]; const invoice = data.invoices[bank];
    return `<section class="panel bank-panel"><div class="bank-card bank-${i}"><div><strong>${bank}</strong><span>Seu cartão de crédito</span></div><span class="chip">▥</span><div class="bank-limit"><small>Limite de crédito</small><b>${money(limit)}</b></div></div><form data-bank="${bank}"><label class="field">Limite do ${bank} (R$)<input name="limit" inputmode="decimal" required value="${inputMoney(limit)}"></label><label class="field">Fatura do ${bank} neste mês (R$)<input name="invoice" inputmode="decimal" required value="${inputMoney(invoice)}"></label><button class="primary full">Salvar ${bank}</button></form><div class="card-detail"><span>Fatura / limite</span><strong>${limit ? `${Math.round(invoice / limit * 100)}%` : 'Informe o limite'}</strong></div><div class="progress-track"><span style="width:${limit ? Math.min(invoice / limit * 100, 100) : 0}%" class="${invoice > limit ? 'over' : ''}"></span></div><p class="help">${invoice > limit && limit > 0 ? 'A fatura informada ultrapassa o limite cadastrado. Confira os valores.' : 'Limite menos esta fatura: ' + money(Math.max(0, limit - invoice))}</p></section>`;
  }).join('')}</div><p class="help">O limite menos a fatura é uma estimativa. Parcelas futuras, juros e compras ainda não lançadas podem alterar o limite disponível no banco.</p>`;
}
function bindForms() {
  document.querySelector('#salary-form')?.addEventListener('submit', e => {
    e.preventDefault(); const value = amount(new FormData(e.target).get('salary'));
    if (value === null) return notice('Informe um salário válido, como 3.500,00.', true);
    if (saveMonth({ ...month(), salary: value })) { render(); notice('Salário salvo. Seu resumo foi atualizado.'); }
  });
  document.querySelector('#expense-form')?.addEventListener('submit', e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); const value = amount(data.amount);
    if (value === null || value === 0 || !data.name.trim()) return notice('Informe uma descrição e um valor maior que zero.', true);
    if (saveMonth({ ...month(), expenses: [...month().expenses, {id: uid(), name: data.name.trim(), category: data.category, amount: value}] })) { render(); notice('Despesa adicionada. O total já está atualizado.'); }
  });
  document.querySelectorAll('[data-bank]').forEach(form => form.onsubmit = e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(form)); const limit = amount(data.limit); const invoice = amount(data.invoice); const bank = form.dataset.bank;
    if (limit === null || invoice === null) return notice('Informe valores válidos para o limite e a fatura.', true);
    const nextMonth = { ...month(), invoices: { ...month().invoices, [bank]: invoice } };
    if (save({ ...state, limits: { ...state.limits, [bank]: limit }, months: { ...state.months, [selectedMonth]: nextMonth } })) { render(); notice(`${bank} salvo. Fatura incluída no resumo.`); }
  });
  document.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => {
    const item = month().expenses.find(e => e.id === b.dataset.delete);
    if (confirm(`Excluir a despesa "${item.name}" de ${money(item.amount)}?`) && saveMonth({ ...month(), expenses: month().expenses.filter(e => e.id !== item.id) })) { render(); notice('Despesa excluída.'); }
  });
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editExpense(b.dataset.edit));
}
function editExpense(id) {
  const item = month().expenses.find(e => e.id === id);
  const form = document.querySelector('#expense-form'); form.elements.name.value = item.name; form.elements.amount.value = inputMoney(item.amount);
  if (![...form.elements.category.options].some(o => o.value === item.category)) form.elements.category.add(new Option(item.category, item.category));
  form.elements.category.value = item.category;
  form.querySelector('button').textContent = 'Salvar alteração';
  let cancel = form.querySelector('.cancel');
  if (!cancel) { cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'cancel'; cancel.textContent = 'Cancelar'; form.append(cancel); }
  cancel.onclick = render;
  // Replace the form to remove its previous "add" submit listener.
  const replacement = form.cloneNode(true); form.replaceWith(replacement);
  replacement.elements.category.value = item.category;
  replacement.querySelector('.cancel').onclick = render;
  replacement.onsubmit = e => {
    e.preventDefault(); const data = Object.fromEntries(new FormData(replacement)); const value = amount(data.amount);
    if (value === null || value === 0 || !data.name.trim()) return notice('Informe uma descrição e um valor maior que zero.', true);
    if (saveMonth({ ...month(), expenses: month().expenses.map(e => e.id === id ? {...e, name: data.name.trim(), category: data.category, amount: value} : e) })) { render(); notice('Despesa atualizada.'); }
  };
  replacement.elements.name.focus();
}
function exportData() {
  const contents = blocked ? (localStorage.getItem(key) || localStorage.getItem('clara-finances-v1') || '{}') : JSON.stringify(state, null, 2);
  const url = URL.createObjectURL(new Blob([contents], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'clara-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Backup gerado. Guarde o arquivo em um lugar seguro.');
}
async function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error();
    const data = JSON.parse(await file.text());
    if (!validBudget(data)) throw new Error();
    if (!confirm('Restaurar este backup? Os registros atuais serão substituídos. Faça um backup antes, se quiser mantê-los.')) return;
    // Preserve the existing raw records before replacement, including damaged records.
    const previous = localStorage.getItem(key);
    if (previous) localStorage.setItem(`${key}-before-restore`, previous);
    localStorage.setItem(key, JSON.stringify(data)); state = data; blocked = false; initialMessage = ''; render(); notice('Backup restaurado com sucesso.');
  } catch { notice('Não foi possível restaurar. Use um backup JSON válido da nova versão e confira o armazenamento do navegador.', true); }
}
render();
