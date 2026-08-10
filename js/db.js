/* =====================================================
   LIZA FESTAS — db.js
   Objeto db em memória + sincronização por tabela
   ===================================================== */

let db = {
  festas: [],
  materiais: [],
  atendimentos: [],
  despAdm: [],
  despExtra: [],
  agenda: [],
  temas: []
};

let currentPeriod = 'hoje';

function _supaHeaders(extra) {
  return Object.assign({
    'Content-Type': 'application/json',
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY
  }, extra || {});
}

async function _supaSelect(tabela) {
  var resp = await fetch(SUPA_URL + '/rest/v1/' + tabela + '?select=*', { headers: _supaHeaders() });
  if (!resp.ok) throw new Error(tabela + ': HTTP ' + resp.status);
  return await resp.json();
}

// Carga leve de temas — SEM a coluna fotos (evita baixar imagens ao entrar na aba)
async function _supaSelectTemasLeve() {
  var resp = await fetch(SUPA_URL + '/rest/v1/temas?select=id,nome,descricao,festa_ids', { headers: _supaHeaders() });
  if (!resp.ok) throw new Error('temas: HTTP ' + resp.status);
  return await resp.json();
}

// Busca as fotos de UM tema específico, só quando solicitado (botão "Ver Fotos"/"Enviar")
async function supaBuscarFotosTema(id) {
  var resp = await fetch(SUPA_URL + '/rest/v1/temas?id=eq.' + encodeURIComponent(id) + '&select=fotos', { headers: _supaHeaders() });
  if (!resp.ok) throw new Error('fotos tema: HTTP ' + resp.status);
  var rows = await resp.json();
  return (rows && rows[0] && rows[0].fotos) || [];
}

async function _supaInsert(tabela, registro) {
  var resp = await fetch(SUPA_URL + '/rest/v1/' + tabela, {
    method: 'POST', headers: _supaHeaders({ 'Prefer': 'return=minimal' }), body: JSON.stringify(registro)
  });
  if (!resp.ok) throw new Error(tabela + ' insert: HTTP ' + resp.status);
}
async function _supaUpdate(tabela, id, campos) {
  var resp = await fetch(SUPA_URL + '/rest/v1/' + tabela + '?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH', headers: _supaHeaders({ 'Prefer': 'return=minimal' }), body: JSON.stringify(campos)
  });
  if (!resp.ok) throw new Error(tabela + ' update: HTTP ' + resp.status);
}
async function _supaDelete(tabela, id) {
  var resp = await fetch(SUPA_URL + '/rest/v1/' + tabela + '?id=eq.' + encodeURIComponent(id), {
    method: 'DELETE', headers: _supaHeaders({ 'Prefer': 'return=minimal' })
  });
  if (!resp.ok) throw new Error(tabela + ' delete: HTTP ' + resp.status);
}

var _TABELAS = {
  festas: 'festas', materiais: 'materiais', atendimentos: 'atendimentos',
  despAdm: 'desp_adm', despExtra: 'desp_extra', agenda: 'agenda', temas: 'temas'
};

async function loadData() {
  var raw = localStorage.getItem('lizafestas_db');
  if (raw) { try { db = JSON.parse(raw); } catch(e) {} }
  ['festas','materiais','atendimentos','despAdm','despExtra','agenda','temas'].forEach(k => { if (!db[k]) db[k] = []; });

  try {
    _atualizarStatusSync('carregando');
    const [festas, materiais, atendimentos, despAdm, despExtra, agenda, temas] = await Promise.all([
      _supaSelect('festas'), _supaSelect('materiais'), _supaSelect('atendimentos'),
      _supaSelect('desp_adm'), _supaSelect('desp_extra'), _supaSelect('agenda'), _supaSelectTemasLeve()
    ]);

    db.festas = festas.map(_fromRowFesta);
    db.materiais = materiais.map(_fromRowMaterial);
    db.atendimentos = atendimentos.map(_fromRowAtendimento);
    db.despAdm = despAdm.map(_fromRowDespAdm);
    db.despExtra = despExtra.map(_fromRowDespExtra);
    db.agenda = agenda.map(_fromRowAgenda);
    db.temas = temas.map(_fromRowTema);

    // Fotos de temas não vão pro cache local (base64 é pesado — só localStorage.setItem já quebra com dezenas de fotos).
    // Elas continuam sendo buscadas sob demanda do Supabase (ver supaBuscarFotosTema).
    try {
      localStorage.setItem('lizafestas_db', JSON.stringify(_dbParaCache()));
    } catch(cacheErr) {
      addLog('WARN', '⚠️ Cache local não pôde ser salvo (armazenamento cheio) — dados seguem sincronizados no Supabase normalmente.');
    }
    var now = new Date().toLocaleString('pt-BR');
    localStorage.setItem('lizafestas_lastsync', now);
    _atualizarStatusSync('ok', now);
    addLog('INFO', '☁️ Dados carregados de todas as tabelas — ' + db.atendimentos.length + ' atend, ' + db.agenda.length + ' agend, ' + db.temas.length + ' temas');
  } catch(e) {
    addLog('WARN', '⚠️ Erro ao carregar do Supabase: ' + e.message);
    _atualizarStatusSync('offline');
    var ls = localStorage.getItem('lizafestas_lastsync') || localStorage.getItem('lizafestas_lastsave');
    var el = document.getElementById('lastSave');
    if (ls && el) el.textContent = '📴 Offline — cache de ' + ls;
  }
}

function _fromRowFesta(r) { return { id: r.id, nome: r.nome, descricao: r.descricao||'', preco: r.preco, status: r.status }; }
function _toRowFesta(f) { return { id: f.id, nome: f.nome, descricao: f.descricao||'', preco: f.preco, status: f.status }; }

function _fromRowMaterial(r) { return { id: r.id, nome: r.nome, fornecedor: r.fornecedor, custo: r.custo, qtd: r.qtd, min: r.minimo, unidade: r.unidade, grade: r.grade||'' }; }
function _toRowMaterial(m) { return { id: m.id, nome: m.nome, fornecedor: m.fornecedor, custo: m.custo, qtd: parseInt(m.qtd)||0, minimo: parseInt(m.min)||0, unidade: m.unidade, grade: m.grade||'' }; }

function _fromRowAtendimento(r) { return { id: r.id, cliente: r.cliente, data: r.data, servicoIds: r.festa_ids||[], materiais: r.materiais_usados||{}, valor: r.valor, pagto: r.pagto, obs: r.obs, statusCor: r.status_cor, agendaOrigemId: r.agenda_origem_id||null, isSinal: !!r.is_sinal }; }
function _toRowAtendimento(a) { return { id: a.id, cliente: a.cliente, data: a.data, festa_ids: a.servicoIds||[], materiais_usados: a.materiais||{}, valor: a.valor, pagto: a.pagto, obs: a.obs, status_cor: a.statusCor||null, agenda_origem_id: a.agendaOrigemId||null, is_sinal: !!a.isSinal }; }

function _fromRowDespAdm(r) { return { id: r.id, desc: r.descricao, categoria: r.categoria, valor: r.valor, data: r.data }; }
function _toRowDespAdm(d) { return { id: d.id, descricao: d.desc, categoria: d.categoria, valor: d.valor, data: d.data }; }

function _fromRowDespExtra(r) { return { id: r.id, desc: r.descricao, valor: r.valor, data: r.data }; }
function _toRowDespExtra(d) { return { id: d.id, descricao: d.desc, valor: d.valor, data: d.data }; }

function _fromRowAgenda(r) { return { id: r.id, cliente: r.cliente, telefone: r.telefone, servicoIds: r.festa_ids||[], temaId: r.tema_id||null, materiais: r.materiais_usados||{}, sessoes: r.sessoes||[], dataRetirada: r.data_retirada, horaRetirada: r.hora_retirada, sinal: r.sinal, statusCor: r.status_cor, obs: r.obs, sinalAtendId: r.sinal_atend_id||null, concluido: !!r.concluido, atendimentoId: r.atendimento_id||null, separado: !!r.separado, materiaisSeparados: r.materiais_separados||{}, fotosTema: r.fotos_tema||[] }; }
function _toRowAgenda(a) { return { id: a.id, cliente: a.cliente, telefone: a.telefone, festa_ids: a.servicoIds||[], tema_id: a.temaId||null, materiais_usados: a.materiais||{}, sessoes: a.sessoes||[], data_retirada: a.dataRetirada||null, hora_retirada: a.horaRetirada||null, sinal: a.sinal||0, status_cor: a.statusCor||null, obs: a.obs, sinal_atend_id: a.sinalAtendId||null, concluido: !!a.concluido, atendimento_id: a.atendimentoId||null, separado: !!a.separado, materiais_separados: a.materiaisSeparados||{}, fotos_tema: a.fotosTema||[] }; }

// fotos: null = ainda não carregado do Supabase; [] = carregado e vazio; [...] = carregado com itens
function _fromRowTema(r) { return { id: r.id, nome: r.nome, descricao: r.descricao, festaIds: r.festa_ids||[], fotos: (r.fotos !== undefined ? r.fotos : null) }; }
function _toRowTema(t) { return { id: t.id, nome: t.nome, descricao: t.descricao, festa_ids: t.festaIds||[], fotos: t.fotos||[] }; }

var _TO_ROW = { festas:_toRowFesta, materiais:_toRowMaterial, atendimentos:_toRowAtendimento, despAdm:_toRowDespAdm, despExtra:_toRowDespExtra, agenda:_toRowAgenda, temas:_toRowTema };

// Cópia do db pra gravar no localStorage sem as fotos dos temas (base64 pesado — não cabe no cache)
function _dbParaCache() {
  return Object.assign({}, db, {
    temas: (db.temas||[]).map(function(t) { return Object.assign({}, t, { fotos: null }); })
  });
}

function saveData() {
  try {
    localStorage.setItem('lizafestas_db', JSON.stringify(_dbParaCache()));
    var now = new Date().toLocaleString('pt-BR');
    localStorage.setItem('lizafestas_lastsave', now);
    addLog('INFO', '💾 Dados salvos localmente — ' + now);
  } catch(e) {
    addLog('WARN', '⚠️ Cache local não pôde ser salvo (armazenamento cheio) — dados seguem sincronizados no Supabase normalmente.');
  }
}

async function dbInserir(colecao, obj) {
  var tabela = _TABELAS[colecao];
  try {
    await _supaInsert(tabela, _TO_ROW[colecao](obj));
    _atualizarStatusSync('ok', new Date().toLocaleString('pt-BR'));
  } catch(e) {
    addLog('WARN', '⚠️ Falha ao gravar em ' + tabela + ': ' + e.message);
    _atualizarStatusSync('erro');
  }
}

async function dbAtualizar(colecao, obj) {
  var tabela = _TABELAS[colecao];
  var row = _TO_ROW[colecao](obj);
  var id = row.id; delete row.id;
  try {
    await _supaUpdate(tabela, id, row);
    _atualizarStatusSync('ok', new Date().toLocaleString('pt-BR'));
  } catch(e) {
    addLog('WARN', '⚠️ Falha ao atualizar em ' + tabela + ': ' + e.message);
    _atualizarStatusSync('erro');
  }
}

async function dbExcluir(colecao, id) {
  var tabela = _TABELAS[colecao];
  try {
    await _supaDelete(tabela, id);
    _atualizarStatusSync('ok', new Date().toLocaleString('pt-BR'));
  } catch(e) {
    addLog('WARN', '⚠️ Falha ao excluir em ' + tabela + ': ' + e.message);
    _atualizarStatusSync('erro');
  }
}

function _atualizarStatusSync(status, hora) {
  var el = document.getElementById('lastSave');
  if (!el) return;
  if (status === 'ok') el.textContent = '☁️ Sincronizado às ' + (hora || '');
  else if (status === 'carregando') el.textContent = '☁️ Carregando dados...';
  else if (status === 'erro') el.textContent = '⚠️ Erro no sync (salvo local)';
  else if (status === 'offline') el.textContent = '📴 Offline — usando cache';
}

function exportData() {
  var blob = new Blob([JSON.stringify(db, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lizafestas-backup-' + _hoje() + '.json';
  a.click();
  showToast('Backup exportado com sucesso!');
}
function importData(e) { showToast('Use o Supabase (Table Editor) para restauração no modelo por tabelas.'); }
function limparTodosDados() { showToast('Use o Supabase (Table Editor) para limpeza em massa.'); }

function setPeriod(p, btn) {
  currentPeriod = p;
  document.querySelectorAll('.period-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderDashboard();
}
function filterByPeriod(items, dateField) {
  var now = new Date();
  var today = now.toISOString().split('T')[0];
  return items.filter(function(item) {
    var d = item[dateField];
    if (!d) return true;
    if (currentPeriod === 'hoje') return d === today;
    if (currentPeriod === 'semana') { var w = new Date(now); w.setDate(w.getDate()-7); return d >= w.toISOString().split('T')[0]; }
    if (currentPeriod === 'mes') return d.startsWith(now.getFullYear()+'-'+(String(now.getMonth()+1).padStart(2,'0')));
    return true;
  });
}
