import './style.css';
import { banks, money, amount, inputMoney, emptyTrackingBudget as emptyBudget, emptyTrackingMonth as emptyMonth, trackingMonth, monthlySummary, obligations, invoiceTotal, scheduledInvoice, paidFor, installmentNumber, validTrackingBudget as validBudget, upgradeBudget, migrateLegacy } from './budget.js';
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now = new Date();
let selectedMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
let page = 'summary';
let editingExpense = null;
const themeKey = 'clara-theme';
let theme = 'light';
try { if(localStorage.getItem(themeKey)==='dark') theme='dark'; } catch {}
document.documentElement.dataset.theme=theme;
const key='clara-budget-v3';
let state=emptyBudget();
let blocked=false;
let initialMessage='';
try {
  const saved=localStorage.getItem(key);
  if(saved) { state=JSON.parse(saved); if(!validBudget(state)) throw new Error(); }
  else {
    const old=localStorage.getItem('clara-budget-v2');
    const legacy=localStorage.getItem('clara-finances-v1');
    if(old || legacy) {
      state=upgradeBudget(old ? JSON.parse(old) : migrateLegacy(JSON.parse(legacy)));
      if(!validBudget(state)) throw new Error();
      initialMessage='Seus valores anteriores foram preservados. Registre os pagamentos que já fez e as entradas que já recebeu para atualizar o saldo atual.';
    }
  }
} catch { blocked=true; initialMessage='Não foi possível ler os dados. Novos salvamentos estão bloqueados para proteger seus registros. Baixe um backup antes de restaurar um arquivo válido.'; }
const uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const month=()=>trackingMonth(state,selectedMonth);
function save(next) {
  if(blocked) { notice('Recupere o armazenamento antes de salvar.',true); return false; }
  if(!validBudget(next)) { notice('Confira os valores. Pagamentos não podem ultrapassar a conta; salário e adiantamentos não podem superar o salário total informado.',true); return false; }
  try { localStorage.setItem(key,JSON.stringify(next));state=next;return true; }
  catch { notice('O navegador não permitiu salvar. Confira o armazenamento.',true);return false; }
}
function saveMonth(next) { return save({...state,months:{...state.months,[selectedMonth]:next}}); }
function notice(text,error=false) { const el=document.querySelector('#notice');el.textContent=text;el.className=`notice ${error?'error':'success'}`;el.hidden=false; }
function done(text) { render();notice(text); }
const monthTitle=()=>new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const defaultDate=()=> {const day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;return day.startsWith(selectedMonth)?day:`${selectedMonth}-01`;};
const dateLabel=date=>new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');
const names={summary:'Meu mês',incomes:'Entradas',expenses:'Despesas',cards:'Meus cartões',payments:'Pagamentos'};
function render() {
  const data=month();const s=monthlySummary(state,selectedMonth);
  document.querySelector('#app').innerHTML=`
  <header class="app-header"><a href="#" id="home" class="brand"><span class="logo">c</span>clara<span>.</span></a><span class="header-note">Saiba o que entrou, o que saiu e o que falta.</span><button class="theme-button" id="theme-toggle" type="button" aria-pressed="${theme==='dark'}" aria-label="Tema escuro">${theme==='dark'?'☀ Tema claro':'☾ Tema escuro'}</button><button class="backup-button" id="export">Baixar backup ↓</button></header>
  <main><div class="intro"><div><span class="eyebrow">UM PASSO DE CADA VEZ</span><h1>Seu dinheiro, organizado.</h1><p>Planeje o mês e acompanhe cada pagamento.</p></div><label class="month-label">Mês de referência<input type="month" id="month" value="${selectedMonth}" min="1900-01" max="9999-12"></label></div>
  <nav aria-label="Abas financeiras">${Object.entries(names).map(([id,label])=>`<button data-page="${id}" class="${page===id?'active':''}" aria-current="${page===id?'page':'false'}">${label}</button>`).join('')}</nav>
  <div id="notice" class="notice" role="status" hidden></div>${initialMessage?`<div class="notice info">${esc(initialMessage)}</div>`:''}
  <div class="summary-grid"><article class="stat ${s.cash<0?'cash-warning':''}"><span>Saldo disponível agora</span><strong>${money(s.cash)}</strong><small>Saldo inicial + recebido − pago</small></article><article class="stat"><span>Já foi pago</span><strong>${money(s.paid)}</strong><small>Pagamentos registrados no mês</small></article><article class="stat"><span>Ainda falta pagar</span><strong>${money(s.pending)}</strong><small>Despesas e faturas em aberto</small></article><article class="stat highlight"><span>Reservar do salário</span><strong>${money(s.reserve)}</strong><small>Falta pagar − saldo atual positivo</small></article></div>
  ${s.cash<0?'<div class="notice error">Os pagamentos registrados superam o dinheiro recebido e o saldo inicial. Confira as entradas ou o saldo do início do mês.</div>':''}
  ${page==='summary'?summaryPage(data,s):page==='incomes'?incomesPage(data):page==='expenses'?expensesPage(data):page==='cards'?cardsPage(data):paymentsPage(data)}
  <footer><span>Dados salvos neste navegador. Faça backup regularmente.</span><button id="import">Restaurar backup</button><input id="backup-file" type="file" accept="application/json,.json" hidden></footer></main><dialog id="payment-dialog"></dialog>`;
  document.querySelector('#home').onclick=e=>{e.preventDefault();page='summary';editingExpense=null;render();};
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;editingExpense=null;render();});
  document.querySelector('#month').onchange=e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)){selectedMonth=e.target.value;editingExpense=null;render();}};
  document.querySelector('#theme-toggle').onclick=e=>{theme=theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;e.currentTarget.textContent=theme==='dark'?'☀ Tema claro':'☾ Tema escuro';e.currentTarget.setAttribute('aria-pressed',String(theme==='dark'));try{localStorage.setItem(themeKey,theme);}catch{notice('Tema alterado, mas a preferência não pôde ser salva.',true);}};
  document.querySelector('#export').onclick=exportData;
  document.querySelector('#import').onclick=()=>document.querySelector('#backup-file').click();
  document.querySelector('#backup-file').onchange=importData;
  bindForms();
}
function summaryPage(data,s) {
  return `<div class="two-columns"><section class="panel"><div class="panel-title"><span class="step">01</span><div><h2>Planejamento do salário</h2><p>Salário total de ${esc(monthTitle())}, incluindo adiantamentos.</p></div></div><form id="salary-form"><label class="field" for="salary">Salário total do mês (R$)</label><div class="salary-input"><input id="salary" name="salary" inputmode="decimal" required value="${inputMoney(data.salary)}"><button class="primary">Salvar salário</button></div><p class="help">Salário previsto não é dinheiro recebido. Na aba Entradas, registre cada depósito como salário/adiantamento ou dinheiro extra.</p></form><form id="opening-form" class="opening-form"><label class="field">Dinheiro que já tinha no início do mês (R$)<input name="opening" inputmode="decimal" required value="${inputMoney(data.openingCash)}"></label><button class="primary">Salvar saldo inicial</button></form></section>
  <section class="panel"><div class="panel-title"><span class="step">02</span><div><h2>Quando o salário cair</h2><p>O que precisa ser separado para fechar o mês.</p></div></div><div class="calculation"><div><span>Salário ainda a receber</span><strong>${money(s.salaryPending)}</strong></div><div><span>Contas e faturas em aberto</span><strong>${money(s.pending)}</strong></div><div><span>Dinheiro disponível agora</span><strong>${money(Math.max(0,s.cash))}</strong></div><div class="calculation-total"><span>Reservar do salário</span><strong>${money(s.reserve)}</strong></div><div><span>${s.salaryPending-s.reserve<0?'Falta além do salário':'Sobra do salário a receber'}</span><strong class="${s.salaryPending-s.reserve<0?'red':''}">${money(Math.abs(s.salaryPending-s.reserve))}</strong></div></div><p class="help">A reserva considera usar seu saldo atual para as contas. Entradas futuras só reduzem essa reserva depois de confirmadas como recebidas.</p><div class="projection"><span>Resultado previsto do mês</span><strong class="${s.remaining<0?'red':''}">${money(s.remaining)}</strong><p class="help">Saldo inicial + salário total + extras recebidos ou previstos − todos os gastos. Salário e adiantamento não são contados duas vezes.</p></div></section></div>
  <div class="quick-actions"><button class="quick-action" data-page="incomes"><span>＋</span><div><strong>Registrar dinheiro que entra</strong><small>Recebido ou previsto, com conta e data</small></div><b>→</b></button><button class="quick-action" data-page="payments"><span>✓</span><div><strong>Registrar o que já paguei</strong><small>Pagamento total ou parcial de cada conta</small></div><b>→</b></button></div><section class="panel pending-panel"><h2>Contas para pagar</h2>${obligationTable()}</section>`;
}
function incomesPage(data) {
  return `<section class="panel"><div class="panel-title"><span class="step">＋</span><div><h2>Dinheiro que entra</h2><p>Registre o valor, a conta e quando ele entrou ou vai entrar.</p></div></div><form id="income-form" class="entry-form"><label class="field">Descrição da entrada<input name="name" required maxlength="100" placeholder="Ex.: Trabalho extra"></label><label class="field">Valor da entrada (R$)<input name="amount" required inputmode="decimal" placeholder="300,00"></label><label class="field">Conta de recebimento<input name="account" required maxlength="60" placeholder="Ex.: PicPay"></label><label class="field">Data da entrada<input name="date" type="date" required value="${defaultDate()}"></label><label class="field">Tipo de entrada<select name="kind" aria-label="Tipo de entrada"><option value="extra">Dinheiro extra</option><option value="salary">Salário / adiantamento</option></select></label><label class="field">Situação da entrada<select name="status" aria-label="Situação da entrada"><option value="received">Já recebi</option><option value="expected">Vou receber</option></select></label><button class="primary">Adicionar entrada</button></form><p class="help">Adiantamento faz parte do salário total e reduz o salário que falta receber. Dinheiro extra é uma renda além do salário. Use a data dentro do mês selecionado.</p>
  ${data.incomes.length?`<div class="table-wrap"><table><thead><tr><th>Entrada / conta</th><th>Data</th><th>Situação</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${data.incomes.map(i=>`<tr><td>${esc(i.name)}<small class="cell-note">${esc(i.account)} · ${i.kind==='salary'?'Salário/adiantamento':'Extra'}</small></td><td>${dateLabel(i.date)}</td><td><span class="status ${i.status==='received'?'paid':'waiting'}">${i.status==='received'?'Recebida':'Prevista'}</span></td><td class="value">${money(i.amount)}</td><td class="row-actions"><button data-income-toggle="${esc(i.id)}">${i.status==='received'?'Marcar prevista':'Confirmar recebimento'}</button><button data-income-delete="${esc(i.id)}" aria-label="Excluir entrada ${esc(i.name)}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><h3>Registre sua primeira entrada</h3><p>Valores previstos ficam separados do saldo recebido.</p></div>'}</section>`;
}
const expenseCategories=['Luz','Água','Alimentação','Moradia','Internet','Transporte','Saúde','Outros'];
function expensesPage(data) {
  const edit=data.expenses.find(e=>e.id===editingExpense);
  const options=[...new Set([...expenseCategories,...(edit?[edit.category]:[])])];
  return `<section class="panel"><div class="panel-title"><span class="step">↗</span><div><h2>Despesas fora dos cartões</h2><p>Contas pagas por Pix, dinheiro, débito ou boleto.</p></div></div><form id="expense-form" class="expense-form"><label class="field">Descrição<input name="name" required maxlength="100" placeholder="Ex.: Conta de luz" value="${esc(edit?.name||'')}"></label><label class="field">Categoria<select name="category" aria-label="Categoria">${options.map(c=>`<option ${edit?.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label class="field">Valor (R$)<input name="amount" required inputmode="decimal" placeholder="150,00" value="${edit?inputMoney(edit.amount):''}"></label><button class="primary">${edit?'Salvar alteração':'Adicionar despesa'}</button>${edit?'<button class="cancel" type="button" id="cancel-edit">Cancelar</button>':''}</form><p class="help">Compras incluídas na fatura não entram aqui. Registre os pagamentos na lista abaixo; pagar uma conta não cria outra despesa.</p>
  ${data.expenses.length?`<div class="table-wrap"><table><thead><tr><th>Despesa</th><th>Total</th><th>Pago</th><th>Falta</th><th>Ações</th></tr></thead><tbody>${data.expenses.map(e=>{const paid=paidFor(data,'expense',e.id);return `<tr><td>${esc(e.name)}<small class="cell-note">${esc(e.category)}</small></td><td class="value">${money(e.amount)}</td><td class="value">${money(paid)}</td><td class="value">${money(e.amount-paid)}</td><td class="row-actions">${payButton('expense',e.id,e.amount-paid)}<button data-edit="${esc(e.id)}" aria-label="Editar ${esc(e.name)}">Editar</button><button data-delete="${esc(e.id)}" aria-label="Excluir ${esc(e.name)}">Excluir</button></td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty"><h3>Sua lista começa aqui</h3><p>Cadastre suas despesas e acompanhe o que falta pagar.</p></div>'}</section>`;
}
const payButton=(type,target,pending)=>pending>0?`<button class="pay-button" data-pay-type="${type}" data-pay-target="${esc(target)}" aria-label="Pagar ${type==='card'?'fatura '+target:esc(month().expenses.find(e=>e.id===target)?.name||'despesa')}">Pagar</button>`:'<span class="status paid">Pago ✓</span>';
function obligationTable() {
  const items=obligations(state,selectedMonth).filter(i=>i.total>0);
  return items.length?`<div class="table-wrap"><table><thead><tr><th>Conta</th><th>Total</th><th>Já pago</th><th>Falta pagar</th><th>Ação</th></tr></thead><tbody>${items.map(i=>`<tr><td>${esc(i.name)}</td><td class="value">${money(i.total)}</td><td class="value">${money(i.paid)}</td><td class="value">${money(i.pending)}</td><td class="row-actions">${payButton(i.type,i.target,i.pending)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>Cadastre despesas e faturas para acompanhar os pagamentos.</p></div>';
}
function cardsPage(data) {
  return `<div class="explanation">Limite total, utilizado e disponível são dados diferentes. Copie o disponível do app do banco: pagamentos, parcelas futuras e outros lançamentos podem alterar esse valor. O app não muda seu limite automaticamente ao registrar um pagamento.</div><div class="cards-grid">${banks.map((bank,i)=>{
    const credit=state.credit[bank];const total=invoiceTotal(state,selectedMonth,bank);const paid=paidFor(data,'card',bank);const scheduled=scheduledInvoice(state,selectedMonth,bank);
    return `<section class="panel bank-panel"><div class="bank-card bank-${i}"><div><strong>${bank}</strong><span>Seu cartão de crédito</span></div><span class="chip">▥</span><div class="bank-limit"><small>Disponível informado pelo banco</small><b>${credit.available===null?'Não informado':money(credit.available)}</b></div></div><form data-bank="${bank}"><label class="field">Limite total do ${bank} (R$)<input name="limit" required inputmode="decimal" value="${inputMoney(state.limits[bank])}"></label><label class="field">Crédito utilizado do ${bank} (R$)<input name="used" inputmode="decimal" placeholder="Valor no app do banco" value="${credit.used===null?'':inputMoney(credit.used)}"></label><label class="field">Limite disponível do ${bank} (R$)<input name="available" inputmode="decimal" placeholder="Valor no app do banco" value="${credit.available===null?'':inputMoney(credit.available)}"></label><label class="field">Fatura total do ${bank} neste mês (R$)<input name="invoice" inputmode="decimal" required value="${inputMoney(total)}" ></label><label class="checkbox-label"><input name="automatic" type="checkbox" ${!data.invoiceManual[bank]?'checked':''}> Usar parcelas previstas como fatura</label><button class="primary full">Salvar ${bank}</button></form><div class="card-detail"><span>Limite total</span><strong>${money(state.limits[bank])}</strong></div><div class="card-detail"><span>Crédito utilizado informado</span><strong>${credit.used===null?'Não informado':money(credit.used)}</strong></div><div class="card-detail"><span>Fatura ${data.invoiceManual[bank]?'informada':'prevista'}</span><strong>${money(total)}</strong></div><div class="card-detail"><span>Pago nesta fatura</span><strong>${money(paid)}</strong></div><div class="card-detail"><span>Ainda falta pagar</span><strong>${money(total-paid)}</strong></div><div class="card-payment">${payButton('card',bank,total-paid)}</div><p class="help">Parcelas cadastradas neste mês: ${money(scheduled)}. ${data.invoiceManual[bank]?'Já fazem parte da fatura total informada; não são somadas novamente.':'O total previsto inclui apenas as parcelas cadastradas. Confira outras compras na fatura do banco.'}</p></section>`;
  }).join('')}</div>${installmentsPage()}`;
}
function installmentsPage() {
  return `<section class="panel pending-panel"><div class="panel-title"><span class="step">↻</span><div><h2>Parcelas e gastos fixos por um período</h2><p>Preveja uma cobrança mensal do cartão por um número de meses.</p></div></div><form id="installment-form" class="entry-form"><label class="field">Descrição da parcela<input name="name" required maxlength="100" placeholder="Ex.: Celular ou assinatura"></label><label class="field">Cartão da parcela<select name="bank" aria-label="Cartão da parcela">${banks.map(b=>`<option>${b}</option>`).join('')}</select></label><label class="field">Valor mensal da parcela (R$)<input name="amount" required inputmode="decimal" placeholder="120,00"></label><label class="field">Primeiro mês da previsão<input name="start" type="month" required value="${selectedMonth}" min="1900-01" max="9999-12"></label><label class="field">Quantidade de meses<input name="count" type="number" min="1" max="600" required value="6"></label><button class="primary">Adicionar parcela</button></form><p class="help">Se a compra já começou, informe o mês da próxima parcela e quantos meses ainda faltam. A previsão é automática nesses meses. Ao informar a fatura total do banco, ela substitui a previsão, sem duplicar as parcelas.</p>
  ${state.installments.length?`<div class="table-wrap"><table><thead><tr><th>Cobrança</th><th>Por mês</th><th>Prazo</th><th>Neste mês</th><th>Ação</th></tr></thead><tbody>${state.installments.map(p=>{const number=installmentNumber(p,selectedMonth);return `<tr><td>${esc(p.name)}<small class="cell-note">${p.bank}</small></td><td class="value">${money(p.amount)}</td><td>${p.count} meses · desde ${p.start.split('-').reverse().join('/')}</td><td>${number?`Parcela ${number}/${p.count} · ${p.count-number+1} ainda previstas`:'Fora do período'}</td><td class="row-actions"><button data-plan-delete="${esc(p.id)}" aria-label="Remover previsão ${esc(p.name)}">Remover previsão</button></td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty"><p>Cadastre suas parcelas para enxergar os próximos meses.</p></div>'}</section>`;
}
function paymentsPage(data) {
  return `<section class="panel"><h2>O que falta pagar</h2><p class="help">Clique em Pagar para registrar um valor total ou parcial. O saldo diminui e a conta em aberto também.</p>${obligationTable()}</section><section class="panel pending-panel"><h2>Histórico de pagamentos</h2>${data.payments.length?`<div class="table-wrap"><table><thead><tr><th>Pagamento</th><th>Data</th><th>Valor</th><th>Ação</th></tr></thead><tbody>${[...data.payments].sort((a,b)=>b.date.localeCompare(a.date)).map(p=>`<tr><td>${esc(p.type==='card'?'Fatura '+p.target:data.expenses.find(e=>e.id===p.target)?.name||'Despesa')}</td><td>${dateLabel(p.date)}</td><td class="value">${money(p.amount)}</td><td class="row-actions"><button data-payment-delete="${esc(p.id)}" aria-label="Estornar pagamento ${esc(p.id)}">Estornar registro</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><p>Os pagamentos que você registrar aparecerão aqui.</p></div>'}<p class="help">Estornar registro corrige somente esta planilha. Não desfaz um pagamento no banco.</p></section>`;
}
function bindForms() {
  document.querySelector('#salary-form')?.addEventListener('submit',e=>{e.preventDefault();const v=amount(new FormData(e.target).get('salary'));if(v===null)return notice('Informe um salário válido.',true);if(saveMonth({...month(),salary:v}))done('Salário salvo.');});
  document.querySelector('#opening-form')?.addEventListener('submit',e=>{e.preventDefault();const v=amount(new FormData(e.target).get('opening'));if(v===null)return notice('Informe um saldo inicial válido.',true);if(saveMonth({...month(),openingCash:v}))done('Saldo inicial salvo.');});
  document.querySelector('#expense-form')?.addEventListener('submit',e=>{
    e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const v=amount(d.amount);
    if(!v || !d.name.trim())return notice('Informe descrição e valor maior que zero.',true);
    if(editingExpense && v<paidFor(month(),'expense',editingExpense))return notice('O valor não pode ser menor que o já pago. Corrija os registros de pagamento primeiro.',true);
    const item={id:editingExpense||uid(),name:d.name.trim(),category:d.category,amount:v};
    const expenses=editingExpense?month().expenses.map(e=>e.id===editingExpense?item:e):[...month().expenses,item];
    if(saveMonth({...month(),expenses})){editingExpense=null;done('Despesa salva.');}
  });
  document.querySelector('#cancel-edit')?.addEventListener('click',()=>{editingExpense=null;render();});
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editingExpense=b.dataset.edit;render();document.querySelector('#expense-form input').focus();});
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{
    if(paidFor(month(),'expense',b.dataset.delete)>0)return notice('Esta despesa tem pagamentos. Estorne os registros na aba Pagamentos antes de excluir.',true);
    if(confirm('Excluir esta despesa?') && saveMonth({...month(),expenses:month().expenses.filter(e=>e.id!==b.dataset.delete)})){editingExpense=null;done('Despesa excluída.');}
  });
  document.querySelector('#income-form')?.addEventListener('submit',e=>{
    e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const v=amount(d.amount);
    if(!v || !d.name.trim() || !d.account.trim())return notice('Informe descrição, conta e valor positivo.',true);
    if(!d.date.startsWith(selectedMonth))return notice('A data precisa estar dentro do mês selecionado.',true);
    if(d.kind==='salary' && month().incomes.filter(i=>i.kind==='salary').reduce((sum,i)=>sum+i.amount,0)+v>month().salary)return notice('Salve primeiro o salário total do mês. Salário e adiantamentos não podem ultrapassar esse total.',true);
    if(saveMonth({...month(),incomes:[...month().incomes,{...d,id:uid(),name:d.name.trim(),account:d.account.trim(),amount:v}]}))done('Entrada registrada. Apenas valores recebidos entram no saldo atual.');
  });
  document.querySelectorAll('[data-income-toggle]').forEach(b=>b.onclick=()=>{if(saveMonth({...month(),incomes:month().incomes.map(i=>i.id===b.dataset.incomeToggle?{...i,status:i.status==='received'?'expected':'received'}:i)}))done('Situação da entrada atualizada.');});
  document.querySelectorAll('[data-income-delete]').forEach(b=>b.onclick=()=>{if(confirm('Excluir esta entrada? O saldo será recalculado.') && saveMonth({...month(),incomes:month().incomes.filter(i=>i.id!==b.dataset.incomeDelete)}))done('Entrada excluída.');});
  document.querySelectorAll('[data-bank]').forEach(form=>{
    form.elements.automatic.onchange=()=>{if(form.elements.automatic.checked)form.elements.invoice.value=inputMoney(scheduledInvoice(state,selectedMonth,form.dataset.bank));};
    form.elements.invoice.oninput=()=>{form.elements.automatic.checked=false;};
    form.onsubmit=e=>{
      e.preventDefault();const d=Object.fromEntries(new FormData(form));const bank=form.dataset.bank;
      const limit=amount(d.limit);const used=d.used.trim()===''?null:amount(d.used);const available=d.available.trim()===''?null:amount(d.available);const manual=!form.elements.automatic.checked;const invoice=manual?amount(d.invoice):month().invoices[bank];
      if(limit===null || (d.used.trim()!=='' && used===null) || (d.available.trim()!=='' && available===null) || invoice===null)return notice('Confira os valores do cartão. Use vírgula nos centavos.',true);
      const next={...state,limits:{...state.limits,[bank]:limit},credit:{...state.credit,[bank]:{used,available}},months:{...state.months,[selectedMonth]:{...month(),invoiceManual:{...month().invoiceManual,[bank]:manual},invoices:{...month().invoices,[bank]:invoice}}}};
      if(invoiceTotal(next,selectedMonth,bank)<paidFor(month(),'card',bank))return notice('A fatura não pode ser menor que os pagamentos já registrados.',true);
      if(save(next))done(`${bank} atualizado. O disponível informado foi mantido separado da fatura.`);
    };
  });
  document.querySelector('#installment-form')?.addEventListener('submit',e=>{
    e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const v=amount(d.amount);const count=Number(d.count);
    if(!v || !d.name.trim() || !Number.isInteger(count) || count<1 || count>600)return notice('Informe descrição, valor positivo e quantidade válida de meses.',true);
    if(save({...state,installments:[...state.installments,{id:uid(),name:d.name.trim(),bank:d.bank,amount:v,start:d.start,count}]}))done('Previsão cadastrada. Faturas totais informadas não serão somadas às parcelas.');
  });
  document.querySelectorAll('[data-plan-delete]').forEach(b=>b.onclick=()=>{
    if(!confirm('Remover esta previsão dos meses sem fatura total informada? Meses com pagamentos mantêm o total atual da fatura.'))return;
    const plan=state.installments.find(p=>p.id===b.dataset.planDelete);const months={...state.months};
    for(const [key,m] of Object.entries(months))if(!m.invoiceManual[plan.bank] && paidFor(m,'card',plan.bank)>0)months[key]={...m,invoices:{...m.invoices,[plan.bank]:invoiceTotal(state,key,plan.bank)},invoiceManual:{...m.invoiceManual,[plan.bank]:true}};
    if(save({...state,months,installments:state.installments.filter(p=>p.id!==plan.id)}))done('Previsão removida. Registros de pagamento preservados.');
  });
  document.querySelectorAll('[data-pay-type]').forEach(b=>b.onclick=()=>paymentModal(b.dataset.payType,b.dataset.payTarget));
  document.querySelectorAll('[data-payment-delete]').forEach(b=>b.onclick=()=>{if(confirm('Estornar este registro na planilha? O saldo e a conta em aberto serão recalculados.') && saveMonth({...month(),payments:month().payments.filter(p=>p.id!==b.dataset.paymentDelete)}))done('Registro estornado.');});
}
function paymentModal(type,target) {
  const item=obligations(state,selectedMonth).find(i=>i.type===type && i.target===target);
  const dialog=document.querySelector('#payment-dialog');
  dialog.innerHTML=`<form id="payment-form"><h2>Registrar pagamento</h2><p>${esc(item.name)} · falta ${money(item.pending)}</p><label class="field">Valor do pagamento (R$)<input name="amount" required inputmode="decimal" value="${inputMoney(item.pending)}"></label><label class="field">Data do pagamento<input name="date" type="date" required value="${defaultDate()}"></label><p class="help">Você pode pagar só uma parte. Este registro não faz transferências no banco.</p><p class="payment-error red" role="alert"></p><div class="modal-actions"><button type="button" class="cancel" id="cancel-payment">Cancelar</button><button class="primary">Confirmar pagamento</button></div></form>`;
  dialog.setAttribute('aria-label',`Pagar ${item.name}`);dialog.showModal();
  dialog.querySelector('#cancel-payment').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=e=>{
    e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const v=amount(d.amount);
    if(!v || v>item.pending || !d.date.startsWith(selectedMonth)){dialog.querySelector('.payment-error').textContent='Use um valor positivo até o saldo da conta e uma data dentro do mês selecionado.';return;}
    if(saveMonth({...month(),payments:[...month().payments,{id:uid(),type,target,amount:v,date:d.date}]})){dialog.close();done('Pagamento registrado. Saldo e valor em aberto atualizados.');}
  };
}
function exportData() {
  let contents;
  try { contents=blocked?(localStorage.getItem(key)||localStorage.getItem('clara-budget-v2')||localStorage.getItem('clara-finances-v1')||'{}'):JSON.stringify(state,null,2); }
  catch{return notice('Não foi possível acessar os registros para exportação.',true);}
  const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='clara-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Backup gerado.');
}
async function importData(event) {
  const file=event.target.files[0];if(!file)return;
  try {
    if(file.size>5_000_000)throw new Error();const data=upgradeBudget(JSON.parse(await file.text()));if(!validBudget(data))throw new Error();
    if(!confirm('Restaurar este backup e substituir os dados atuais? Baixe um backup antes, se quiser mantê-los.'))return;
    const old=localStorage.getItem(key);if(old)localStorage.setItem(`${key}-before-restore`,old);
    localStorage.setItem(key,JSON.stringify(data));state=data;blocked=false;initialMessage='';editingExpense=null;done('Backup restaurado com sucesso.');
  }catch{notice('Não foi possível restaurar. Use um backup válido e confira o armazenamento do navegador.',true);}
}
render();
