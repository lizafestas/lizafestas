/* =====================================================
   LIZA FESTAS — utils.js
   Funções utilitárias: uid, formatação, toast, log,
   máscaras, navegação, helpers gerais
   ===================================================== */

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function _hoje() {
  var d = new Date();
  var utc = d.getTime() + d.getTimezoneOffset() * 60000;
  var br = new Date(utc - 3 * 3600000);
  return br.getFullYear() + '-' + String(br.getMonth()+1).padStart(2,'0') + '-' + String(br.getDate()).padStart(2,'0');
}

function fmtDate(d) {
  if (!d) return '—';
  var p = d.split('-');
  if (p.length === 3) return p[2] + '/' + p[1] + '/' + p[0];
  return d;
}

function fmtMoney(v) {
  return 'R$ ' + parseFloat(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function pagtoLabel(p) {
  var map = {pix:'PIX', dinheiro:'Dinheiro', cartao_debito:'Débito', cartao_credito:'Crédito'};
  return map[p] || p;
}
function pagtoBadge(p) {
  var map = {pix:'badge-pix', dinheiro:'badge-dinheiro', cartao_debito:'badge-cartao', cartao_credito:'badge-cartao'};
  return map[p] || '';
}

function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

function addLog(type, msg) {
  var el = document.getElementById('log-entries');
  if (!el) return;
  var d = document.createElement('div');
  var color = type === 'ERROR' ? '#ff6b6b' : type === 'WARN' ? '#ffd93d' : '#a8d8a8';
  var time = new Date().toLocaleTimeString('pt-BR');
  d.style.cssText = 'padding:2px 0;border-bottom:1px solid #1C1C1E;color:'+color;
  d.textContent = '['+time+'] '+type+': '+msg;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  if (type === 'ERROR') { var p = document.getElementById('log-panel'); if(p) p.style.display = 'block'; }
}
function toggleLog() {
  var p = document.getElementById('log-panel');
  if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}
window.onerror = function(msg, src, line) { addLog('ERROR', msg + ' (linha ' + line + ')'); return false; };
window.onunhandledrejection = function(e) { addLog('ERROR', 'Promise: ' + (e.reason || e)); };
(function() {
  var origError = console.error.bind(console), origWarn = console.warn.bind(console), origLog = console.log.bind(console);
  console.error = function(){ addLog('ERROR', Array.prototype.join.call(arguments,' ')); origError.apply(console, arguments); };
  console.warn  = function(){ addLog('WARN',  Array.prototype.join.call(arguments,' ')); origWarn.apply(console, arguments); };
  console.log   = function(){ addLog('INFO',  Array.prototype.join.call(arguments,' ')); origLog.apply(console, arguments); };
})();

function mascaraTel(el) {
  var v = el.value.replace(/\D/g,'').substring(0,11);
  if (v.length <= 10) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3');
  else v = v.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');
  el.value = v;
}

function toggleDetail(id) {
  var detail = document.getElementById(id);
  var icon = document.getElementById('icon-' + id);
  if (!detail) return;
  var isOpen = detail.classList.contains('open');
  document.querySelectorAll('.detail-row.open').forEach(function(r){ r.classList.remove('open'); });
  document.querySelectorAll('.expand-icon.open').forEach(function(i){ i.classList.remove('open'); });
  if (!isOpen) { detail.classList.add('open'); if (icon) icon.classList.add('open'); }
}

function _agServicos(ag) {
  var todos = {};
  (ag.sessoes||[]).forEach(function(s){
    (s.servicoIds||[]).forEach(function(id){
      var sv = db.festas.find(function(x){ return x.id===id; });
      todos[sv ? sv.nome : id] = true;
    });
    if (s.servico && !(s.servicoIds && s.servicoIds.length)) todos[s.servico] = true;
  });
  var nomes = Object.keys(todos);
  return nomes.length ? nomes.join(' + ') : (ag.servicoNome || '—');
}

function setToday() {
  var today = _hoje();
  ['atend-data','dadm-data','dext-data','ag-data'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = today;
  });
}

function updateHeaderDate() {
  var el = document.getElementById('headerDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'short', year:'numeric'});
}

// ===================== NAVIGATION =====================
function showSection(id) {
  document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
  document.querySelectorAll('.nav-tab').forEach(function(t){ t.classList.remove('active'); });
  var sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(function(t) {
    var oc = t.getAttribute('onclick') || '';
    if (oc.includes("'"+id+"'") || oc.includes('"'+id+'"')) t.classList.add('active');
  });
  try { localStorage.setItem('lizafestas_secao', id); } catch(e) {}

  if (id === 'atendimentos') renderServiceChips();
  if (id === 'dashboard') renderDashboard();
  if (id === 'agenda') renderAgenda();
  if (id === 'festas') renderFestas();
  if (id === 'materiais') renderMateriais();
  if (id === 'despAdm') renderDespAdm();
  if (id === 'despExtra') renderDespExtra();
  if (id === 'temas') renderTemas();
}

function renderAll() {
  renderDashboard();
  renderFestas();
  renderMateriais();
  renderAtendimentos();
  renderDespAdm();
  renderDespExtra();
  renderTemas();
  renderAgenda();
  updateBadges();
}

function updateBadges() {
  var _set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
  _set('badgeAtend',     db.atendimentos.length);
  _set('badgeAtend2',    db.atendimentos.length);
  _set('badgeServ',      db.festas.length);
  _set('badgeMat',       db.materiais.length);
  _set('badgeDespAdm',   db.despAdm.length);
  _set('badgeDespExtra', db.despExtra.length);
  _set('badgeTemas',     (db.temas||[]).length);
  _set('badgeAgenda',    db.agenda.length);
}

function toggleSidebar() {
  var sb = document.getElementById('appSidebar');
  var ac = document.querySelector('.app-content');
  if (!sb || !ac) return;
  sb.classList.toggle('mini');
  ac.classList.toggle('mini');
  localStorage.setItem('lizafestas_sidebar_mini', sb.classList.contains('mini') ? '1' : '0');
}
function toggleDrawer() {
  var sidebar = document.getElementById('appSidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var btn = document.getElementById('btnHamburger');
  if (!sidebar) return;
  var aberto = sidebar.classList.contains('drawer-aberto');
  sidebar.classList.toggle('drawer-aberto', !aberto);
  if (overlay) overlay.classList.toggle('ativo', !aberto);
  if (btn) btn.classList.toggle('aberto', !aberto);
}
function fecharDrawer() {
  var sidebar = document.getElementById('appSidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var btn = document.getElementById('btnHamburger');
  if (sidebar) sidebar.classList.remove('drawer-aberto');
  if (overlay) overlay.classList.remove('ativo');
  if (btn) btn.classList.remove('aberto');
}
