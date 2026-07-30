/* =====================================================
   LIZA FESTAS — temas.js
   Catálogo de temas: festas vinculadas, fotos sob demanda
   (armazenadas no Supabase Storage, não mais em base64),
   envio WhatsApp
   ===================================================== */

let _temaFestaIdsSelecionadas = [];
let _temaFotosNovas = []; // [{id, nome, file, previewUrl}] — file/previewUrl só existem localmente até o upload

function limparFormTema() {
  document.getElementById('tema-nome').value = '';
  document.getElementById('tema-descricao').value = '';
  _temaFestaIdsSelecionadas = [];
  _temaFotosNovas.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
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

// ===================== COMPRESSÃO E UPLOAD PRO STORAGE =====================
// Redimensiona pra no máximo 1200px de largura e recomprime em JPEG ~80% —
// reduz uma foto de celular (3-5MB) pra ~150-400KB antes de subir.
function _comprimirImagem(file, maxWidth = 1200, qualidade = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem')), 'image/jpeg', qualidade);
      };
      img.onerror = () => reject(new Error('Arquivo não é uma imagem válida'));
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function _uploadFotoTema(temaId, file) {
  const blob = await _comprimirImagem(file);
  const caminho = temaId + '/' + uid() + '.jpg';
  const resp = await fetch(SUPA_URL + '/storage/v1/object/temas-fotos/' + caminho, {
    method: 'POST',
    headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'image/jpeg' },
    body: blob
  });
  if (!resp.ok) throw new Error('upload foto: HTTP ' + resp.status);
  const url = SUPA_URL + '/storage/v1/object/public/temas-fotos/' + caminho;
  return { id: uid(), nome: file.name, url };
}

async function _excluirFotoStorage(url) {
  const marcador = '/temas-fotos/';
  const idx = (url||'').indexOf(marcador);
  if (idx === -1) return; // foto antiga em base64, não tem arquivo no Storage pra apagar
  const caminho = url.substring(idx + marcador.length);
  try {
    await fetch(SUPA_URL + '/storage/v1/object/temas-fotos/' + caminho, {
      method: 'DELETE',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    });
  } catch(e) { /* se falhar, não trava o resto do fluxo */ }
}

// ===================== FOTOS (cadastro — preview local antes do upload) =====================
function onTemaFotosSelecionadas(event) {
  const files = Array.from(event.target.files || []);
  files.forEach(file => {
    _temaFotosNovas.push({ id: uid(), nome: file.name, file, previewUrl: URL.createObjectURL(file) });
  });
  _renderTemaFotosPreview();
}
function _renderTemaFotosPreview() {
  const wrap = document.getElementById('temaFotosPreview');
  if (!wrap) return;
  wrap.innerHTML = _temaFotosNovas.map(f => `
    <div style="position:relative;width:70px">
      <img src="${f.previewUrl}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">
      <button onclick="_removerFotoTemaTmp('${f.id}')" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer">✕</button>
    </div>`).join('');
}
function _removerFotoTemaTmp(id) {
  const f = _temaFotosNovas.find(x => x.id === id);
  if (f && f.previewUrl) URL.revokeObjectURL(f.previewUrl);
  _temaFotosNovas = _temaFotosNovas.filter(f => f.id !== id);
  _renderTemaFotosPreview();
}

// ===================== CRUD =====================
async function salvarTema() {
  const nome = document.getElementById('tema-nome').value.trim();
  if (!nome) { showToast('Preencha o nome do tema!'); return; }
  const id = uid();

  let fotos = [];
  if (_temaFotosNovas.length) {
    showToast('Enviando fotos...');
    try {
      fotos = await Promise.all(_temaFotosNovas.map(f => _uploadFotoTema(id, f.file)));
    } catch(e) {
      showToast('Erro ao enviar fotos: ' + e.message);
      return;
    }
  }

  const novo = {
    id,
    nome,
    descricao: document.getElementById('tema-descricao').value,
    festaIds: [..._temaFestaIdsSelecionadas],
    fotos
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

// Fotos antigas (migração anterior) têm {dataUrl}; fotos novas têm {url} (Storage). Ambas exibem igual.
function _fotoSrc(f) { return f.url || f.dataUrl; }

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
            <img src="${_fotoSrc(f)}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">
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
  const foto = (t.fotos||[]).find(f => f.id === fotoId);
  t.fotos = (t.fotos||[]).filter(f => f.id !== fotoId);
  await dbAtualizar('temas', t);
  if (foto && foto.url) await _excluirFotoStorage(foto.url);
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
    try {
      const novasFotos = await Promise.all(files.map(file => _uploadFotoTema(temaId, file)));
      t.fotos = [...(t.fotos||[]), ...novasFotos];
      await dbAtualizar('temas', t);
      showToast('Fotos adicionadas ao tema!');
    } catch(e) {
      showToast('Erro ao enviar fotos: ' + e.message);
    }
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
      <img src="${_fotoSrc(f)}" style="width:40px;height:40px;object-fit:cover;border-radius:6px">
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

  const numeroInformado = !!_limparTelefone(numero);
  const urlWhats = (function() {
    const tel = _limparTelefone(numero);
    if (!tel) return 'https://wa.me/?text=' + encodeURIComponent(texto);
    const numComPais = tel.length <= 11 ? '55'+tel : tel;
    return 'https://wa.me/' + numComPais + '?text=' + encodeURIComponent(texto);
  })();

  if (!numeroInformado) {
    try {
      const files = await Promise.all(fotos.map(async foto => {
        const resp = await fetch(_fotoSrc(foto));
        const blob = await resp.blob();
        return new File([blob], foto.nome || 'tema.jpg', { type: blob.type });
      }));
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, text: texto, title: t.nome });
        return;
      }
    } catch(e) { /* segue pro fallback abaixo */ }
  }

  // Com número específico: tenta copiar a 1ª foto pra área de transferência (Ctrl+V cola direto na conversa)
  let copiouParaClipboard = false;
  if (numeroInformado && navigator.clipboard && window.ClipboardItem) {
    try {
      const resp = await fetch(_fotoSrc(fotos[0]));
      let blob = await resp.blob();
      if (blob.type !== 'image/png') {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      copiouParaClipboard = true;
    } catch(e) { /* sem permissão de clipboard — segue pro download normal */ }
  }

  const fotosParaBaixar = copiouParaClipboard ? fotos.slice(1) : fotos;
  fotosParaBaixar.forEach((foto, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = _fotoSrc(foto);
      a.download = foto.nome || ('tema-'+(i+1)+'.jpg');
      a.click();
    }, i * 400);
  });

  if (copiouParaClipboard) {
    showToast(fotos.length > 1
      ? '1ª foto copiada! Cole com Ctrl+V na conversa. As outras foram baixadas para anexar.'
      : 'Foto copiada! Cole com Ctrl+V dentro da conversa que vai abrir.');
  } else {
    showToast(fotos.length > 1 ? 'Fotos baixadas — anexe elas manualmente na conversa do WhatsApp que vai abrir.' : 'Foto baixada — anexe ela manualmente na conversa do WhatsApp que vai abrir.');
  }
  setTimeout(() => {
    window.open(urlWhats, '_blank');
  }, fotosParaBaixar.length * 400 + 600);
}
