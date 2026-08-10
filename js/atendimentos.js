/* =====================================================
   LIZA FESTAS — atendimentos.js
   Registro de atendimentos — grava na tabela `atendimentos`
   e faz baixa de estoque na tabela `materiais`
   ===================================================== */

async function registrarAtendimento() {
  const cliente = document.getElementById('atend-cliente').value.trim();
  const data = document.getElementById('atend-data').value;
  const valor = document.getElementById('atend-valor').value;
  const pagto = document.getElementById('atend-pagto').value;
  const obs = document.getElementById('atend-obs').value;

  if (!cliente || !data || !valor) { showToast('Preencha cliente, data e valor!'); return; }
  if (!selectedServicos.length) { showToast('Selecione ao menos uma festa!'); return; }

  const novo = {
    id: uid(), cliente, data,
    servicoIds: [...selectedServicos],
    materiais: {...selectedMateriais},
    valor: parseFloat(valor),
    pagto, obs,
    statusCor: _agendaPendenteOrigem ? _agendaPendenteOrigem.statusCor : null
  };
  db.atendimentos.push(novo);

  const agOrigemParaCheck = _agendaPendenteOrigem ? db.agenda.find(x => x.id === _agendaPendenteOrigem.agId) : null;
  const estoqueJaDescontado = !!(agOrigemParaCheck && agOrigemParaCheck.separado);
  const matsAtualizados = [];
  if (!estoqueJaDescontado) {
    // Só desconta agora se o estoque ainda não foi baixado na etapa de Separação de Pedido
    // (se já foi separado, o desconto já aconteceu lá — evita baixa duplicada)
    Object.entries(selectedMateriais).forEach(([matId, qtd]) => {
      const m = db.materiais.find(x => x.id === matId);
      if (m) { m.qtd = Math.max(0, parseInt(m.qtd) - parseInt(qtd)); matsAtualizados.push(m); }
    });
   }
  
  novo.agendaOrigemId = _agendaPendenteOrigem ? _agendaPendenteOrigem.agId : null;

  saveData(); renderAll(); limparFormAtendimento();

  await dbInserir('atendimentos', novo);
  for (const m of matsAtualizados) await dbAtualizar('materiais', m);

  if (_agendaPendenteOrigem) {
    const agId = _agendaPendenteOrigem.agId;
    const ag = db.agenda.find(x => x.id === agId);
    if (ag) {
      ag.concluido = true;
      ag.atendimentoId = novo.id;
      if (ag.sessoes[_agendaPendenteOrigem.idx]) ag.sessoes[_agendaPendenteOrigem.idx].status = 'realizado';
      saveData(); renderAll();
      await dbAtualizar('agenda', ag);
    }
    _agendaPendenteOrigem = null;
  }

  showToast('Atendimento registrado!');
}

function limparFormAtendimento() {
  ['atend-cliente','atend-valor','atend-obs'].forEach(id => { var el = document.getElementById(id); if (el) el.value=''; });
  document.getElementById('atend-pagto').value = 'pix';
  selectedServicos = [];
  selectedMateriais = {};
  _agendaPendenteOrigem = null;
  setToday();
  renderServiceChips();
}

function renderAtendimentos() {
  const buscaCliente = (document.getElementById('filtAtendCliente').value||'').toLowerCase();
  const dataIni = document.getElementById('filtAtendDataIni').value;
  const dataFim = document.getElementById('filtAtendDataFim').value;
  const pagtoF = document.getElementById('filtAtendPagto').value;

  let items = [...db.atendimentos].sort((a,b)=>b.data.localeCompare(a.data));
  if (buscaCliente) items = items.filter(a => a.cliente.toLowerCase().includes(buscaCliente));
  if (dataIni) items = items.filter(a => a.data >= dataIni);
  if (dataFim) items = items.filter(a => a.data <= dataFim);
  if (pagtoF) items = items.filter(a => a.pagto === pagtoF);

  const tbody = document.getElementById('tbodyAtend');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">✨</div><p>Nenhum atendimento encontrado</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(a => {
    const festasNomes = (a.servicoIds||[]).map(id => { const s = db.festas.find(x=>x.id===id); return s?s.nome:'Festa removida'; }).join(' + ') || '—';
    const matNomes = Object.entries(a.materiais||{}).map(([id,q]) => { const m = db.materiais.find(x=>x.id===id); return m ? m.nome+' ×'+q : null; }).filter(Boolean).join(', ') || '—';
    const corAtend = (typeof _coresStatus !== 'undefined' && _coresStatus[a.statusCor]) || { border:'#DDD' };
    return `
    <tr class="data-row" onclick="toggleDetail('atend-${a.id}')">
      <td><span class="expand-icon" id="icon-atend-${a.id}">▶</span></td>
      <td>${fmtDate(a.data)}</td>
      <td><strong>${a.cliente}</strong>${a.isSinal ? ' <span class="badge-pill" style="background:#FFF3E0;color:#E65100;font-size:9px">SINAL</span>' : ''}</td>
      <td>${festasNomes}</td>
      <td style="position:relative;cursor:pointer" onclick="event.stopPropagation();toggleStatusMenuAtend('${a.id}')">
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${corAtend.border};border:2px solid #fff;box-shadow:0 0 0 1px ${corAtend.border}"></span>
          <span style="font-size:11px;color:${corAtend.border};font-weight:600">${a.statusCor ? (_coresStatus[a.statusCor].label.split(' ').slice(1).join(' ')) : '—'}</span>
         </span>
         <div id="statusmenu-atend-${a.id}" style="display:none;position:absolute;top:24px;left:0;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:50;min-width:150px">
           ${Object.entries(_coresStatus).map(([key,cor]) => `<div onclick="event.stopPropagation();setStatusAtend('${a.id}','${key}')" style="padding:6px 10px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:${cor.border}"></span>${cor.label.split(' ').slice(1).join(' ')}</div>`).join('')}
         </div>
       </td>
      <td><span class="badge-pill ${pagtoBadge(a.pagto)}">${pagtoLabel(a.pagto)}</span></td>
      <td>${fmtMoney(a.valor)}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-edit" onclick="event.stopPropagation();editItem('atend','${a.id}')">✏️</button>
        <button class="btn btn-danger" onclick="event.stopPropagation();excluir('atendimentos','${a.id}')">✕</button>
      </td>
    </tr>
    <tr class="detail-row" id="atend-${a.id}">
      <td colspan="8">
        <div id="atend-view-${a.id}">
          <div class="detail-box">
            <div class="detail-field"><label>Cliente</label><span>${a.cliente}</span></div>
            <div class="detail-field"><label>Data</label><span>${fmtDate(a.data)}</span></div>
            <div class="detail-field"><label>Festas</label><span>${festasNomes}</span></div>
            <div class="detail-field"><label>Materiais usados</label><span>${matNomes}</span></div>
            <div class="detail-field"><label>Pagamento</label><span>${pagtoLabel(a.pagto)}</span></div>
            <div class="detail-field"><label>Valor</label><span>${fmtMoney(a.valor)}</span></div>
            <div class="detail-field" style="grid-column:1/-1"><label>Observações</label><span>${a.obs||'—'}</span></div>
          </div>
        </div>
        <div id="atend-edit-${a.id}" style="display:none;padding:1rem">
          <div class="edit-form-row">
            <div class="form-grid">
              <div class="form-group"><label>Cliente</label><input type="text" id="eatend-cliente-${a.id}" value="${a.cliente}"></div>
              <div class="form-group"><label>Data</label><input type="date" id="eatend-data-${a.id}" value="${a.data}"></div>
              <div class="form-group"><label>Valor (R$)</label><input type="number" id="eatend-valor-${a.id}" value="${a.valor}" step="0.01"></div>
              <div class="form-group"><label>Pagamento</label>
                <select id="eatend-pagto-${a.id}">
                  <option value="pix" ${a.pagto==='pix'?'selected':''}>PIX</option>
                  <option value="dinheiro" ${a.pagto==='dinheiro'?'selected':''}>Dinheiro</option>
                  <option value="cartao_debito" ${a.pagto==='cartao_debito'?'selected':''}>Cartão Débito</option>
                  <option value="cartao_credito" ${a.pagto==='cartao_credito'?'selected':''}>Cartão Crédito</option>
                </select>
              </div>
              <div class="form-group" style="grid-column:1/-1"><label>Observações</label><textarea id="eatend-obs-${a.id}">${a.obs||''}</textarea></div>
            </div>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-primary btn-sm" onclick="salvarEditAtend('${a.id}')">✓ Salvar</button>
              <button class="btn btn-secondary btn-sm" onclick="cancelEdit('atend','${a.id}')">Cancelar</button>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function salvarEditAtend(id) {
  const a = db.atendimentos.find(x => x.id === id);
  if (!a) return;
  a.cliente = document.getElementById('eatend-cliente-'+id).value.trim();
  a.data = document.getElementById('eatend-data-'+id).value;
  a.valor = parseFloat(document.getElementById('eatend-valor-'+id).value);
  a.pagto = document.getElementById('eatend-pagto-'+id).value;
  a.obs = document.getElementById('eatend-obs-'+id).value;
  saveData(); renderAll();
  await dbAtualizar('atendimentos', a);
  showToast('Atendimento atualizado!');
}
function editItem(prefix, id) {
  const view = document.getElementById(prefix+'-view-'+id);
  const edit = document.getElementById(prefix+'-edit-'+id);
  if (view) view.style.display = 'none';
  if (edit) edit.style.display = 'block';
}
function cancelEdit(prefix, id) {
  const view = document.getElementById(prefix+'-view-'+id);
  const edit = document.getElementById(prefix+'-edit-'+id);
  if (edit) edit.style.display = 'none';
  if (view) view.style.display = 'block';
}
async function excluir(colecao, id) {
  if (!confirm('Tem certeza que deseja excluir este item?')) return;
  db[colecao] = db[colecao].filter(x => x.id !== id);
  saveData(); renderAll();
  await dbExcluir(colecao, id);
  showToast('Item excluído.');
}
// ===================== HELPERS GENÉRICOS =====================
function editItem(prefix, id) {
  const view = document.getElementById(prefix+'-view-'+id);
  const edit = document.getElementById(prefix+'-edit-'+id);
  if (view) view.style.display = 'none';
  if (edit) edit.style.display = 'block';
}
function cancelEdit(prefix, id) {
  const view = document.getElementById(prefix+'-view-'+id);
  const edit = document.getElementById(prefix+'-edit-'+id);
  if (edit) edit.style.display = 'none';
  if (view) view.style.display = 'block';
}
async function excluir(colecao, id) {
  if (!confirm('Tem certeza que deseja excluir este item?')) return;
  db[colecao] = db[colecao].filter(x => x.id !== id);
  saveData(); renderAll();
  await dbExcluir(colecao, id);
  showToast('Item excluído.');
}
