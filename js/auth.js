/* =====================================================
   LIZA FESTAS — auth.js
   Login, logout, usuários, permissões
   ===================================================== */

var _usuarioLogado = null;

function _getUsuarios() {
  var raw = localStorage.getItem('lizafestas_usuarios');
  if (raw) { try { return JSON.parse(raw); } catch(e){} }
  var padrao = [
    { id: 'u1', nome: 'Liza Figueiredo', usuario: 'liza', senha: '1234', nivel: 'admin' },
    { id: 'u2', nome: 'Operador', usuario: 'operador', senha: '1234', nivel: 'operador' }
  ];
  localStorage.setItem('lizafestas_usuarios', JSON.stringify(padrao));
  return padrao;
}
function _salvarUsuarios(lista) { localStorage.setItem('lizafestas_usuarios', JSON.stringify(lista)); }

function fazerLogin() {
  var user = (document.getElementById('loginUser')||{value:''}).value.trim().toLowerCase();
  var pass = (document.getElementById('loginPass')||{value:''}).value;
  var usuarios = _getUsuarios();
  var encontrado = usuarios.find(function(u){ return u.usuario.toLowerCase()===user && u.senha===pass; });
  if (!encontrado) {
    var erro = document.getElementById('loginErro');
    if (erro) erro.style.display = 'block';
    return;
  }
  _usuarioLogado = encontrado;
  sessionStorage.setItem('lizafestas_sessao', JSON.stringify(encontrado));
  document.getElementById('loginScreen').style.display = 'none';
  _aplicarNivelAcesso();
  var hu = document.getElementById('sidebarUserName');
  if (hu) hu.textContent = encontrado.nome;
  var av = document.getElementById('sidebarAvatarLetter');
  if (av) av.textContent = encontrado.nome.charAt(0).toUpperCase();
  init();
}

function fazerLogout() {
  _usuarioLogado = null;
  sessionStorage.removeItem('lizafestas_sessao');
  mostrarLoginScreen();
}

function mostrarLoginScreen() {
  var ls = document.getElementById('loginScreen');
  ls.style.display = 'flex';
  var u = document.getElementById('loginUser');
  var p = document.getElementById('loginPass');
  var e = document.getElementById('loginErro');
  if (u) u.value = '';
  if (p) p.value = '';
  if (e) e.style.display = 'none';
  setTimeout(function(){ if (u) u.focus(); }, 100);
}

function _aplicarNivelAcesso() {
  var u = _usuarioLogado;
  if (!u) return;
  var isAdmin = u.nivel === 'admin';
  var perms = u.permissoes || [];
  document.querySelectorAll('[data-perm]').forEach(function(el) {
    var perm = el.getAttribute('data-perm');
    if (isAdmin) { el.style.display = ''; return; }
    if (perm === 'dashboard') {
      el.style.display = (perms.indexOf('dashboard') >= 0 || perms.indexOf('dashboard_financeiro') >= 0) ? '' : 'none';
      return;
    }
    el.style.display = perms.indexOf(perm) >= 0 ? '' : 'none';
  });
  var dashFin = document.getElementById('dashFinanceiro');
  if (dashFin) dashFin.style.display = (isAdmin || perms.indexOf('dashboard_financeiro') >= 0) ? '' : 'none';
}

var _TODAS_PERMS = [
  { id: 'agenda', label: '📅 Agenda' },
  { id: 'dashboard', label: '📊 Dashboard (resumo)' },
  { id: 'dashboard_financeiro', label: '💰 Dashboard Financeiro (receita/lucro)' },
  { id: 'atendimentos', label: '✨ Atendimentos' },
  { id: 'festas', label: '🎉 Festas' },
  { id: 'materiais', label: '🧴 Materiais' },
  { id: 'despAdm', label: '🏢 Desp. Adm.' },
  { id: 'despExtra', label: '💸 Despesas' },
  { id: 'temas', label: '🎨 Temas' },
  { id: 'exportar', label: '⬇ Exportar/Importar Backup' },
  { id: 'limpar', label: '🗑 Limpar Dados' }
];

function gerenciarUsuarios() {
  var usuarios = _getUsuarios();
  var linhas = usuarios.map(function(u) {
    var nivelBadge = u.nivel==='admin'
      ? '<span style="background:#E8F5E9;color:#2E7D32;padding:2px 8px;border-radius:10px;font-size:11px">Admin</span>'
      : '<span style="background:#F5F8E8;color:#F57F17;padding:2px 8px;border-radius:10px;font-size:11px">Operador</span>';
    return '<tr style="border-bottom:1px solid #f0e8f0">'
      +'<td style="padding:8px;font-size:13px">'+u.nome+'</td>'
      +'<td style="padding:8px;font-size:13px">'+u.usuario+'</td>'
      +'<td style="padding:8px;font-size:13px">'+u.senha+'</td>'
      +'<td style="padding:8px">'+nivelBadge+'</td>'
      +'<td style="padding:8px">'
      +(u.id!=='u1'?'<button onclick="editarUsuario(\''+u.id+'\')" style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:13px;margin-right:4px">✏️</button>':'')
      +(u.id!=='u1'?'<button onclick="excluirUsuario(\''+u.id+'\')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:13px">✕</button>':'')
      +'</td></tr>';
  }).join('');

  var chksNovo = _TODAS_PERMS.map(function(p){
    return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:4px 6px;border-radius:6px;border:1px solid #f0e8f0">'
      +'<input type="checkbox" id="nuperm_'+p.id+'" style="accent-color:#D4A0A8"> '+p.label+'</label>';
  }).join('');

  var modal = document.createElement('div');
  modal.id = 'modal-usuarios';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(44,26,34,0.7);z-index:9998;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto';
  modal.innerHTML = '<div style="background:white;border-radius:16px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto">'
    +'<div style="padding:1.2rem 1.5rem;background:linear-gradient(135deg,#1C1C1E,#2C2C2E);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">'
    +'<span style="font-family:Cormorant Garamond,serif;font-size:18px;color:#FAF0F2;letter-spacing:2px">👥 Gerenciar Usuários</span>'
    +'<button onclick="document.getElementById(\'modal-usuarios\').remove()" style="background:none;border:none;color:#FAF0F2;font-size:20px;cursor:pointer">✕</button>'
    +'</div><div style="padding:1.5rem">'
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem"><thead><tr style="border-bottom:2px solid var(--border)">'
    +'<th style="padding:8px;font-size:10px;color:var(--text-light);text-align:left">NOME</th>'
    +'<th style="padding:8px;font-size:10px;color:var(--text-light);text-align:left">USUÁRIO</th>'
    +'<th style="padding:8px;font-size:10px;color:var(--text-light);text-align:left">SENHA</th>'
    +'<th style="padding:8px;font-size:10px;color:var(--text-light);text-align:left">NÍVEL</th><th></th>'
    +'</tr></thead><tbody>'+linhas+'</tbody></table>'
    +'<div style="border-top:1px solid var(--border);padding-top:1rem">'
    +'<div style="font-size:11px;letter-spacing:2px;color:var(--text-light);margin-bottom:0.75rem">NOVO USUÁRIO</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem">'
    +'<input id="nu-nome" placeholder="Nome completo" style="padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:13px">'
    +'<input id="nu-user" placeholder="Usuário (login)" style="padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:13px">'
    +'<input id="nu-pass" placeholder="Senha" style="padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:13px">'
    +'<select id="nu-nivel" onchange="togglePermissoesNovo()" style="padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white">'
    +'<option value="operador">Operador</option><option value="admin">Admin</option></select>'
    +'</div>'
    +'<div id="nu-perms-wrap" style="margin-bottom:1rem">'
    +'<div style="font-size:10px;color:var(--text-light);margin-bottom:0.5rem;text-transform:uppercase">Permissões de acesso</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">'+chksNovo+'</div></div>'
    +'<div style="display:flex;gap:0.75rem">'
    +'<button class="btn btn-primary" onclick="adicionarUsuario()">+ Adicionar</button>'
    +'<button class="btn btn-secondary" onclick="document.getElementById(\'modal-usuarios\').remove()">Fechar</button>'
    +'</div></div></div></div>';
  document.body.appendChild(modal);
}

function togglePermissoesNovo() {
  var nivel = (document.getElementById('nu-nivel')||{value:'operador'}).value;
  var wrap = document.getElementById('nu-perms-wrap');
  if (wrap) wrap.style.display = nivel==='admin' ? 'none' : 'block';
}

function editarUsuario(id) {
  var u = _getUsuarios().find(function(x){ return x.id===id; });
  if (!u) return;
  var chksEditar = _TODAS_PERMS.map(function(p){
    var checked = (u.permissoes||[]).indexOf(p.id)>=0;
    return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:4px 6px;border-radius:6px;border:1px solid #f0e8f0">'
      +'<input type="checkbox" id="euperm_'+p.id+'"'+(checked?' checked':'')+' style="accent-color:#D4A0A8"> '+p.label+'</label>';
  }).join('');
  var modal = document.createElement('div');
  modal.id = 'modal-editar-usuario';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(44,26,34,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto';
  modal.innerHTML = '<div style="background:white;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto">'
    +'<div style="padding:1.2rem 1.5rem;background:linear-gradient(135deg,#1C1C1E,#2C2C2E);border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">'
    +'<span style="font-family:Cormorant Garamond,serif;font-size:18px;color:#FAF0F2;letter-spacing:2px">✏️ Editar · '+u.nome+'</span>'
    +'<button onclick="document.getElementById(\'modal-editar-usuario\').remove()" style="background:none;border:none;color:#FAF0F2;font-size:20px;cursor:pointer">✕</button>'
    +'</div><div style="padding:1.5rem">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem">'
    +'<div><label style="font-size:10px;color:var(--text-light);text-transform:uppercase">Nome</label>'
    +'<input id="eu-nome" value="'+u.nome+'" style="width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:13px;box-sizing:border-box"></div>'
    +'<div><label style="font-size:10px;color:var(--text-light);text-transform:uppercase">Usuário</label>'
    +'<input id="eu-user" value="'+u.usuario+'" style="width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:13px;box-sizing:border-box"></div>'
    +'<div><label style="font-size:10px;color:var(--text-light);text-transform:uppercase">Senha</label>'
    +'<input id="eu-pass" value="'+u.senha+'" style="width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:13px;box-sizing:border-box"></div>'
    +'<div><label style="font-size:10px;color:var(--text-light);text-transform:uppercase">Nível</label>'
    +'<select id="eu-nivel" style="width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:13px;background:white;box-sizing:border-box">'
    +'<option value="operador"'+(u.nivel==='operador'?' selected':'')+'>Operador</option>'
    +'<option value="admin"'+(u.nivel==='admin'?' selected':'')+'>Admin</option></select></div>'
    +'</div>'
    +'<div style="margin-bottom:1rem"><div style="font-size:10px;color:var(--text-light);margin-bottom:0.5rem;text-transform:uppercase">Permissões</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">'+chksEditar+'</div></div>'
    +'<div style="display:flex;gap:0.75rem">'
    +'<button class="btn btn-primary" onclick="salvarEdicaoUsuario(\''+id+'\')">✓ Salvar</button>'
    +'<button class="btn btn-secondary" onclick="document.getElementById(\'modal-editar-usuario\').remove()">Cancelar</button>'
    +'</div></div></div>';
  document.body.appendChild(modal);
}

function salvarEdicaoUsuario(id) {
  var usuarios = _getUsuarios();
  var u = usuarios.find(function(x){ return x.id===id; });
  if (!u) return;
  u.nome = document.getElementById('eu-nome').value.trim();
  u.usuario = document.getElementById('eu-user').value.trim().toLowerCase();
  u.senha = document.getElementById('eu-pass').value;
  u.nivel = document.getElementById('eu-nivel').value;
  u.permissoes = _TODAS_PERMS.filter(function(p){ var el=document.getElementById('euperm_'+p.id); return el && el.checked; }).map(function(p){ return p.id; });
  _salvarUsuarios(usuarios);
  document.getElementById('modal-editar-usuario').remove();
  document.getElementById('modal-usuarios').remove();
  gerenciarUsuarios();
  showToast('✅ Usuário atualizado!');
}

function adicionarUsuario() {
  var nome = (document.getElementById('nu-nome')||{value:''}).value.trim();
  var user = (document.getElementById('nu-user')||{value:''}).value.trim().toLowerCase();
  var pass = (document.getElementById('nu-pass')||{value:''}).value;
  var nivel = (document.getElementById('nu-nivel')||{value:'operador'}).value;
  if (!nome||!user||!pass) { showToast('Preencha todos os campos!'); return; }
  var usuarios = _getUsuarios();
  if (usuarios.find(function(u){ return u.usuario===user; })) { showToast('Usuário já existe!'); return; }
  var perms = nivel==='admin' ? [] : _TODAS_PERMS.filter(function(p){ var el=document.getElementById('nuperm_'+p.id); return el && el.checked; }).map(function(p){ return p.id; });
  usuarios.push({ id: uid(), nome: nome, usuario: user, senha: pass, nivel: nivel, permissoes: perms });
  _salvarUsuarios(usuarios);
  document.getElementById('modal-usuarios').remove();
  gerenciarUsuarios();
  showToast('✅ Usuário criado!');
}

function excluirUsuario(id) {
  if (!confirm('Excluir este usuário?')) return;
  _salvarUsuarios(_getUsuarios().filter(function(u){ return u.id!==id; }));
  document.getElementById('modal-usuarios').remove();
  gerenciarUsuarios();
  showToast('Usuário removido.');
}

// Verificar sessão salva ao carregar
(function() {
  var _sessaoSalva = sessionStorage.getItem('lizafestas_sessao');
  if (_sessaoSalva) {
    try {
      var _u = JSON.parse(_sessaoSalva);
      var _uAtual = _getUsuarios().find(function(x){ return x.id===_u.id && x.senha===_u.senha; });
      if (_uAtual) {
        _usuarioLogado = _uAtual;
        document.addEventListener('DOMContentLoaded', function() {
          _aplicarNivelAcesso();
          document.getElementById('loginScreen').style.display = 'none';
          var hu = document.getElementById('sidebarUserName');
          if (hu) hu.textContent = _uAtual.nome;
          var av = document.getElementById('sidebarAvatarLetter');
          if (av) av.textContent = _uAtual.nome.charAt(0).toUpperCase();
          init();
        });
      } else { sessionStorage.removeItem('lizafestas_sessao'); document.addEventListener('DOMContentLoaded', mostrarLoginScreen); }
    } catch(e) { sessionStorage.removeItem('lizafestas_sessao'); document.addEventListener('DOMContentLoaded', mostrarLoginScreen); }
  } else {
    document.addEventListener('DOMContentLoaded', mostrarLoginScreen);
  }
})();
