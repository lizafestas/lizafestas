/* =====================================================
   LIZA FESTAS — alertaClientes.js
   Alerta global de novos cadastros vindos da página
   pública /cliente/ — funciona em qualquer tela.
   Banner fixo + badge + som + notificação do navegador
   + contador no título da aba. Some ao abrir o cadastro.
   ===================================================== */

var _ALERTA_CLI_INTERVALO = 45000; // 45s
var _alertaCliTimer = null;
var _alertaCliConhecidos = null;   // ids já alertados nesta sessão (evita repetir som/notificação)
var _alertaCliAudioCtx = null;
var _tituloOriginal = document.title;

function iniciarAlertaClientes() {
  if (_alertaCliTimer) { atualizarAlertaClientes(); return; } // init() pode rodar de novo após novo login
  _alertaCliConhecidos = new Set((db.clientes || []).map(function (c) { return c.id; }));

  // Destrava o áudio no primeiro clique (política de autoplay dos navegadores)
  document.addEventListener('click', _desbloquearAudioCli, { once: true });
  _pedirPermissaoNotificacaoCli();

  atualizarAlertaClientes();
  if (_cliNaoVistos().length) _somAlertaCli();

  _alertaCliTimer = setInterval(_pollingClientes, _ALERTA_CLI_INTERVALO);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) _pollingClientes(); });
}

async function _pollingClientes() {
  if (typeof _usuarioLogado !== 'undefined' && !_usuarioLogado) return;
  try {
    var resp = await fetch(SUPA_URL + '/rest/v1/clientes?visto=eq.false&select=*&order=criado_em.desc', { headers: _supaHeaders() });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var rows = await resp.json();
    var novos = [];
    var idsRemotos = new Set();

    rows.forEach(function (r) {
      idsRemotos.add(r.id);
      var c = _fromRowCliente(r);
      if (!db.clientes.find(function (x) { return x.id === c.id; })) db.clientes.push(c);
      if (!_alertaCliConhecidos.has(c.id)) { _alertaCliConhecidos.add(c.id); novos.push(c); }
    });
    // Aberto em outro aparelho → deixa de ser "novo" aqui também
    db.clientes.forEach(function (c) { if (!c.visto && !idsRemotos.has(c.id)) c.visto = true; });

    if (novos.length) {
      saveData();
      _somAlertaCli();
      _notificarNavegadorCli(novos);
      addLog('INFO', '🔔 ' + novos.length + ' novo(s) cadastro(s) de cliente recebido(s)');
    }
    renderClientes();
    atualizarAlertaClientes();
  } catch (e) {
    addLog('WARN', '⚠️ Alerta de clientes: ' + e.message);
  }
}

function atualizarAlertaClientes() {
  var pend = _cliNaoVistos().sort(function (a, b) { return (b.criadoEm || '').localeCompare(a.criadoEm || ''); });
  var banner = document.getElementById('alertaClientesBanner');
  if (typeof updateBadges === 'function') updateBadges();
  document.title = pend.length ? '(' + pend.length + ') ' + _tituloOriginal : _tituloOriginal;
  if (!banner) return;

  var logado = typeof _usuarioLogado === 'undefined' || !!_usuarioLogado;
  if (!pend.length || !logado) { banner.style.display = 'none'; banner.innerHTML = ''; return; }

  var nomes = pend.slice(0, 3).map(function (c) { return _esc(c.nome); }).join(', ') + (pend.length > 3 ? ' e mais ' + (pend.length - 3) : '');
  banner.innerHTML =
    '<span class="alerta-cli-sino">🔔</span>' +
    '<span class="alerta-cli-texto"><strong>' + (pend.length === 1 ? 'Novo cadastro de cliente:' : pend.length + ' novos cadastros de clientes:') + '</strong> ' + nomes + '</span>' +
    '<button class="alerta-cli-btn" onclick="_abrirAlertaClientes()">Ver agora</button>';
  banner.style.display = 'flex';
}

function _abrirAlertaClientes() {
  var pend = _cliNaoVistos().sort(function (a, b) { return (b.criadoEm || '').localeCompare(a.criadoEm || ''); });
  if (typeof fecharDrawer === 'function') fecharDrawer();
  showSection('clientes');
  if (pend.length === 1) { abrirCliente(pend[0].id, 'info'); return; }
  setCliFiltro('novos');
}

// ===================== SOM =====================
function _desbloquearAudioCli() {
  try {
    if (!_alertaCliAudioCtx) _alertaCliAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_alertaCliAudioCtx.state === 'suspended') _alertaCliAudioCtx.resume();
  } catch (e) {}
}

function _somAlertaCli() {
  try {
    if (!_alertaCliAudioCtx) _alertaCliAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var ctx = _alertaCliAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    [[880, 0], [1175, 0.18], [1480, 0.36]].forEach(function (n) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = n[0];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + n[1]);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + n[1] + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n[1] + 0.3);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + n[1]); o.stop(ctx.currentTime + n[1] + 0.32);
    });
  } catch (e) { /* sem áudio disponível — banner e badge continuam */ }
}

// ===================== NOTIFICAÇÃO DO NAVEGADOR =====================
function _pedirPermissaoNotificacaoCli() {
  try {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  } catch (e) {}
}

function _notificarNavegadorCli(novos) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var titulo = novos.length === 1 ? '🔔 Novo cadastro de cliente' : '🔔 ' + novos.length + ' novos cadastros de clientes';
    var corpo = novos.map(function (c) { return c.nome + ' — festa ' + fmtDate(c.dataFesta); }).join('\n');
    var n = new Notification(titulo, { body: corpo, icon: 'icon-192.png', tag: 'lizafestas-clientes' });
    n.onclick = function () { window.focus(); _abrirAlertaClientes(); n.close(); };
  } catch (e) {}
}
