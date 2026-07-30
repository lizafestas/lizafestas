/* =====================================================
   LIZA FESTAS — temas.js
   Catálogo de temas: festas vinculadas, fotos sob demanda,
   envio WhatsApp
   ===================================================== */

let _temaFestaIdsSelecionadas = [];
let _temaFotosNovas = []; // [{id, nome, dataUrl}]

function limparFormTema() {
  document.getElementById('tema-nome').value = '';
  document.getElementById('tema-descricao').value = '';
  _temaFestaIdsSelecionadas = [];
  _temaFotosNovas = [];
  document.getElementById('temaFestasCount').textContent = '0';
  document.getElementById('temaFotosPreview').innerHTML = '';
  document.getElementById('tema-fotos-input').value = '';
}

// ===================== SELEÇÃO DE FESTAS =====================
function abrirSeletorFestasTema() {
  const opcoes = db.festas.map(f => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #f0e8ea;font-size:13px;cursor:pointer">
      <input type="checkbox" value="${f.id}" ${_temaFestaIdsSelecionadas.includes(f.id)?'checked':''} onchange="_toggleFestaTemaTmp('${f.id}', this.checked)">
      ${f.nome}
    </label>`).join('') || '<p style="color:var(--text-light);font-size:13px;padding:1rem 0">Nenhuma festa cadastrada ainda.</p>';

  const modal = document.createElement('div');
  modal.id = 'modal-festas-tema';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header"><span>🎉 Selecionar festas</span><button onclick="document.getElementById('modal-festas-tema').remove()">✕</button></div>
      <div class="modal-body">${opcoes}
        <div style="margin-top:1rem"><button class="btn btn-primary btn-sm" onclick="document.getElementById('modal-festas-tema').remove();document.getElementById('temaFestasCount').textContent=_temaFestaIdsSelecionadas.length">✓ Confirmar</button></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}
function _toggleFestaTemaTmp(id, checked) {
  if (checked) { if (!_temaFestaIdsSelecionadas.includes(id)) _temaFestaIdsSelecionadas.push(id); }
  else { _temaFestaIdsSelecionadas = _temaFestaIdsSelecionadas.filter(x => x !== id); }
}

// ===================== FOTOS (cadastro) =====================
function onTemaFotosSelecionadas(event) {
  const files = Array.from(event.target.files || []);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      _temaFotosNovas.push({ id: uid(), nome: file.name, dataUrl: e.target.result });
      _renderTemaFotosPreview();
    };
    reader.readAsDataURL(file);
  });
}
function _renderTemaFotosPreview() {
  const wrap = document.getElementById('temaFotosPreview');
  if (!wrap) return;
  wrap.innerHTML = _temaFotosNovas.map(f => `
    <div style="position:relative;width:70px">
      <img src="${f.dataUrl}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">
      <button onclick="_removerFotoTemaTmp('${f.id}')" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer">✕</button>
    </div>`).join('');
}
function _removerFotoTemaTmp(id) {
  _temaFotosNovas = _temaFotosNovas.filter(f => f.id !== id);
  _renderTemaFotosPreview();
}

// ===================== CRUD =====================
async function salvarTema() {
  const nome = document.getElementById('tema-nome').value.trim();
  if (!nome) { showToast('Preencha o nome do tema!'); return; }
  const novo = {
    id: uid(),
    nome,
    descricao: document.getElementById('tema-descricao').value,
    festaIds: [..._temaFestaIdsSelecionadas],
    fotos: [..._temaFotosNovas]
  };
  db.temas.push(novo);
  saveData(); renderAll(); limparFormTema();
  await dbInserir('temas', novo);
  showToast('Tema cadastrado!');
}

function _populateTemaFestaFiltro() {
  var sel = document.getElementById('filtTemaFesta');
  if (!sel) return;
  var atual = sel.value;
  sel.innerHTML = '<option value="">Todas as festas</option>' + db.festas.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  sel.value = atual;
}

function renderTemas() {
  _populateTemaFestaFiltro();
  const busca = (document.getElementById('filtTemaNome')?.value || '').toLowerCase();
  const festaFiltro = document.getElementById('filtTemaFesta')?.value || '';
  let items = [...db.temas];
  if (busca) items = items.filter(t => t.nome.toLowerCase().includes(busca));
  if (festaFiltro) items = items.filter(t => (t.festaIds||[]).includes(festaFiltro));

  const cont = document.getElementById('temasLista');
  if (!cont) return;
  if (!items.length) { cont.innerHTML = '<div class="empty-state"><div class="empty-icon">🎨</div><p>Nenhum tema cadastrado</p></div>'; return; }

  cont.innerHTML = items.map(t => {
    const festasNomes = (t.festaIds||[]).map(id => { const f = db.festas.find(x=>x.id===id); return f?f.nome:null; }).filter(Boolean).join(', ') || 'Nenhuma festa vinculada';
    return `
    <div class="card">
      <strong>${t.nome}</strong>
      <div style="font-size:12px;color:var(--text-light);margin:4px 0">${t.descricao||''}</div>
      <div style="font-size:11px;color:var(--text-light);margin-bottom:8px">🎉 ${festasNomes}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="verFotosTema('${t.id}')">🖼️ Ver Fotos</button>
        <button class="btn btn-secondary btn-sm" onclick="abrirAdicionarFotosTema('${t.id}')">📷 + Fotos</button>
        <button class="btn btn-secondary btn-sm" onclick="abrirEnvioWhatsappTema('${t.id}')">💬 Enviar</button>
        <button class="btn btn-edit btn-sm" onclick="abrirEditarTema('${t.id}')">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="excluirTema('${t.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

async function excluirTema(id) {
  if (!confirm('Excluir este tema?')) return;
  db.temas = db.temas.filter(x => x.id !== id);
  saveData(); renderAll();
  await dbExcluir('temas', id);
  showToast('Tema excluído.');
}

// ===================== EDITAR TEMA (nome, descrição, festas vinculadas) =====================
let _temaEditandoId = null;
let _temaEditFestaIdsSelecionadas = [];

function abrirEditarTema(id) {
  const t = db.temas.find(x => x.id === id);
  if (!t) return;
  _temaEditandoId = id;
  _temaEditFestaIdsSelecionadas = [...(t.festaIds||[])];

  const modal = document.createElement('div');
  modal.id = 'modal-editar-tema';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:480px">
      <div class="modal-header"><span>✏️ Editar tema</span><button onclick="document.getElementById('modal-editar-tema').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group" style="margin-bottom:0.75rem"><label>Nome do tema</label><input id="edtema-nome" value="${t.nome}"></div>
        <div class="form-group" style="margin-bottom:0.75rem"><label>Descrição</label><input id="edtema-descricao" value="${t.descricao||''}"></div>
        <div class="form-group" style="margin-bottom:1rem">
          <label>Festas incluídas</label>
          <button type="button" class="btn btn-secondary btn-sm" onclick="_abrirSeletorFestasTemaEdit()">🎉 Selecionar festas (<span id="edTemaFestasCount">${_temaEditFestaIdsSelecionadas.length}</span>)</button>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-primary btn-sm" onclick="salvarEdicaoTema()">✓ Salvar</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-editar-tema').remove()">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function _abrirSeletorFestasTemaEdit() {
  const opcoes = db.festas.map(f => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #f0e8ea;font-size:13px;cursor:pointer">
      <input type="checkbox" value="${f.id}" ${_temaEditFestaIdsSelecionadas.includes(f.id)?'checked':''} onchange="_toggleFestaTemaEditTmp('${f.id}', this.checked)">
      ${f.nome}
    </label>`).join('') || '<p style="color:var(--text-light);font-size:13px;padding:1rem 0">Nenhuma festa cadastrada ainda.</p>';

  const modal = document.createElement('div');
  modal.id = 'modal-festas-tema-edit';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header"><span>🎉 Selecionar festas</span><button onclick="document.getElementById('modal-festas-tema-edit').remove()">✕</button></div>
      <div class="modal-body">${opcoes}
        <div style="margin-top:1rem"><button class="btn btn-primary btn-sm" onclick="document.getElementById('modal-festas-tema-edit').remove();document.getElementById('edTemaFestasCount').textContent=_temaEditFestaIdsSelecionadas.length">✓ Confirmar</button></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}
function _toggleFestaTemaEditTmp(id, checked) {
  if (checked) { if (!_temaEditFestaIdsSelecionadas.includes(id)) _temaEditFestaIdsSelecionadas.push(id); }
  else { _temaEditFestaIdsSelecionadas = _temaEditFestaIdsSelecionadas.filter(x => x !== id); }
}

async function salvarEdicaoTema() {
  const t = db.temas.find(x => x.id === _temaEditandoId);
  if (!t) return;
  const nome = document.getElementById('edtema-nome').value.trim();
  if (!nome) { showToast('Preencha o nome do tema!'); return; }
  await _garantirFotosTema(t.id); // evita mandar fotos:[] pro Supabase se elas ainda não tinham sido carregadas
  t.nome = nome;
  t.descricao = document.getElementById('edtema-descricao').value;
  t.festaIds = [..._temaEditFestaIdsSelecionadas];
  saveData(); renderAll();
  await dbAtualizar('temas', t);
  document.getElementById('modal-editar-tema').remove();
  showToast('Tema atualizado!');
}

// ===================== CARREGAMENTO SOB DEMANDA DAS FOTOS =====================
// Só busca no Supabase quando o usuário pede — economiza tráfego/consumo.
async function _garantirFotosTema(temaId) {
  const t = db.temas.find(x => x.id === temaId);
  if (!t) return null;
  if (t.fotos === null || t.fotos === undefined) {
    t.fotos = await supaBuscarFotosTema(temaId);
  }
  return t;
}

async function verFotosTema(temaId) {
  showToast('Carregando fotos...');
  const t = await _garantirFotosTema(temaId);
  if (!t || !t.fotos.length) { showToast('Este tema não tem fotos anexadas.'); return; }
  _renderModalFotosTema(t);
}

function _renderModalFotosTema(t) {
  const existente = document.getElementById('modal-fotos-tema');
  if (existente) existente.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-fotos-tema';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px">
      <div class="modal-header"><span>🖼️ Fotos — ${t.nome}</span><button onclick="document.getElementById('modal-fotos-tema').remove()">✕</button></div>
      <div class="modal-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
        ${t.fotos.map(f => `
          <div style="position:relative">
            <img src="${f.dataUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">
            <button onclick="excluirFotoTema('${t.id}','${f.id}')" title="Excluir esta foto" style="position:absolute;top:6px;right:6px;background:var(--danger);color:#fff;border:none;border-radius:50%;width:24px;height:24px;font-size:12px;cursor:pointer">✕</button>
          </div>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function excluirFotoTema(temaId, fotoId) {
  if (!confirm('Excluir esta foto do tema?')) return;
  const t = db.temas.find(x => x.id === temaId);
  if (!t) return;
  t.fotos = (t.fotos||[]).filter(f => f.id !== fotoId);
  await dbAtualizar('temas', t);
  showToast('Foto excluída.');
  if (!t.fotos.length) { document.getElementById('modal-fotos-tema')?.remove(); return; }
  _renderModalFotosTema(t);
}

// ===================== INCLUIR FOTOS EM TEMA JÁ CADASTRADO =====================
async function abrirAdicionarFotosTema(temaId) {
  showToast('Carregando fotos...');
  const t = await _garantirFotosTema(temaId);
  if (!t) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async function(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    showToast('Enviando fotos...');
    const novasFotos = await Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ id: uid(), nome: file.name, dataUrl: e.target.result });
      reader.readAsDataURL(file);
    })));
    t.fotos = [...(t.fotos||[]), ...novasFotos];
    await dbAtualizar('temas', t);
    showToast('Fotos adicionadas ao tema!');
  };
  input.click();
}

// ===================== ENVIO WHATSAPP =====================
async function abrirEnvioWhatsappTema(temaId) {
  showToast('Carregando fotos...');
  const t = await _garantirFotosTema(temaId);
  if (!t || !t.fotos.length) { showToast('Este tema não tem fotos anexadas.'); return; }

  const opcoes = t.fotos.map(f => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #f0e8ea;font-size:13px;cursor:pointer">
      <input type="checkbox" name="fotoWhatsTema" value="${f.id}">
      <img src="${f.dataUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px">
      ${f.nome}
    </label>`).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-whats-tema';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div class="modal-header"><span>💬 Enviar tema "${t.nome}"</span><button onclick="document.getElementById('modal-whats-tema').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group" style="margin-bottom:0.75rem">
          <label>WhatsApp do cliente (opcional)</label>
          <input type="tel" id="whats-tema-numero" placeholder="(00) 00000-0000" onkeyup="mascaraTel(this)">
        </div>
        <p style="font-size:12px;color:var(--text-light);margin-bottom:8px">Escolha quais fotos enviar:</p>
        ${opcoes}
        <div style="margin-top:1rem"><button class="btn btn-primary btn-sm" onclick="_confirmarEnvioWhatsappTema('${t.id}')">✓ Continuar</button></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function _confirmarEnvioWhatsappTema(temaId) {
  const t = db.temas.find(x => x.id === temaId);
  const sels = Array.from(document.querySelectorAll('input[name="fotoWhatsTema"]:checked'));
  if (!sels.length) { showToast('Selecione ao menos uma foto!'); return; }
  const fotos = sels.map(sel => t.fotos.find(f => f.id === sel.value)).filter(Boolean);
  const numero = (document.getElementById('whats-tema-numero')||{value:''}).value;
  document.getElementById('modal-whats-tema').remove();

  const festasNomes = (t.festaIds||[]).map(id => {
    const f = db.festas.find(x=>x.id===id);
    if (!f) return null;
    return f.descricao ? `${f.nome} — ${f.descricao}` : f.nome;
  }).filter(Boolean).join(', ');
  const texto = `Olá! 🎉 Segue o tema "${t.nome}"${t.descricao ? ' — '+t.descricao : ''}${festasNomes ? '\n\nInclui: '+festasNomes : ''}`;

  const urlWhats = (function() {
    const tel = _limparTelefone(numero);
    if (!tel) return 'https://wa.me/?text=' + encodeURIComponent(texto);
    const numComPais = tel.length <= 11 ? '55'+tel : tel;
    return 'https://wa.me/' + numComPais + '?text=' + encodeURIComponent(texto);
  })();

  try {
    const files = await Promise.all(fotos.map(async foto => {
      const resp = await fetch(foto.dataUrl);
      const blob = await resp.blob();
      return new File([blob], foto.nome || 'tema.jpg', { type: blob.type });
    }));
    if (navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({ files, text: texto, title: t.nome });
      return;
    }
  } catch(e) { /* segue pro fallback abaixo */ }

  fotos.forEach((foto, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = foto.dataUrl;
      a.download = foto.nome || ('tema-'+(i+1)+'.jpg');
      a.click();
    }, i * 400);
  });
  showToast(fotos.length > 1 ? 'Fotos baixadas — anexe elas manualmente na conversa do WhatsApp que vai abrir.' : 'Foto baixada — anexe ela manualmente na conversa do WhatsApp que vai abrir.');
  setTimeout(() => {
    window.open(urlWhats, '_blank');
  }, fotos.length * 400 + 600);
}
