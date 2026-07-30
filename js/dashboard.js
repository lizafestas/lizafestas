/* =====================================================
   LIZA FESTAS — dashboard.js
   renderDashboard, chips de festa/material, status
   ===================================================== */

let selectedServicos = [];
let selectedMateriais = {};

var _coresStatus = {
  reservado:    { bg:'#E8F5E9', border:'#66BB6A', label:'🟢 Reservado' },
  alugado:      { bg:'#FFEBEE', border:'#EF5350', label:'🔴 Alugado' },
  devolveu:     { bg:'#F5F5F5', border:'#9E9E9E', label:'⚫ Devolveu' },
  personalizado:{ bg:'#F3E5F5', border:'#AB47BC', label:'🟣 Personalizado' },
  credito:      { bg:'#FFF3E0', border:'#FFA726', label:'🟠 Crédito' }
};

function renderDashboard() {
  const atends = filterByPeriod(db.atendimentos, 'data');
  const despAdms = filterByPeriod(db.despAdm, 'data');
  const despExtras = filterByPeriod(db.despExtra, 'data');

  const receita = atends.reduce((s,a) => s + parseFloat(a.valor||0), 0);
  const custDespAdm = despAdms.reduce((s,d) => s + parseFloat(d.valor||0), 0);
  const custDespExtra = despExtras.reduce((s,d) => s + parseFloat(d.valor||0), 0);
  const totalCusto = custDespAdm + custDespExtra;
  const lucro = receita - totalCusto;

  var isAdmin = _usuarioLogado && _usuarioLogado.nivel === 'admin';
  var temFinanceiro = isAdmin || (_usuarioLogado && (_usuarioLogado.permissoes||[]).indexOf('dashboard_financeiro') >= 0);

  const cards = [
    {label:'Receita', value: fmtMoney(receita), sub: atends.length + ' atendimentos', cls:'gold', icon:'💰', fin:true},
    {label:'Custos', value: fmtMoney(totalCusto), sub: 'Mat + Desp.', cls:'red', icon:'📉', fin:true},
    {label:'Lucro Líquido', value: fmtMoney(lucro), sub: lucro>=0?'Positivo':'Atenção!', cls: lucro>=0?'green':'red', icon:'✨', fin:true},
    {label:'Atendimentos', value: atends.length, sub: 'no período', cls:'', icon:'👐', fin:false}
  ];

  document.getElementById('dashCards').innerHTML = cards
    .filter(c => !c.fin || temFinanceiro)
    .map(c => `
    <div class="summary-card">
      <div class="card-icon">${c.icon}</div>
      <div class="card-label">${c.label}</div>
      <div class="card-value ${c.cls}">${c.value}</div>
      <div class="card-sub">${c.sub}</div>
    </div>`).join('');

  // TOP 5 FESTAS
  const contagem = {};
  atends.forEach(a => {
    const ids = a.servicoIds || (a.servicoId ? [a.servicoId] : []);
    ids.forEach(sid => { contagem[sid] = (contagem[sid]||0)+1; });
  });
  const top5 = Object.entries(contagem).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCount = top5.length ? top5[0][1] : 1;
  document.getElementById('top5Panel').innerHTML = top5.length ? top5.map(([sid, cnt], i) => {
    const s = db.festas.find(x=>x.id===sid);
    return `<div class="top5-item">
      <div class="top5-rank">${i+1}</div>
      <div class="top5-info"><div class="top5-name">${s?s.nome:'Festa removida'}</div><div class="top5-cat">${s?s.categoria||'':''}</div></div>
      <div class="top5-bar-wrap"><div class="top5-bar"><div class="top5-bar-fill" style="width:${(cnt/maxCount*100)}%"></div></div></div>
      <div class="top5-count">${cnt}x</div>
    </div>`;
  }).join('') : '<div class="empty-state"><div class="empty-icon">🎉</div><p>Nenhuma festa no período</p></div>';

  // PAGAMENTOS
  const pagtos = {pix:0, dinheiro:0, cartao_debito:0, cartao_credito:0};
  atends.forEach(a => { if(a.pagto) pagtos[a.pagto] = (pagtos[a.pagto]||0) + parseFloat(a.valor||0); });
  const totalPagto = Object.values(pagtos).reduce((s,v)=>s+v,0);
  const cores = {pix:'#7DB87D', dinheiro:'#C9A84C', cartao_debito:'#6BA3D6', cartao_credito:'#C98890'};
  const labels = {pix:'PIX', dinheiro:'Dinheiro', cartao_debito:'Cartão Débito', cartao_credito:'Cartão Crédito'};
  const pagtoHtml = Object.entries(pagtos).filter(([k,v])=>v>0).map(([k,v]) => `
    <div class="pagto-item">
      <div class="pagto-dot" style="background:${cores[k]}"></div>
      <div class="pagto-label">${labels[k]}</div>
      <div class="pagto-value">${fmtMoney(v)}</div>
      <div class="pagto-pct">${totalPagto?Math.round(v/totalPagto*100):0}%</div>
    </div>`).join('');
  document.getElementById('pagtoPanel').innerHTML = pagtoHtml || '<div class="empty-state"><div class="empty-icon">💳</div><p>Nenhum pagamento no período</p></div>';

  // ÚLTIMAS FESTAS
  const ultimos = [...db.atendimentos].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,5);
  document.getElementById('ultimosAtend').innerHTML = ultimos.length ? `<table class="data-table"><thead><tr><th>Data</th><th>Cliente</th><th>Festa</th><th>Valor</th></tr></thead><tbody>` +
    ultimos.map(a => {
      const ids2 = a.servicoIds || (a.servicoId ? [a.servicoId] : []);
      const sNomes = ids2.map(sid=>{const sv=db.festas.find(x=>x.id===sid);return sv?sv.nome:'?'}).join(' + ')||'—';
      return `<tr class="data-row" style="cursor:default"><td>${fmtDate(a.data)}</td><td>${a.cliente}</td><td>${sNomes}</td><td>${fmtMoney(a.valor)}</td></tr>`;
    }).join('') + '</tbody></table>'
  : '<div class="empty-state" style="padding:2rem"><div class="empty-icon">🎊</div><p>Nenhuma festa registrada</p></div>';

  // FESTAS DO DIA
  var _h = _hoje();
  var _sl = [];
  db.agenda.forEach(function(ag) {
    ag.sessoes.forEach(function(s, idx) {
      if (s.data === _h) _sl.push({ag: ag, idx: idx, st: s.status});
    });
  });
  var _sp = document.getElementById('sessoesHojePanel');
  if (_sp) {
    if (!_sl.length) {
      _sp.innerHTML = '<div class="empty-state" style="padding:2rem"><div class="empty-icon">🎉</div><p>Nenhuma festa hoje</p></div>';
    } else {
      var _rows = _sl.map(function(item) {
        var _sessao = item.ag.sessoes[item.idx];
        var _badge = item.st==='realizado'
          ? '<span class="badge-pill badge-ativo" style="font-size:11px">✓ Realizado</span>'
          : '<span style="background:var(--rose-light);color:var(--rose-dark);padding:3px 10px;border-radius:20px;font-size:11px">Pendente</span>';
        var _btn = item.st!=='realizado'
          ? `<button class="btn btn-primary btn-sm" onclick="realizarSessao('${item.ag.id}',${item.idx})" style="font-size:11px;padding:4px 10px">✓ Realizar</button>` : '';
        var _hora = _sessao.hora ? ` <span style="color:var(--text-light);font-size:11px">${_sessao.hora}</span>` : '';
        var _srvIds = _sessao.servicoIds || [];
        var _srvNome = _srvIds.length
          ? _srvIds.map(id => { const sv=db.festas.find(x=>x.id===id); return sv?sv.nome:id; }).join(' + ')
          : (_sessao.servico || _agServicos(item.ag));
        return `<tr><td><strong>${item.ag.cliente}</strong>${_hora}</td><td>${_srvNome||'—'}</td><td>${_badge}</td><td>${_btn}</td></tr>`;
      }).join('');
      _sp.innerHTML = `<table class="data-table"><thead><tr><th>Cliente</th><th>Festa</th><th>Status</th><th></th></tr></thead><tbody>${_rows}</tbody></table>`;
    }
  }

  renderStatusAgendaPanel();
}

function renderStatusAgendaPanel() {
  var panel = document.getElementById('statusAgendaPanel');
  if (!panel) return;
  var grupos = {};
  Object.keys(_coresStatus).forEach(k => grupos[k] = []);
  grupos[''] = [];
  db.agenda.forEach(ag => {
    var s = ag.statusCor || '';
    (grupos[s] !== undefined ? grupos[s] : grupos['']).push(ag);
  });
  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem">';
  Object.entries(_coresStatus).forEach(([key, cor]) => {
    var lista = grupos[key] || [];
    html += `<div onclick="abrirStatusModal('${key}')" style="cursor:pointer;background:${cor.bg};border:2px solid ${cor.border};border-radius:12px;padding:1rem;text-align:center">
      <div style="font-size:22px;margin-bottom:4px">${cor.label.split(' ')[0]}</div>
      <div style="font-size:13px;font-weight:600;color:${cor.border};margin-bottom:6px">${cor.label.split(' ').slice(1).join(' ')}</div>
      <div style="font-size:28px;font-weight:700;color:${cor.border}">${lista.length}</div>
      <div style="font-size:10px;color:var(--text-light);text-transform:uppercase">agendamentos</div>
    </div>`;
  });
  var semStatus = grupos[''] || [];
  if (semStatus.length) {
    html += `<div onclick="abrirStatusModal('')" style="cursor:pointer;background:#F9F9F9;border:2px solid #DDD;border-radius:12px;padding:1rem;text-align:center">
      <div style="font-size:22px;margin-bottom:4px">⬜</div>
      <div style="font-size:13px;font-weight:600;color:#999;margin-bottom:6px">Sem status</div>
      <div style="font-size:28px;font-weight:700;color:#999">${semStatus.length}</div>
      <div style="font-size:10px;color:var(--text-light);text-transform:uppercase">agendamentos</div>
    </div>`;
  }
  html += '</div>';
  panel.innerHTML = html;
}

function abrirStatusModal(statusKey) {
  var modal = document.getElementById('statusAgendaModal');
  var title = document.getElementById('statusAgendaModalTitle');
  var body = document.getElementById('statusAgendaModalBody');
  if (!modal||!title||!body) return;
  var cor = _coresStatus[statusKey];
  var lista = db.agenda.filter(ag => (ag.statusCor||'') === statusKey);
  title.innerHTML = cor ? `<span style="color:${cor.border}">${cor.label}</span> — ${lista.length} agendamento(s)` : `⬜ Sem status — ${lista.length} agendamento(s)`;
  body.innerHTML = !lista.length
    ? '<div class="empty-state"><div class="empty-icon">📭</div><p>Nenhum agendamento neste status</p></div>'
    : '<table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:2px solid #EEE">'
      + '<th style="text-align:left;padding:8px;font-size:11px;color:var(--text-light)">CLIENTE</th>'
      + '<th style="text-align:left;padding:8px;font-size:11px;color:var(--text-light)">FESTAS</th>'
      + '<th style="text-align:left;padding:8px;font-size:11px;color:var(--text-light)">RETIRADA</th>'
      + '<th style="text-align:left;padding:8px;font-size:11px;color:var(--text-light)">SINAL</th><th></th></tr></thead><tbody>'
      + lista.map(ag => {
          var srvNome = _agServicos(ag) || '—';
          var ret = ag.dataRetirada ? fmtDate(ag.dataRetirada)+(ag.horaRetirada?' '+ag.horaRetirada:'') : '—';
          var sinal = ag.sinal > 0 ? 'R$ '+parseFloat(ag.sinal).toFixed(2).replace('.',',') : '—';
          return `<tr style="border-bottom:1px solid #F0F0F0;cursor:pointer" onclick="fecharStatusModalIrAgenda('${ag.id}')">
            <td style="padding:10px 8px;font-weight:600">${ag.cliente}</td>
            <td style="padding:10px 8px;font-size:12px;color:var(--text-light);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${srvNome}</td>
            <td style="padding:10px 8px;font-size:12px">${ret}</td>
            <td style="padding:10px 8px;font-size:12px">${sinal}</td>
            <td style="padding:10px 8px"><button class="btn btn-secondary btn-sm" style="font-size:11px">Ver →</button></td></tr>`;
        }).join('') + '</tbody></table>';
  modal.style.display = 'block';
}

function fecharStatusModalIrAgenda(agId) {
  document.getElementById('statusAgendaModal').style.display = 'none';
  showSection('agenda');
  setTimeout(function(){
    setAgendaFiltro('tudo', document.querySelector('.agenda-btn:last-child'));
    var ag = db.agenda.find(x => x.id===agId);
    if (ag) {
      var buscaEl = document.getElementById('agBuscaCliente');
      if (buscaEl) { buscaEl.value = ag.cliente; renderAgenda(); }
      setTimeout(function(){
        var card = document.getElementById('agcard-'+agId);
        if (card) { card.scrollIntoView({behavior:'smooth',block:'center'}); card.style.outline='3px solid #AB47BC'; setTimeout(()=>{card.style.outline='';},2000); }
      }, 400);
    }
  }, 300);
}

// ===================== CHIPS DE FESTA/MATERIAL (Atendimentos e Agenda) =====================
function renderServiceChips() {
  var busca = ((document.getElementById('atend-servico-busca')||{value:''}).value||'').toLowerCase();
  var buscaAg = ((document.getElementById('ag-servico-busca')||{value:''}).value||'').toLowerCase();
  const ativos = db.festas.filter(s=>s.status==='ativo' && (!busca || s.nome.toLowerCase().includes(busca)));
  const ativosAg = db.festas.filter(s=>s.status==='ativo' && (!buscaAg || s.nome.toLowerCase().includes(buscaAg)));

  const scEl = document.getElementById('serviceChips');
  if (scEl) {
    const lista = document.getElementById('atend-servico-busca') ? ativos : ativosAg;
    scEl.innerHTML = lista.length ?
      lista.map(s => `<div class="service-chip ${selectedServicos.includes(s.id)?'selected':''}" data-id="${s.id}">${s.nome}</div>`).join('') :
      `<div style="font-size:12px;color:var(--text-light);padding:0.5rem">Cadastre festas primeiro</div>`;
    scEl.querySelectorAll('.service-chip').forEach(el => el.addEventListener('click', function(){ toggleServico(this.dataset.id); }));
  }
  const sc2El = document.getElementById('serviceChips2');
  if (sc2El) {
    sc2El.innerHTML = ativos.length ?
      ativos.map(s => `<div class="service-chip ${selectedServicos.includes(s.id)?'selected':''}" data-id="${s.id}">${s.nome}</div>`).join('') :
      `<div style="font-size:12px;color:var(--text-light);padding:0.5rem">Cadastre festas primeiro</div>`;
    sc2El.querySelectorAll('.service-chip').forEach(el => el.addEventListener('click', function(){ toggleServico(this.dataset.id); }));
  }

  var buscaMat = ((document.getElementById('atend-material-busca')||{value:''}).value||'').toLowerCase();
  var buscaMatAg = ((document.getElementById('ag-material-busca')||{value:''}).value||'').toLowerCase();

  const mcEl = document.getElementById('materialChips');
  if (mcEl) {
    const matsFiltrados = db.materiais.filter(m => !buscaMat || m.nome.toLowerCase().includes(buscaMat));
    mcEl.innerHTML = matsFiltrados.length ?
      matsFiltrados.map(m => `<div class="material-chip ${selectedMateriais[m.id]?'selected':''}" data-id="${m.id}">${m.nome}${selectedMateriais[m.id]?' ×'+selectedMateriais[m.id]:''}</div>`).join('') :
      `<div style="font-size:12px;color:var(--text-light);padding:4px">Cadastre materiais primeiro</div>`;
    mcEl.querySelectorAll('.material-chip').forEach(el => el.addEventListener('click', function(){ toggleMaterial(this.dataset.id); }));
  }

  const mcAgEl = document.getElementById('materialChipsAgenda');
  if (mcAgEl) {
    const matsFiltradosAg = db.materiais.filter(m => !buscaMatAg || m.nome.toLowerCase().includes(buscaMatAg));
    mcAgEl.innerHTML = matsFiltradosAg.length ?
      matsFiltradosAg.map(m => `<div class="material-chip ${selectedMateriais[m.id]?'selected':''}" data-id="${m.id}">${m.nome}${selectedMateriais[m.id]?' ×'+selectedMateriais[m.id]:''}</div>`).join('') :
      `<div style="font-size:12px;color:var(--text-light);padding:4px">Cadastre materiais primeiro</div>`;
    mcAgEl.querySelectorAll('.material-chip').forEach(el => el.addEventListener('click', function(){ toggleMaterial(this.dataset.id); }));
  }

  _renderAtendMatQtd();
  _renderAgMatQtd();
}

function _renderAtendMatQtd() {
  var wrap = document.getElementById('atend-material-qtd-wrap');
  if (!wrap) return;
  var ids = Object.keys(selectedMateriais);
  if (!ids.length) { wrap.innerHTML=''; return; }
  wrap.innerHTML = ids.map(id => {
    var m = db.materiais.find(x=>x.id===id);
    if (!m) return '';
    return `<div style="display:flex;align-items:center;gap:6px;background:var(--cream);border-radius:8px;padding:4px 10px;font-size:12px">
      <span>${m.nome}</span><label style="font-size:11px;color:var(--text-light)">Qtd:</label>
      <input type="number" min="1" value="${selectedMateriais[id]||1}" style="width:50px;padding:2px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px" onchange="selectedMateriais['${id}']=parseInt(this.value)||1"></div>`;
  }).join('');
}

function _renderAgMatQtd() {
  var wrap = document.getElementById('ag-material-qtd-wrap');
  if (!wrap) return;
  var ids = Object.keys(selectedMateriais);
  if (!ids.length) { wrap.innerHTML=''; return; }
  wrap.innerHTML = ids.map(id => {
    var m = db.materiais.find(x=>x.id===id);
    if (!m) return '';
    return `<div style="display:flex;align-items:center;gap:6px;background:var(--cream);border-radius:8px;padding:4px 10px;font-size:12px">
      <span>${m.nome}</span><label style="font-size:11px;color:var(--text-light)">Qtd:</label>
      <input type="number" min="1" value="${selectedMateriais[id]||1}" style="width:50px;padding:2px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px" onchange="selectedMateriais['${id}']=parseInt(this.value)||1"></div>`;
  }).join('');
}

function toggleMaterial(id) {
  const m = db.materiais.find(x=>x.id===id);
  if (!m) return;
  if (selectedMateriais[id]) delete selectedMateriais[id];
  else selectedMateriais[id] = 1;
  renderServiceChips();
}

function toggleServico(id) {
  if (selectedServicos.includes(id)) selectedServicos = selectedServicos.filter(x=>x!==id);
  else selectedServicos.push(id);
  const total = selectedServicos.reduce((sum, sid) => {
    const s = db.festas.find(x=>x.id===sid);
    return sum + (s ? parseFloat(s.preco) : 0);
  }, 0);
  var vEl = document.getElementById('atend-valor');
  if (total > 0 && vEl) vEl.value = total.toFixed(2);
  renderServiceChips();
}

function toggleStatusMenuAtend(id) {
  document.querySelectorAll('[id^="statusmenu-atend-"]').forEach(el => { if (el.id !== 'statusmenu-atend-'+id) el.style.display='none'; });
  var menu = document.getElementById('statusmenu-atend-'+id);
  if (menu) menu.style.display = menu.style.display==='none' ? 'block' : 'none';
}

async function setStatusAtend(id, statusCor) {
  var a = db.atendimentos.find(x=>x.id===id);
  if (!a) return;
  a.statusCor = statusCor;
  saveData(); renderAtendimentos();
  await dbAtualizar('atendimentos', a);

  // Acha o agendamento vinculado, seja pelo sinal ou pelo atendimento final
  var ag = db.agenda.find(x => x.sinalAtendId === id || x.atendimentoId === id);
  if (ag) {
    ag.statusCor = statusCor;
    saveData(); renderAll();
    await dbAtualizar('agenda', ag);

    // Propaga pro OUTRO atendimento do mesmo agendamento (sinal ↔ final)
    var outroId = (ag.sinalAtendId === id) ? ag.atendimentoId : ag.sinalAtendId;
    if (outroId) {
      var outro = db.atendimentos.find(x => x.id === outroId);
      if (outro && outro.statusCor !== statusCor) {
        outro.statusCor = statusCor;
        saveData(); renderAtendimentos();
        await dbAtualizar('atendimentos', outro);
      }
    }
  }

  var menu = document.getElementById('statusmenu-atend-'+id);
  if (menu) menu.style.display='none';
}

document.addEventListener('click', function(){
  document.querySelectorAll('[id^="statusmenu-atend-"]').forEach(el => el.style.display='none');
});

function atualizarCorStatus(sel) {
  var cor = _coresStatus[sel.value];
  if (cor) sel.style.borderLeftColor = cor.border;
}
