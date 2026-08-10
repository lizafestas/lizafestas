/* =====================================================
   LIZA FESTAS — pedidosSeparados.js
   Separação física dos pedidos vindos da Agenda:
   escolhe materiais, dá baixa no estoque só na confirmação,
   e prepara o caminho para "Realizar" (Atendimentos)
   ===================================================== */

let _psepFiltro = 'pendentes';
let _pedidoAtualSeparacao = null;   // id do agendamento em separação no modal aberto
let _materiaisSeparacaoTmp = {};    // seleção temporária {materialId: qtd} enquanto o modal está aberto

// ===================== ENTRADA VINDA DO BOTÃO NA AGENDA =====================
function separarPedido(agId) {
  showSection('pedidosSeparados');
  setTimeout(function () { abrirPickerSeparacao(agId); }, 150);
}

// ===================== FILTROS / LISTAGEM =====================
function setPsepFiltro(f, btn) {
  _psepFiltro = f;
  document.querySelectorAll('#sec-pedidosSeparados .agenda-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderPedidosSeparados();
}

function renderPedidosSeparados() {
  var cont = document.getElementById('pedidosSeparadosLista');
  if (!cont) return;

  var busca = (document.getElementById('psepBuscaCliente') || { value: '' }).value.toLowerCase();
  var items = db.agenda.filter(function (ag) { return !ag.concluido; });
  if (busca) items = items.filter(function (ag) { return ag.cliente.toLowerCase().includes(busca); });
  if (_psepFiltro === 'pendentes') items = items.filter(function (ag) { return !ag.separado; });
  else if (_psepFiltro === 'separados') items = items.filter(function (ag) { return ag.separado; });

  items.sort(function (a, b) { return (a.sessoes[0] ? a.sessoes[0].data : '').localeCompare(b.sessoes[0] ? b.sessoes[0].data : ''); });

  if (!items.length) {
    cont.innerHTML = '<div class="empty-state"><div class="empty-icon">🧾</div><p>Nenhum pedido encontrado</p></div>';
    return;
  }

  cont.innerHTML = items.map(function (ag) {
    var tema = ag.temaId ? db.temas.find(function (t) { return t.id === ag.temaId; }) : null;
    var festasNomes = (ag.servicoIds || []).map(function (id) {
      var f = db.festas.find(function (x) { return x.id === id; });
      return f ? f.nome : null;
    }).filter(Boolean).join(' + ') || '—';
    var festasDesc = (ag.servicoIds || []).map(function (id) {
      var f = db.festas.find(function (x) { return x.id === id; });
      return (f && f.descricao) ? f.descricao : null;
    }).filter(Boolean).join(' · ');
    var matsResumo = Object.entries(ag.materiaisSeparados || {}).map(function (entry) {
      var m = db.materiais.find(function (x) { return x.id === entry[0]; });
      return m ? (m.nome + ' ×' + entry[1]) : null;
    }).filter(Boolean).join(', ');
    var dataSessao = ag.sessoes[0] ? ag.sessoes[0].data : null;

    return '' +
    '<div class="card" style="margin-bottom:1rem' + (ag.separado ? ';opacity:0.85' : '') + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">' +
        '<div>' +
          '<strong style="font-size:15px">' + ag.cliente + '</strong> ' +
          (ag.separado
            ? '<span class="badge-pill badge-ativo" style="font-size:10px">📦 Separado</span>'
            : '<span class="badge-pill badge-inativo" style="font-size:10px">🔲 Pendente</span>') +
          '<div style="font-size:12px;color:var(--text-light)">' + festasNomes + (tema ? ' · 🎨 ' + tema.nome : '') + '</div>' +
          (festasDesc ? '<div style="font-size:11px;color:var(--text-light);margin-top:2px">' + festasDesc + '</div>' : '') +
          '<div style="font-size:11px;color:var(--text-light);margin-top:2px">📅 ' + fmtDate(dataSessao) + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px">' +
          (!ag.separado
            ? '<button class="btn btn-primary btn-sm" onclick="abrirPickerSeparacao(\'' + ag.id + '\')">🧾 Separar</button>'
            : '<button class="btn btn-secondary btn-sm" onclick="abrirPickerSeparacao(\'' + ag.id + '\')">✏️ Ajustar</button>') +
          (ag.separado
            ? '<button class="btn btn-primary btn-sm" onclick="realizarSessao(\'' + ag.id + '\',0)">✓ Realizar</button>' +
              '<button style="background:#E7F7EE;border:1px solid #7DB87D;color:#276749;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer" onclick="enviarWhatsappSeparacao(\'' + ag.id + '\')">📱 WhatsApp</button>'
            : '') +
        '</div>' +
      '</div>' +
      (matsResumo ? '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:12px"><label style="color:var(--text-light)">Materiais separados:</label> ' + matsResumo + '</div>' : '') +
    '</div>';
  }).join('');
}

// ===================== MODAL DE SEPARAÇÃO =====================
function abrirPickerSeparacao(agId) {
  var ag = db.agenda.find(function (x) { return x.id === agId; });
  if (!ag) return;

  _pedidoAtualSeparacao = agId;
  _materiaisSeparacaoTmp = Object.keys(ag.materiaisSeparados || {}).length
    ? Object.assign({}, ag.materiaisSeparados)
    : Object.assign({}, ag.materiais || {});

  var tema = ag.temaId ? db.temas.find(function (t) { return t.id === ag.temaId; }) : null;
  var festasNomes = (ag.servicoIds || []).map(function (id) {
    var f = db.festas.find(function (x) { return x.id === id; });
    return f ? f.nome : null;
  }).filter(Boolean).join(' + ') || '—';
  var festasDesc = (ag.servicoIds || []).map(function (id) {
    var f = db.festas.find(function (x) { return x.id === id; });
    return (f && f.descricao) ? f.descricao : null;
  }).filter(Boolean).join(' · ');

  var existente = document.getElementById('modal-separar-pedido');
  if (existente) existente.remove();

  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-separar-pedido';
  modal.innerHTML =
    '<div class="modal-box" style="max-width:520px">' +
      '<div class="modal-header"><span>🧾 Separar Pedido — ' + ag.cliente + '</span>' +
      '<button onclick="document.getElementById(\'modal-separar-pedido\').remove()">✕</button></div>' +
      '<div class="modal-body">' +
        '<div style="margin-bottom:0.75rem;font-size:13px">' +
          '<div><strong>Festa(s):</strong> ' + festasNomes + '</div>' +
          (festasDesc ? '<div style="color:var(--text-light);font-size:12px;margin-top:2px">' + festasDesc + '</div>' : '') +
          (tema ? '<div style="margin-top:4px">🎨 <strong>Tema:</strong> ' + tema.nome + '</div>' : '') +
        '</div>' +
        '<div class="form-group"><label>Buscar material</label>' +
          '<input id="psep-material-busca" placeholder="Buscar material..." onkeyup="_renderPickerMateriaisSeparacao()"></div>' +
        '<div id="psepMaterialChips" class="chips-wrap"></div>' +
        '<div id="psepMaterialQtdWrap"></div>' +
        '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
          '<button class="btn btn-primary btn-sm" onclick="confirmarSeparacao()">✓ Confirmar Separação</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'modal-separar-pedido\').remove()">Cancelar</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  _renderPickerMateriaisSeparacao();
}

function _renderPickerMateriaisSeparacao() {
  var busca = (document.getElementById('psep-material-busca') || { value: '' }).value.toLowerCase();
  var chipsEl = document.getElementById('psepMaterialChips');
  if (!chipsEl) return;

  var mats = db.materiais.filter(function (m) { return !busca || m.nome.toLowerCase().includes(busca); });
  chipsEl.innerHTML = mats.length
    ? mats.map(function (m) {
        var sel = _materiaisSeparacaoTmp[m.id];
        return '<div class="material-chip ' + (sel ? 'selected' : '') + '" data-id="' + m.id + '">' +
          m.nome + (sel ? ' ×' + sel : '') +
          ' <span style="font-size:10px;color:var(--text-light)">(estoque: ' + m.qtd + ')</span></div>';
      }).join('')
    : '<div style="font-size:12px;color:var(--text-light);padding:4px">Cadastre materiais primeiro</div>';
  chipsEl.querySelectorAll('.material-chip').forEach(function (el) {
    el.addEventListener('click', function () { _togglePsepMaterial(this.dataset.id); });
  });

  var qtdWrap = document.getElementById('psepMaterialQtdWrap');
  if (!qtdWrap) return;
  var ids = Object.keys(_materiaisSeparacaoTmp);
  qtdWrap.innerHTML = ids.map(function (id) {
    var m = db.materiais.find(function (x) { return x.id === id; });
    if (!m) return '';
    return '<div style="display:flex;align-items:center;gap:6px;background:var(--cream);border-radius:8px;padding:4px 10px;font-size:12px;margin-top:4px">' +
      '<span>' + m.nome + '</span><label style="font-size:11px;color:var(--text-light)">Qtd:</label>' +
      '<input type="number" min="1" value="' + _materiaisSeparacaoTmp[id] + '" ' +
      'style="width:50px;padding:2px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px" ' +
      'onchange="_materiaisSeparacaoTmp[\'' + id + '\']=parseInt(this.value)||1"></div>';
  }).join('');
}

function _togglePsepMaterial(id) {
  if (_materiaisSeparacaoTmp[id]) delete _materiaisSeparacaoTmp[id];
  else _materiaisSeparacaoTmp[id] = 1;
  _renderPickerMateriaisSeparacao();
}

// ===================== CONFIRMAÇÃO (com suporte a ajuste via delta) =====================
async function confirmarSeparacao() {
  var ag = db.agenda.find(function (x) { return x.id === _pedidoAtualSeparacao; });
  if (!ag) return;

  var anterior = ag.materiaisSeparados || {};
  var novo = Object.assign({}, _materiaisSeparacaoTmp);
  var idsEnvolvidos = new Set(Object.keys(anterior).concat(Object.keys(novo)));
  var matsAtualizados = [];

  idsEnvolvidos.forEach(function (matId) {
    var m = db.materiais.find(function (x) { return x.id === matId; });
    if (!m) return;
    var qtdAntes = parseInt(anterior[matId] || 0);
    var qtdDepois = parseInt(novo[matId] || 0);
    var delta = qtdDepois - qtdAntes; // positivo = precisa descontar mais; negativo = devolve ao estoque
    if (delta !== 0) {
      m.qtd = Math.max(0, parseInt(m.qtd) - delta);
      matsAtualizados.push(m);
    }
  });

  ag.materiaisSeparados = novo;
  ag.separado = true;

  saveData(); renderAll();
  var modal = document.getElementById('modal-separar-pedido');
  if (modal) modal.remove();

  await dbAtualizar('agenda', ag);
  for (const m of matsAtualizados) await dbAtualizar('materiais', m);

  showToast('Pedido separado com sucesso!');
}
