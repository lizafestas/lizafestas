/* =====================================================
   LIZA FESTAS — lightbox.js
   Visualizador de fotos em tela cheia, usado em todo o
   sistema. Clique na miniatura (ou na 🔍) → foto ampliada.
   Navegação: ‹ › / setas do teclado / arrastar no celular.
   Fechar: ✕ / Esc / clique fora da foto.
   ===================================================== */

var _lbGalerias = {};   // { chave: [src, src, ...] } — evita colocar base64 dentro de onclick
var _lbLista = [];
var _lbIdx = 0;
var _lbToqueX = null;

// Registra uma lista de fotos e devolve a chave para usar no onclick
function lbRegistrar(chave, fotos) {
  _lbGalerias[chave] = (fotos || []).map(function (f) {
    return typeof f === 'string' ? f : (f && (f.url || f.dataUrl || f.previewUrl)) || '';
  }).filter(Boolean);
  return chave;
}

function abrirLightboxGaleria(chave, idx) {
  abrirLightbox(_lbGalerias[chave] || [], idx);
}

function abrirLightbox(lista, idx) {
  if (!lista || !lista.length) return;
  _lbLista = lista;
  _lbIdx = Math.max(0, Math.min(idx || 0, lista.length - 1));

  var el = document.getElementById('lizaLightbox');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lizaLightbox';
    el.className = 'liza-lightbox';
    el.innerHTML =
      '<button class="lb-btn lb-fechar" title="Fechar (Esc)" onclick="fecharLightbox()">✕</button>' +
      '<button class="lb-btn lb-prev" title="Anterior" onclick="event.stopPropagation();lbNavegar(-1)">‹</button>' +
      '<img id="lbImg" alt="">' +
      '<button class="lb-btn lb-next" title="Próxima" onclick="event.stopPropagation();lbNavegar(1)">›</button>' +
      '<div class="lb-contador" id="lbContador"></div>';
    el.addEventListener('click', function (e) { if (e.target === el) fecharLightbox(); });
    el.addEventListener('touchstart', function (e) { _lbToqueX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (_lbToqueX === null) return;
      var dx = e.changedTouches[0].clientX - _lbToqueX;
      _lbToqueX = null;
      if (Math.abs(dx) > 50) lbNavegar(dx < 0 ? 1 : -1);
    });
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
  _lbMostrar();
}

function _lbMostrar() {
  var img = document.getElementById('lbImg');
  var cont = document.getElementById('lbContador');
  if (!img) return;
  img.src = _lbLista[_lbIdx];
  var multi = _lbLista.length > 1;
  document.querySelectorAll('#lizaLightbox .lb-prev, #lizaLightbox .lb-next').forEach(function (b) {
    b.style.display = multi ? '' : 'none';
  });
  if (cont) cont.textContent = multi ? (_lbIdx + 1) + ' / ' + _lbLista.length : '';
}

function lbNavegar(dir) {
  if (_lbLista.length < 2) return;
  _lbIdx = (_lbIdx + dir + _lbLista.length) % _lbLista.length;
  _lbMostrar();
}

function fecharLightbox() {
  var el = document.getElementById('lizaLightbox');
  if (el) el.style.display = 'none';
}

function _lbAberto() {
  var el = document.getElementById('lizaLightbox');
  return !!(el && el.style.display !== 'none');
}

document.addEventListener('keydown', function (e) {
  if (!_lbAberto()) return;
  if (e.key === 'Escape') { e.stopPropagation(); fecharLightbox(); }
  else if (e.key === 'ArrowLeft') lbNavegar(-1);
  else if (e.key === 'ArrowRight') lbNavegar(1);
});

// Botão 🔍 para miniaturas que já têm clique de seleção (seletores de fotos)
function lbLupaHtml(chave, idx) {
  return '<button type="button" class="lb-lupa" title="Ampliar foto" ' +
    'onclick="event.preventDefault();event.stopPropagation();abrirLightboxGaleria(\'' + chave + '\',' + idx + ')">🔍</button>';
}
