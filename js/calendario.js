/* =====================================================
   LIZA FESTAS — calendario.js
   Calendário estilo Google Agenda: visão Mês e Semana
   ===================================================== */

var _calView = 'mes';
var _calData = new Date();

function calSetView(view) {
  _calView = view;
  document.getElementById('calBtnMes').classList.toggle('active', view === 'mes');
  document.getElementById('calBtnSem').classList.toggle('active', view === 'semana');
  renderCalendario();
}

function calNavegar(dir) {
  if (_calView === 'mes') {
    _calData = new Date(_calData.getFullYear(), _calData.getMonth() + dir, 1);
  } else {
    _calData = new Date(_calData.getTime() + dir * 7 * 86400000);
  }
  renderCalendario();
}

function calHoje() {
  _calData = new Date();
  renderCalendario();
}

function _calEventos() {
  var eventos = [];
  db.agenda.forEach(function(ag) {
    ag.sessoes.forEach(function(s, idx) {
      if (!s.data) return;
      eventos.push({
        data: s.data, hora: ag.horaRetirada || '', horaFim: '',
        cliente: ag.cliente,
        servico: (function(){ var ids=s.servicoIds||[]; if(ids.length) return ids.map(function(id){ var sv=db.festas.find(function(x){return x.id===id;}); return sv?sv.nome:id; }).join(' + '); return s.servico||_agServicos(ag); })(),
        status: s.status, agId: ag.id, sessaoIdx: idx,
        cor: (s.cor || (ag.statusCor && _coresStatus[ag.statusCor] ? _coresStatus[ag.statusCor].border : '') || '')
      });
    });
  });
  return eventos;
}

function _calClasse(status, data) {
  var hoje = _hoje();
  if (status === 'realizado') return 'realizado';
  if (status === 'presente') return 'presente';
  if (data === hoje) return 'hoje-ev';
  if (data < hoje) return 'atrasado';
  return 'pendente';
}

function renderCalendario() {
  var grid = document.getElementById('calGrid');
  var titulo = document.getElementById('calTitulo');
  if (!grid || !titulo) return;
  if (_calView === 'mes') _renderCalMes(grid, titulo);
  else _renderCalSemana(grid, titulo);
}

function _renderCalMes(grid, titulo) {
  var hoje = _hoje();
  var ano = _calData.getFullYear(), mes = _calData.getMonth();
  var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  titulo.textContent = meses[mes] + ' ' + ano;

  var eventos = _calEventos();
  var evMap = {};
  eventos.forEach(function(e) { if (!evMap[e.data]) evMap[e.data] = []; evMap[e.data].push(e); });

  var primeiroDia = new Date(ano, mes, 1).getDay();
  var diasNoMes = new Date(ano, mes + 1, 0).getDate();
  var diasAntes = primeiroDia === 0 ? 6 : primeiroDia - 1;

  var html = '<div class="cal-month-grid">';
  var dows = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  dows.forEach(function(d, i) { html += '<div class="cal-dow' + (i >= 5 ? ' fim-semana' : '') + '">' + d + '</div>'; });

  var mesPrev = new Date(ano, mes, 0);
  for (var i = diasAntes - 1; i >= 0; i--) {
    var dNum = mesPrev.getDate() - i;
    html += '<div class="cal-day outro-mes"><div class="cal-day-num">' + dNum + '</div></div>';
  }

  for (var d = 1; d <= diasNoMes; d++) {
    var dStr = ano + '-' + String(mes+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var isHoje = dStr === hoje;
    var evs = (evMap[dStr] || []).slice().sort(function(a,b){ return (a.hora||'99:99').localeCompare(b.hora||'99:99'); });
    html += '<div class="cal-day' + (isHoje ? ' hoje-cal' : '') + '">';
    html += '<div class="cal-day-num">' + d + '</div>';
    var max = 3;
    evs.slice(0, max).forEach(function(e) {
      var cls = _calClasse(e.status, e.data);
      var evStyle = e.cor ? 'style="background:' + e.cor + ';color:white;border:none;opacity:' + (e.status==='falta'?'0.5':'1') + '"' : '';
      var _horaLabel = e.hora ? (e.horaFim ? e.hora + '-' + e.horaFim + ' ' : e.hora + ' ') : '';
      html += '<div class="cal-event ' + cls + '" ' + evStyle + ' onclick="calAbrirDetalhe(\'' + e.agId + '\',' + e.sessaoIdx + ')" title="' + _horaLabel + e.cliente + '">' + _horaLabel + e.cliente + '</div>';
    });
    if (evs.length > max) html += '<div class="cal-more" onclick="calVerDia(\'' + dStr + '\')">+' + (evs.length - max) + ' mais</div>';
    html += '</div>';
  }

  var total = diasAntes + diasNoMes;
  var diasDepois = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (var k = 1; k <= diasDepois; k++) {
    html += '<div class="cal-day outro-mes"><div class="cal-day-num">' + k + '</div></div>';
  }
  html += '</div>';
  grid.innerHTML = html;
}

function _renderCalSemana(grid, titulo) {
  var hoje = _hoje();
  var dow = _calData.getDay();
  var diffLun = (dow === 0 ? -6 : 1 - dow);
  var seg = new Date(_calData.getTime() + diffLun * 86400000);

  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var diasSem = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(seg.getTime() + i * 86400000);
    diasSem.push({ date: d, str: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') });
  }

  var priStr = fmtDate(diasSem[0].str), ultStr = fmtDate(diasSem[6].str);
  titulo.textContent = priStr + ' — ' + ultStr;

  var eventos = _calEventos();
  var evMap = {};
  eventos.forEach(function(e) { if (!evMap[e.data]) evMap[e.data] = []; evMap[e.data].push(e); });

  var dows = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  var horas = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

  var html = '<div class="cal-week-scroll"><div class="cal-week-grid">';
  html += '<div class="cal-week-header"></div>';
  diasSem.forEach(function(d, i) {
    var isHoje = d.str === hoje;
    html += '<div class="cal-week-header' + (isHoje ? ' hoje-col' : '') + '"><div class="cal-week-dow">' + dows[i] + '</div><div class="cal-week-day-num">' + d.date.getDate() + ' ' + meses[d.date.getMonth()] + '</div></div>';
  });

  var CELL_H = 36;

  horas.forEach(function(h) {
    html += '<div class="cal-week-time">' + h + '</div>';
    diasSem.forEach(function(d) {
      var isHoje = d.str === hoje;
      var horaNum = parseInt(h.split(':')[0]);
      var evs = (evMap[d.str] || []).filter(function(e){
        if (!e.hora) return false;
        var eHora = parseInt(e.hora.split(':')[0]);
        return eHora === horaNum;
      });
      html += '<div class="cal-week-cell' + (isHoje ? ' hoje-col' : '') + '" style="position:relative;min-height:' + CELL_H + 'px;overflow:visible">';
      evs.forEach(function(e) {
        var cls = _calClasse(e.status, e.data);
        var eMin = parseInt((e.hora.split(':')[1]) || 0);
        var topPct = (eMin / 60) * 100;
        var alturaStyle = '';
        var horaLabel = e.hora;
        if (e.horaFim) {
          var hIni = parseInt(e.hora.split(':')[0]) * 60 + parseInt(e.hora.split(':')[1] || 0);
          var hFim = parseInt(e.horaFim.split(':')[0]) * 60 + parseInt(e.horaFim.split(':')[1] || 0);
          var durMin = hFim - hIni;
          if (durMin > 0) {
            var altPx = Math.round((durMin / 60) * CELL_H);
            alturaStyle = 'height:' + altPx + 'px;min-height:' + altPx + 'px;';
            horaLabel = e.hora + '-' + e.horaFim;
          }
        }
        var bgStyle = e.cor ? 'background:' + e.cor + ';color:white;border:none;' : 'background:#FCE4EC;color:#880E4F;';
        html += '<div class="cal-week-event ' + cls + '" '
          + 'style="position:absolute;left:1px;right:1px;top:' + topPct + '%;' + alturaStyle + bgStyle + 'overflow:hidden;z-index:1" '
          + 'onclick="calAbrirDetalhe(\'' + e.agId + '\',' + e.sessaoIdx + ')" '
          + 'title="' + horaLabel + ' ' + e.cliente + '">'
          + horaLabel + ' ' + e.cliente
          + '</div>';
      });
      html += '</div>';
    });
  });

  html += '<div class="cal-week-time" style="font-size:9px;color:var(--text-light)">—</div>';
  diasSem.forEach(function(d) {
    var isHoje = d.str === hoje;
    var evs = (evMap[d.str] || []).filter(function(e){ return !e.hora; });
    html += '<div class="cal-week-cell' + (isHoje ? ' hoje-col' : '') + '">';
    evs.forEach(function(e) {
      var cls = _calClasse(e.status, e.data);
      var wStyleSH = e.cor ? 'style="background:' + e.cor + ';color:white;border:none"' : '';
      html += '<div class="cal-week-event ' + cls + '" ' + wStyleSH + ' onclick="calAbrirDetalhe(\'' + e.agId + '\',' + e.sessaoIdx + ')">' + e.cliente + '</div>';
    });
    html += '</div>';
  });

  html += '</div></div>';
  grid.innerHTML = html;
}

function calVerDia(dStr) {
  _calView = 'semana';
  _calData = new Date(dStr + 'T12:00:00');
  document.getElementById('calBtnMes').classList.remove('active');
  document.getElementById('calBtnSem').classList.add('active');
  renderCalendario();
}

function calAbrirDetalhe(agId, sessaoIdx) {
  var ag = db.agenda.find(function(x){ return x.id === agId; });
  if (!ag) return;
  var s = ag.sessoes[sessaoIdx];
  if (!s) return;
  var servico = (function(){ var ids=s.servicoIds||[]; if(ids.length) return ids.map(function(id){ var sv=db.festas.find(function(x){return x.id===id;}); return sv?sv.nome:id; }).join(' + '); return s.servico||_agServicos(ag); })();
  var statusLabel = {realizado:'✓ Realizado', presente:'☑️ Presente', pendente:'Pendente'}[s.status] || (s.data < _hoje() ? 'Não compareceu' : s.status);
  var isRealizado = s.status === 'realizado';

  var modal = document.createElement('div');
  modal.className = 'cal-modal';
  modal.id = 'cal-detalhe-modal';
  modal.innerHTML =
    '<div class="cal-modal-box">' +
    '<div class="cal-modal-header">' +
    '<span style="color:#FAF0F2;font-family:Cormorant Garamond,serif;font-size:17px;letter-spacing:1.5px">🗓️ Sessão ' + (sessaoIdx+1) + '</span>' +
    '<button onclick="document.getElementById(\'cal-detalhe-modal\').remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer">✕</button>' +
    '</div>' +
    '<div class="cal-modal-body">' +
    '<div style="margin-bottom:0.5rem"><div class="cal-modal-label">Cliente</div><div style="font-size:15px;font-weight:500;color:var(--text-dark)">' + ag.cliente + '</div></div>' +
    '<div style="margin-bottom:0.5rem"><div class="cal-modal-label">Festa</div><div style="font-size:13px;color:var(--text-mid)">' + servico + '</div></div>' +
    '<div style="margin-bottom:0.5rem"><div class="cal-modal-label">Data</div><div style="font-size:13px;color:var(--text-mid)">' + fmtDate(s.data) + (s.hora ? ' às ' + s.hora + (s.horaFim ? ' - ' + s.horaFim : '') : '') + '</div></div>' +
    '<div style="margin-bottom:0.5rem"><div class="cal-modal-label">Status</div><div style="font-size:13px">' + statusLabel + '</div></div>' +
    (ag.obs ? '<div style="margin-bottom:0.5rem"><div class="cal-modal-label">Obs</div><div style="font-size:12px;color:var(--text-light)">' + ag.obs + '</div></div>' : '') +
    '<div class="cal-modal-actions">' +
    (!isRealizado ? '<button class="btn btn-primary btn-sm" onclick="document.getElementById(\'cal-detalhe-modal\').remove();realizarSessao(\'' + agId + '\',' + sessaoIdx + ')">✓ Realizar</button>' : '') +
    (!isRealizado ? '<button style="background:#E7F7EE;border:1px solid #7DB87D;color:#276749;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer" onclick="document.getElementById(\'cal-detalhe-modal\').remove();enviarWhatsappAgenda(\'' + agId + '\')">📱 WhatsApp</button>' : '') +
    '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'cal-detalhe-modal\').remove()">Fechar</button>' +
    '</div></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
}
