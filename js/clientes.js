/* =====================================================
   LIZA FESTAS — clientes.js
   Aba Clientes → Informações do Cliente (vindas da página
   pública /cliente/) → Solicitações do Cliente (Liza completa)
   → Cadastrar (cria Agenda) / Atualizar Agenda
   ===================================================== */

var _cliFiltro = 'todos';
var _cliAbertoId = null;          // cliente aberto no modal
var _cliSolFestas = [];           // festas selecionadas na Solicitação (estado do modal)
var _cliFotosDisponiveis = [];    // fotos do tema carregadas no seletor
var _cliFotosSelecionadas = [];   // fotos marcadas {id,nome,url}

// ===================== HELPERS =====================
// Dados vêm de página pública → sempre escapar antes de jogar em innerHTML
function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function _semTags(s) { return String(s || '').replace(/[<>]/g, '').trim(); }

function _cliNaoVistos() { return (db.clientes || []).filter(function (c) { return !c.visto; }); }

function _cliAgenda(cli) {
  return cli && cli.agendaId ? db.agenda.find(function (a) { return a.id === cli.agendaId; }) : null;
}

function _cliTotalFestas(ids) {
  return (ids || []).reduce(function (s, id) {
    var f = db.festas.find(function (x) { return x.id === id; });
    return s + (f ? parseFloat(f.preco) || 0 : 0);
  }, 0);
}

// ===================== LISTAGEM (sub-aba Informações do Cliente) =====================
function setCliFiltro(f, btn) {
  _cliFiltro = f;
  document.querySelectorAll('#sec-clientes .agenda-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  else {
    var alvo = document.querySelector('#sec-clientes .agenda-btn[data-filtro="' + f + '"]');
    if (alvo) alvo.classList.add('active');
  }
  renderClientes();
}

function renderClientes() {
  var cont = document.getElementById('clientesLista');
  if (!cont) return;
  var busca = ((document.getElementById('cliBusca') || { value: '' }).value || '').toLowerCase().trim();
  var buscaNum = busca.replace(/\D/g, '');

  var items = (db.clientes || []).slice();
  if (busca) items = items.filter(function (c) {
    if ((c.nome || '').toLowerCase().includes(busca)) return true;
    if (buscaNum && ((c.telefone || '').replace(/\D/g, '').includes(buscaNum) || (c.cpf || '').replace(/\D/g, '').includes(buscaNum))) return true;
    return false;
  });
  if (_cliFiltro === 'novos') items = items.filter(function (c) { return !c.visto; });
  else if (_cliFiltro === 'pendentes') items = items.filter(function (c) { return !_cliAgenda(c); });
  else if (_cliFiltro === 'agendados') items = items.filter(function (c) { return !!_cliAgenda(c); });

  items.sort(function (a, b) {
    if (!a.visto !== !b.visto) return a.visto ? 1 : -1;
    return (b.criadoEm || '').localeCompare(a.criadoEm || '');
  });

  if (!items.length) {
    cont.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhum cadastro encontrado</p></div>';
    return;
  }

  cont.innerHTML = items.map(function (c) {
    var agendado = !!_cliAgenda(c);
    var borda = !c.visto ? 'var(--rose)' : (agendado ? '#66BB6A' : '#DDD');
    var badges = (!c.visto ? '<span class="badge-pill" style="background:#FCE4EC;color:#AD1457;font-size:10px">🆕 Novo</span> ' : '') +
      (agendado ? '<span class="badge-pill badge-ativo" style="font-size:10px">📅 Agendado</span>'
                : '<span class="badge-pill badge-inativo" style="font-size:10px">⏳ Aguardando solicitação</span>');
    return '' +
      '<div class="card" style="margin-bottom:1rem;border-left:4px solid ' + borda + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">' +
          '<div>' +
            '<strong style="font-size:15px">' + _esc(c.nome) + '</strong> ' + badges +
            '<div style="font-size:12px;color:var(--text-light);margin-top:2px">🎉 Festa: ' + fmtDate(c.dataFesta) +
              (c.dataRetirada ? ' · 📦 Retirada: ' + fmtDate(c.dataRetirada) + (c.horaRetirada ? ' ' + _esc(c.horaRetirada) : '') : '') +
              ' · 📱 ' + _esc(c.telefone || '—') + '</div>' +
            (c.temaTexto ? '<div style="font-size:11px;color:var(--text-light);margin-top:2px">🎨 ' + _esc(c.temaTexto) + '</div>' : '') +
          '</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            '<button class="btn btn-secondary btn-sm" onclick="abrirCliente(\'' + c.id + '\',\'info\')">👁️ Consultar</button>' +
            '<button class="btn btn-primary btn-sm" onclick="abrirCliente(\'' + c.id + '\',\'sol\')">📝 Solicitações</button>' +
            '<button class="btn btn-edit" onclick="abrirCliente(\'' + c.id + '\',\'info\',true)">✏️</button>' +
            (agendado ? '<button class="btn btn-edit" onclick="verAgendaCliente(\'' + c.id + '\')">📅</button>' : '') +
            '<button class="btn btn-danger" onclick="excluirCliente(\'' + c.id + '\')">✕</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }).join('');
}

// ===================== MODAL DO CADASTRO =====================
async function abrirCliente(id, aba, editar) {
  var cli = db.clientes.find(function (x) { return x.id === id; });
  if (!cli) { showToast('Cadastro não encontrado.'); return; }
  _cliAbertoId = id;

  // Abriu → deixa de ser "novo" (some do alerta)
  if (!cli.visto) {
    cli.visto = true;
    saveData();
    if (typeof atualizarAlertaClientes === 'function') atualizarAlertaClientes();
    renderClientes(); updateBadges();
    dbAtualizar('clientes', cli);
  }

  var existente = document.getElementById('modal-cliente');
  if (existente) existente.remove();

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-cliente';
  modal.innerHTML =
    '<div class="modal-box" style="max-width:760px">' +
      '<div class="modal-header"><span>👥 ' + _esc(cli.nome) + '</span>' +
      '<button onclick="fecharModalCliente()">✕</button></div>' +
      '<div style="display:flex;gap:6px;padding:0.75rem 1.5rem 0;border-bottom:1px solid var(--border);flex-wrap:wrap">' +
        '<button id="cliTabInfo" class="agenda-btn" onclick="cliAba(\'info\')">📋 Informações do Cliente</button>' +
        '<button id="cliTabSol" class="agenda-btn" onclick="cliAba(\'sol\')">📝 Solicitações do Cliente</button>' +
        '<div style="height:10px;width:100%"></div>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div id="cliPainelInfo"></div>' +
        '<div id="cliPainelSol" style="display:none"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  _renderCliInfo(cli, !!editar);
  _renderCliSol(cli);
  cliAba(aba === 'sol' ? 'sol' : 'info');
}

function fecharModalCliente() {
  var m = document.getElementById('modal-cliente');
  if (m) m.remove();
  _cliAbertoId = null;
}

function cliAba(aba) {
  var info = document.getElementById('cliPainelInfo'), sol = document.getElementById('cliPainelSol');
  if (!info || !sol) return;
  info.style.display = aba === 'info' ? '' : 'none';
  sol.style.display = aba === 'sol' ? '' : 'none';
  var tI = document.getElementById('cliTabInfo'), tS = document.getElementById('cliTabSol');
  if (tI) tI.classList.toggle('active', aba === 'info');
  if (tS) tS.classList.toggle('active', aba === 'sol');
}

// ---------- Aba: Informações do Cliente (consultar / alterar) ----------
function _renderCliInfo(cli, editar) {
  var el = document.getElementById('cliPainelInfo');
  if (!el) return;
  var avisoRetirada = '<div style="font-size:11px;color:var(--rose-dark);margin-top:4px">🕗 Retirada das 08h às 11h, na data combinada.</div>';

  if (!editar) {
    el.innerHTML =
      '<div class="detail-box" style="padding:0">' +
        '<div class="detail-field"><label>Nome completo</label><span>' + _esc(cli.nome) + '</span></div>' +
        '<div class="detail-field"><label>CPF</label><span>' + _esc(cli.cpf || '—') + '</span></div>' +
        '<div class="detail-field"><label>Telefone / WhatsApp</label><span>' + _esc(cli.telefone || '—') + '</span></div>' +
        '<div class="detail-field" style="grid-column:1/-1"><label>Endereço da festa</label><span>' + _esc(cli.endereco || '—') + '</span></div>' +
        '<div class="detail-field"><label>Tema da decoração</label><span>' + _esc(cli.temaTexto || '—') + '</span></div>' +
        '<div class="detail-field"><label>Data da festa</label><span>' + fmtDate(cli.dataFesta) + '</span></div>' +
        '<div class="detail-field"><label>Valor do sinal</label><span>' + fmtMoney(cli.sinalInformado) + '</span></div>' +
        '<div class="detail-field"><label>Data da retirada</label><span>' + fmtDate(cli.dataRetirada) + '</span></div>' +
        '<div class="detail-field"><label>Horário da retirada do kit</label><span>' + _esc(cli.horaRetirada || '—') + '</span>' + avisoRetirada + '</div>' +
        '<div class="detail-field"><label>Recebido em</label><span>' + (cli.criadoEm ? new Date(cli.criadoEm).toLocaleString('pt-BR') : '—') + '</span></div>' +
      '</div>' +
      '<div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap">' +
        '<button class="btn btn-edit" onclick="_renderCliInfo(db.clientes.find(function(x){return x.id===\'' + cli.id + '\'}),true)">✏️ Alterar</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="enviarWhatsappCliente(\'' + cli.id + '\')">📱 WhatsApp</button>' +
        '<button class="btn btn-danger" onclick="excluirCliente(\'' + cli.id + '\')">✕ Excluir</button>' +
      '</div>';
    return;
  }

  el.innerHTML =
    '<div class="form-grid">' +
      '<div class="form-group" style="grid-column:1/-1"><label>Nome completo *</label><input id="ecli-nome" value="' + _esc(cli.nome) + '"></div>' +
      '<div class="form-group"><label>CPF *</label><input id="ecli-cpf" value="' + _esc(cli.cpf || '') + '"></div>' +
      '<div class="form-group"><label>Telefone / WhatsApp *</label><input id="ecli-tel" value="' + _esc(cli.telefone || '') + '" onkeyup="mascaraTel(this)"></div>' +
      '<div class="form-group" style="grid-column:1/-1"><label>Endereço da festa</label><input id="ecli-end" value="' + _esc(cli.endereco || '') + '"></div>' +
      '<div class="form-group"><label>Tema da decoração</label><input id="ecli-tema" value="' + _esc(cli.temaTexto || '') + '"></div>' +
      '<div class="form-group"><label>Data da festa *</label><input type="date" id="ecli-data" value="' + (cli.dataFesta || '') + '"></div>' +
      '<div class="form-group"><label>Valor do sinal (R$)</label><input type="number" step="0.01" id="ecli-sinal" value="' + (cli.sinalInformado || 0) + '"></div>' +
      '<div class="form-group"><label>Data da retirada</label><input type="date" id="ecli-data-ret" value="' + (cli.dataRetirada || '') + '"></div>' +
      '<div class="form-group"><label>Horário da retirada do kit</label><input id="ecli-hora-ret" value="' + _esc(cli.horaRetirada || '') + '" placeholder="Ex: 09:00">' + avisoRetirada + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:0.5rem">' +
      '<button class="btn btn-primary btn-sm" onclick="salvarInfoCliente(\'' + cli.id + '\')">✓ Salvar</button>' +
      '<button class="btn btn-secondary btn-sm" onclick="_renderCliInfo(db.clientes.find(function(x){return x.id===\'' + cli.id + '\'}),false)">Cancelar</button>' +
    '</div>';
}

async function salvarInfoCliente(id) {
  var cli = db.clientes.find(function (x) { return x.id === id; });
  if (!cli) return;
  var nome = _semTags(document.getElementById('ecli-nome').value);
  var cpf = _semTags(document.getElementById('ecli-cpf').value);
  var tel = _semTags(document.getElementById('ecli-tel').value);
  var data = document.getElementById('ecli-data').value;
  if (!nome || !cpf || !tel || !data) { showToast('Nome, CPF, telefone e data da festa são obrigatórios!'); return; }

  cli.nome = nome; cli.cpf = cpf; cli.telefone = tel; cli.dataFesta = data;
  cli.endereco = _semTags(document.getElementById('ecli-end').value);
  cli.temaTexto = _semTags(document.getElementById('ecli-tema').value);
  cli.sinalInformado = parseFloat(document.getElementById('ecli-sinal').value || 0) || 0;
  cli.dataRetirada = document.getElementById('ecli-data-ret').value || null;
  cli.horaRetirada = _semTags(document.getElementById('ecli-hora-ret').value);

  saveData(); renderClientes();
  await dbAtualizar('clientes', cli);
  if (_cliAgenda(cli)) await _sincronizarAgendaCliente(cli, true);

  _renderCliInfo(cli, false);
  _renderCliSol(cli);
  showToast('Informações do cliente atualizadas!' + (_cliAgenda(cli) ? ' Agenda sincronizada.' : ''));
}

// ---------- Aba: Solicitações do Cliente (Liza completa) ----------
function _renderCliSol(cli) {
  var el = document.getElementById('cliPainelSol');
  if (!el) return;

  _cliSolFestas = (cli.solFestaIds || []).slice();
  _cliFotosSelecionadas = (cli.solFotosTema || []).slice();
  _cliFotosDisponiveis = [];

  var tema = cli.solTemaId ? db.temas.find(function (t) { return t.id === cli.solTemaId; }) : null;
  var temaOpcoes = '<option value="">Nenhum</option>' + db.temas.map(function (t) {
    return '<option value="' + t.id + '"' + (cli.solTemaId === t.id ? ' selected' : '') + '>' + _esc(t.nome) + '</option>';
  }).join('');
  var cor = cli.solStatusCor || 'reservado';
  var sinalConf = (cli.solSinal !== null && cli.solSinal !== undefined && cli.solSinal !== '') ? cli.solSinal : (cli.sinalInformado || 0);
  var dataRetConf = cli.solDataRetirada || cli.dataRetirada || '';
  var ag = _cliAgenda(cli);

  el.innerHTML =
    (cli.temaTexto ? '<div style="font-size:12px;background:var(--cream);border-radius:8px;padding:8px 12px;margin-bottom:0.75rem">🎨 Tema pedido pela cliente: <strong>' + _esc(cli.temaTexto) + '</strong></div>' : '') +
    '<div class="form-grid">' +
      '<div class="form-group tema-combo-wrap" style="position:relative">' +
        '<label>Tema da decoração</label>' +
        '<input type="text" id="cli-tema-busca" value="' + _esc(tema ? tema.nome : '') + '" placeholder="Buscar tema..." autocomplete="off" onkeyup="_filtrarTemaCombo(\'cli\')" onfocus="_filtrarTemaCombo(\'cli\')">' +
        '<select id="cli-tema" onchange="_cliOnTemaSelecionado()" style="display:none">' + temaOpcoes + '</select>' +
        '<div id="cli-tema-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:#fff;border:1px solid var(--border);border-radius:8px;max-height:220px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.12);margin-top:2px"></div>' +
      '</div>' +
      '<div class="form-group"><label>Data da retirada (confirmada)</label><input type="date" id="cli-sol-data-ret" value="' + dataRetConf + '">' +
        '<div style="font-size:11px;color:var(--text-light);margin-top:2px">Informada pela cliente: ' + fmtDate(cli.dataRetirada) + (cli.horaRetirada ? ' · ' + _esc(cli.horaRetirada) : '') + '</div></div>' +
      '<div class="form-group"><label>Valor do sinal confirmado (R$)</label><input type="number" step="0.01" id="cli-sol-sinal" value="' + sinalConf + '" oninput="_cliRenderTotal()">' +
        '<div style="font-size:11px;color:var(--text-light);margin-top:2px">Informado pela cliente: ' + fmtMoney(cli.sinalInformado) + '</div></div>' +
      '<div class="form-group"><label>Status / Cor na agenda</label>' +
        '<select id="cli-sol-cor">' +
          Object.keys(_coresStatus).map(function (k) { return '<option value="' + k + '"' + (cor === k ? ' selected' : '') + '>' + _coresStatus[k].label + '</option>'; }).join('') +
        '</select>' +
        (ag ? '<div style="font-size:11px;color:var(--text-light);margin-top:2px">Após cadastrar, a cor é controlada pela Agenda.</div>' : '') +
      '</div>' +
    '</div>' +
    '<div id="cliFotosWrap" style="margin-bottom:0.75rem"></div>' +
    '<div class="form-group"><label>Festas</label><input id="cli-festa-busca" placeholder="Buscar festa..." onkeyup="_cliRenderFestaChips()"></div>' +
    '<div id="cliFestaChips" class="chips-wrap"></div>' +
    '<div id="cliTotalFestas" style="font-size:12px;margin-bottom:1rem"></div>' +
    '<div id="cliSolAcoes" style="display:flex;gap:0.5rem;flex-wrap:wrap;padding-top:0.75rem;border-top:1px solid var(--border)"></div>';

  _cliRenderFotosResumo();
  _cliRenderFestaChips();
  _cliRenderAcoes(cli);
}

function _cliRenderAcoes(cli) {
  var el = document.getElementById('cliSolAcoes');
  if (!el) return;
  var ag = _cliAgenda(cli);
  el.innerHTML =
    '<button class="btn btn-primary" onclick="salvarSolicitacaoCliente(\'' + cli.id + '\')">💾 Salvar</button>' +
    (ag
      ? '<button class="btn btn-secondary" onclick="verAgendaCliente(\'' + cli.id + '\')">📅 Ver na Agenda</button>' +
        '<button class="btn btn-secondary" onclick="atualizarAgendaCliente(\'' + cli.id + '\')">🔄 Atualizar Agenda</button>'
      : '<button class="btn btn-primary" style="background:#66BB6A" onclick="cadastrarAgendaCliente(\'' + cli.id + '\')">📅 Cadastrar</button>') +
    (ag && ag.concluido ? '<span style="font-size:11px;color:var(--text-light);align-self:center">✔ Festa já realizada — agenda não é mais alterada.</span>' : '');
}

// ----- Festas (chips iguais aos da Agenda, com estado próprio) -----
function _cliRenderFestaChips() {
  var el = document.getElementById('cliFestaChips');
  if (!el) return;
  var busca = ((document.getElementById('cli-festa-busca') || { value: '' }).value || '').toLowerCase();
  var lista = db.festas.filter(function (f) { return f.status === 'ativo' && (!busca || f.nome.toLowerCase().includes(busca)); });
  // mantém visíveis as já selecionadas mesmo se inativas/fora da busca
  _cliSolFestas.forEach(function (id) {
    if (!lista.find(function (f) { return f.id === id; })) {
      var f = db.festas.find(function (x) { return x.id === id; });
      if (f) lista.unshift(f);
    }
  });
  el.innerHTML = lista.length
    ? lista.map(function (f) {
        return '<div class="service-chip ' + (_cliSolFestas.indexOf(f.id) >= 0 ? 'selected' : '') + '" data-id="' + f.id + '">' + _esc(f.nome) + '</div>';
      }).join('')
    : '<div style="font-size:12px;color:var(--text-light);padding:0.5rem">Nenhuma festa encontrada</div>';
  el.querySelectorAll('.service-chip').forEach(function (c) {
    c.addEventListener('click', function () { _cliToggleFesta(this.dataset.id); });
  });
  _cliRenderTotal();
}

function _cliToggleFesta(id) {
  var i = _cliSolFestas.indexOf(id);
  if (i >= 0) _cliSolFestas.splice(i, 1); else _cliSolFestas.push(id);
  _cliRenderFestaChips();
}

function _cliRenderTotal() {
  var el = document.getElementById('cliTotalFestas');
  if (!el) return;
  if (!_cliSolFestas.length) { el.innerHTML = '<span style="color:var(--text-light)">Nenhuma festa selecionada</span>'; return; }
  var total = _cliTotalFestas(_cliSolFestas);
  var sinal = parseFloat((document.getElementById('cli-sol-sinal') || { value: 0 }).value || 0) || 0;
  el.innerHTML = 'Total das festas: <strong>' + fmtMoney(total) + '</strong> · Sinal: ' + fmtMoney(sinal) +
    ' · Saldo: <strong>' + fmtMoney(Math.max(0, total - sinal)) + '</strong>';
}

// ----- Tema + fotos (seleção grava; exibe só em "Ver Fotos") -----
async function _cliOnTemaSelecionado() {
  var temaId = document.getElementById('cli-tema').value;
  _cliFotosSelecionadas = [];
  _cliFotosDisponiveis = [];
  if (!temaId) { _cliRenderFotosResumo(); return; }

  var tema = db.temas.find(function (t) { return t.id === temaId; });
  if (tema && (tema.festaIds || []).length) {
    _cliSolFestas = tema.festaIds.slice();
    _cliRenderFestaChips();
  }
  await _cliAbrirSeletorFotos(temaId);
}

async function _cliAbrirSeletorFotos(temaId) {
  var wrap = document.getElementById('cliFotosWrap');
  if (!wrap) return;
  temaId = temaId || (document.getElementById('cli-tema') || {}).value;
  if (!temaId) { showToast('Selecione um tema primeiro.'); return; }
  wrap.innerHTML = '<div style="font-size:12px;color:var(--text-light)">Carregando fotos do tema...</div>';
  try {
    var t = await _garantirFotosTema(temaId);
    _cliFotosDisponiveis = (t && t.fotos) || [];
    if (!_cliFotosDisponiveis.length) { wrap.innerHTML = '<div style="font-size:12px;color:var(--text-light)">Este tema não tem fotos cadastradas.</div>'; return; }
    var selIds = _cliFotosSelecionadas.map(function (f) { return f.id; });
    wrap.innerHTML =
      '<label style="font-size:10px;color:var(--text-light);text-transform:uppercase;letter-spacing:1px">Fotos do kit — selecione as que representam o pedido</label>' +
      '<div class="chips-wrap" style="margin-top:6px">' +
      _cliFotosDisponiveis.map(function (f) {
        var sel = selIds.indexOf(f.id) >= 0;
        return '<div style="width:70px;cursor:pointer" onclick="_cliToggleFoto(\'' + f.id + '\')">' +
          '<img id="clifoto-img-' + f.id + '" src="' + _fotoSrc(f) + '" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:3px solid ' + (sel ? 'var(--rose)' : 'var(--border)') + '"></div>';
      }).join('') + '</div>' +
      '<button class="btn btn-secondary btn-sm" style="margin-top:6px" onclick="_cliRenderFotosResumo()">✓ Concluir seleção</button>';
  } catch (e) {
    wrap.innerHTML = '<div style="font-size:12px;color:var(--danger)">Erro ao carregar fotos do tema.</div>';
    addLog('WARN', 'Erro ao buscar fotos do tema (clientes): ' + e.message);
  }
}

function _cliToggleFoto(fotoId) {
  var foto = _cliFotosDisponiveis.find(function (f) { return f.id === fotoId; });
  if (!foto) return;
  var idx = _cliFotosSelecionadas.findIndex(function (f) { return f.id === fotoId; });
  var el = document.getElementById('clifoto-img-' + fotoId);
  if (idx >= 0) { _cliFotosSelecionadas.splice(idx, 1); if (el) el.style.borderColor = 'var(--border)'; }
  else { _cliFotosSelecionadas.push(foto); if (el) el.style.borderColor = 'var(--rose)'; }
}

function _cliRenderFotosResumo() {
  var wrap = document.getElementById('cliFotosWrap');
  if (!wrap) return;
  var temaId = (document.getElementById('cli-tema') || {}).value;
  if (!temaId) { wrap.innerHTML = ''; return; }
  var n = _cliFotosSelecionadas.length;
  wrap.innerHTML =
    '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px">' +
      '<span>🖼️ ' + n + ' foto(s) selecionada(s)</span>' +
      (n ? '<button class="btn btn-edit" onclick="verFotosSelecionadasCliente()">🖼️ Ver Fotos (' + n + ')</button>' : '') +
      '<button class="btn btn-secondary btn-sm" onclick="_cliAbrirSeletorFotos()">' + (n ? '🔁 Trocar fotos' : '➕ Selecionar fotos') + '</button>' +
    '</div>';
}

function verFotosSelecionadasCliente() {
  var fotos = _cliFotosSelecionadas;
  if (!fotos.length) { showToast('Nenhuma foto selecionada.'); return; }
  var existente = document.getElementById('modal-fotos-cli');
  if (existente) existente.remove();
  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-fotos-cli';
  modal.style.zIndex = '10001';
  modal.innerHTML = '<div class="modal-box" style="max-width:600px">' +
    '<div class="modal-header"><span>🖼️ Fotos do kit</span>' +
    '<button onclick="document.getElementById(\'modal-fotos-cli\').remove()">✕</button></div>' +
    '<div class="modal-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">' +
    fotos.map(function (f) { return '<img src="' + _fotoSrc(f) + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">'; }).join('') +
    '</div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
}

// ----- Coleta / Salvar -----
function _cliColetarSolicitacao(cli) {
  cli.solTemaId = (document.getElementById('cli-tema') || {}).value || null;
  cli.solFotosTema = cli.solTemaId ? _cliFotosSelecionadas.slice() : [];
  cli.solFestaIds = _cliSolFestas.slice();
  cli.solDataRetirada = (document.getElementById('cli-sol-data-ret') || {}).value || null;
  var s = (document.getElementById('cli-sol-sinal') || {}).value;
  cli.solSinal = (s === '' || s === undefined) ? null : (parseFloat(s) || 0);
  cli.solStatusCor = (document.getElementById('cli-sol-cor') || {}).value || 'reservado';
}

async function salvarSolicitacaoCliente(id) {
  var cli = db.clientes.find(function (x) { return x.id === id; });
  if (!cli) return;
  _cliColetarSolicitacao(cli);
  saveData(); renderClientes();
  await dbAtualizar('clientes', cli);

  var sincronizou = false;
  if (_cliAgenda(cli)) sincronizou = await _sincronizarAgendaCliente(cli, true);
  _cliRenderAcoes(cli);
  showToast('Solicitação salva!' + (sincronizou ? ' Agenda atualizada automaticamente.' : ''));
}

// ----- Cadastrar → cria Agenda -----
async function cadastrarAgendaCliente(id) {
  var cli = db.clientes.find(function (x) { return x.id === id; });
  if (!cli) return;
  if (_cliAgenda(cli)) { showToast('Este cliente já tem agenda. Use "Atualizar Agenda".'); return; }

  _cliColetarSolicitacao(cli);
  if (!cli.dataFesta) { showToast('Data da festa não informada (ajuste em Informações do Cliente).'); return; }
  if (!cli.solFestaIds.length) { showToast('Selecione ao menos uma festa!'); return; }
  if (!confirm('Criar agendamento para ' + cli.nome + ' em ' + fmtDate(cli.dataFesta) + '?')) return;

  var novo = await _criarAgendamento({
    cliente: _semTags(cli.nome),
    telefone: cli.telefone || '',
    data: cli.dataFesta,
    dataRetirada: cli.solDataRetirada || cli.dataRetirada || '',
    horaRetirada: _cliHoraParaAgenda(cli.horaRetirada),
    sinal: parseFloat(cli.solSinal || 0) || 0,
    temaId: cli.solTemaId || null,
    statusCor: cli.solStatusCor || 'reservado',
    obs: _cliObsLinhas(cli).join('\n'),
    servicoIds: cli.solFestaIds.slice(),
    materiais: {},
    fotosTema: (cli.solFotosTema || []).slice()
  });

  cli.agendaId = novo.id;
  saveData(); renderClientes();
  await dbAtualizar('clientes', cli);
  _cliRenderAcoes(cli);
  _toastAgendaCriada(novo.id);
}

async function atualizarAgendaCliente(id) {
  var cli = db.clientes.find(function (x) { return x.id === id; });
  if (!cli) return;
  _cliColetarSolicitacao(cli);
  saveData();
  await dbAtualizar('clientes', cli);
  await _sincronizarAgendaCliente(cli, false);
  _cliRenderAcoes(cli);
}

function verAgendaCliente(id) {
  var cli = db.clientes.find(function (x) { return x.id === id; });
  var ag = _cliAgenda(cli);
  if (!ag) { showToast('Agenda não encontrada.'); return; }
  fecharModalCliente();
  var busca = document.getElementById('agBuscaCliente');
  if (busca) busca.value = ag.cliente;
  var filtro = ag.concluido ? 'realizados' : 'tudo';
  var btnFiltro = Array.prototype.find.call(document.querySelectorAll('#sec-agenda .agenda-filtros .agenda-btn'), function (b) {
    return (b.getAttribute('onclick') || '').indexOf("'" + filtro + "'") >= 0;
  });
  setAgendaFiltro(filtro, btnFiltro);
  showSection('agenda');
  setTimeout(function () {
    var card = document.getElementById('agcard-' + ag.id);
    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.style.boxShadow = '0 0 0 3px var(--rose)'; setTimeout(function () { card.style.boxShadow = ''; }, 2500); }
  }, 200);
}

// ===================== SINCRONIZAÇÃO CLIENTE → AGENDA =====================
// Atualiza: cliente, telefone, data, retirada, tema+fotos, festas, sinal, obs (endereço/CPF)
// NÃO mexe: cor/status, separado, materiais, concluído
function _cliHoraParaAgenda(h) {
  var m = String(h || '').match(/(\d{1,2})\s*[:hH]\s*(\d{2})?/);
  if (!m) return '';
  var hh = parseInt(m[1]); if (hh > 23) return '';
  return String(hh).padStart(2, '0') + ':' + (m[2] || '00');
}

function _cliObsLinhas(cli) {
  var l = [];
  if (cli.endereco) l.push('📍 Endereço: ' + _semTags(cli.endereco));
  if (cli.cpf) l.push('🪪 CPF: ' + _semTags(cli.cpf));
  return l;
}

function _cliMesclarObs(obsAtual, cli) {
  var outras = String(obsAtual || '').split('\n').filter(function (l) {
    return l.indexOf('📍 Endereço:') !== 0 && l.indexOf('🪪 CPF:') !== 0;
  });
  return _cliObsLinhas(cli).concat(outras).join('\n').trim();
}

async function _sincronizarAgendaCliente(cli, automatico) {
  var ag = _cliAgenda(cli);
  if (!ag) {
    if (cli.agendaId) {
      cli.agendaId = null; saveData(); await dbAtualizar('clientes', cli);
      showToast('A agenda vinculada não existe mais. Use "Cadastrar" para criar outra.');
    }
    return false;
  }
  if (ag.concluido) { if (!automatico) showToast('Festa já realizada — a agenda não foi alterada.'); return false; }

  ag.cliente = _semTags(cli.nome);
  ag.telefone = cli.telefone || '';
  if (!ag.sessoes || !ag.sessoes.length) ag.sessoes = [{ data: cli.dataFesta, hora: '', servicoIds: [], status: 'pendente' }];
  ag.sessoes[0].data = cli.dataFesta;
  if ((cli.solFestaIds || []).length) {
    ag.servicoIds = cli.solFestaIds.slice();
    ag.sessoes[0].servicoIds = cli.solFestaIds.slice();
  }
  ag.dataRetirada = cli.solDataRetirada || cli.dataRetirada || '';
  ag.horaRetirada = _cliHoraParaAgenda(cli.horaRetirada) || ag.horaRetirada || '';
  ag.temaId = cli.solTemaId || null;
  ag.fotosTema = (cli.solFotosTema || []).slice();
  ag.obs = _cliMesclarObs(ag.obs, cli);

  // Sinal (mesma regra do salvarEdicaoAgenda)
  var novoSinal = parseFloat(cli.solSinal || 0) || 0;
  if (novoSinal !== (parseFloat(ag.sinal || 0) || 0)) {
    var sinalAt = ag.sinalAtendId ? db.atendimentos.find(function (a) { return a.id === ag.sinalAtendId; }) : null;
    if (sinalAt && novoSinal > 0) {
      sinalAt.valor = novoSinal;
      await dbAtualizar('atendimentos', sinalAt);
      ag.sinal = novoSinal;
    } else if (sinalAt && novoSinal <= 0) {
      if (confirm('O sinal foi zerado. Excluir o atendimento de SINAL de ' + fmtMoney(sinalAt.valor) + '?')) {
        db.atendimentos = db.atendimentos.filter(function (a) { return a.id !== sinalAt.id; });
        await dbExcluir('atendimentos', sinalAt.id);
        ag.sinalAtendId = null;
        ag.sinal = 0;
      } else {
        showToast('Sinal mantido em ' + fmtMoney(ag.sinal) + ' na agenda.');
      }
    } else if (!sinalAt && novoSinal > 0) {
      var at = {
        id: uid(), cliente: ag.cliente, data: ag.dataRetirada || cli.dataFesta,
        servicoIds: (ag.servicoIds || []).slice(), materiais: {},
        valor: novoSinal, pagto: 'pix',
        obs: 'Sinal recebido referente à festa de ' + fmtDate(cli.dataFesta) + '.',
        statusCor: ag.statusCor, agendaOrigemId: null, isSinal: true
      };
      db.atendimentos.push(at);
      await dbInserir('atendimentos', at);
      ag.sinalAtendId = at.id;
      ag.sinal = novoSinal;
    } else {
      ag.sinal = novoSinal;
    }
  }

  saveData(); renderAll();
  await dbAtualizar('agenda', ag);
  if (!automatico) showToast('🔄 Agenda atualizada!');
  return true;
}

// ===================== EXCLUIR / WHATSAPP =====================
async function excluirCliente(id) {
  var cli = db.clientes.find(function (x) { return x.id === id; });
  if (!cli) return;
  var msg = _cliAgenda(cli)
    ? 'Este cliente já tem AGENDA vinculada.\nA agenda será MANTIDA — só o cadastro do cliente será excluído.\n\nConfirmar exclusão?'
    : 'Excluir o cadastro de ' + cli.nome + '?';
  if (!confirm(msg)) return;
  db.clientes = db.clientes.filter(function (x) { return x.id !== id; });
  if (_cliAbertoId === id) fecharModalCliente();
  saveData(); renderAll();
  if (typeof atualizarAlertaClientes === 'function') atualizarAlertaClientes();
  await dbExcluir('clientes', id);
  showToast('Cadastro excluído.');
}

function enviarWhatsappCliente(id) {
  var cli = db.clientes.find(function (x) { return x.id === id; });
  if (!cli) return;
  var msg = 'Olá ' + (cli.nome || '').split(' ')[0] + '! 🎉\n\nRecebi seu cadastro para a festa do dia ' + fmtDate(cli.dataFesta) + '.' +
    (cli.temaTexto ? '\n🎨 Tema: ' + cli.temaTexto : '') +
    '\n📦 Retirada do kit: das 08h às 11h, na data combinada.' +
    '\n\nJá vou confirmar os detalhes com você!';
  abrirWhatsapp(cli.telefone, msg);
}
