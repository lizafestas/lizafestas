/* =====================================================
   LIZA FESTAS — festas.js
   Catálogo de festas — grava direto na tabela `festas`
   ===================================================== */

async function salvarFesta() {
  const nome = document.getElementById('serv-nome').value.trim();
  const desc = document.getElementById('serv-descricao').value;
  const preco = document.getElementById('serv-preco').value;
  if (!nome||!preco) { showToast('Preencha nome e preço!'); return; }
  const nova = { id: uid(), nome, descricao: desc, preco: parseFloat(preco), status: document.getElementById('serv-status').value };
  db.festas.push(nova);
  saveData(); renderAll(); limparFormFesta();
  await dbInserir('festas', nova);
  showToast('Festa cadastrada!');
}
function limparFormFesta() {
  ['serv-nome','serv-descricao','serv-preco'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('serv-status').value='ativo';
}
function renderFestas() {
  const busca=(document.getElementById('filtServNome').value||'').toLowerCase();
  const status=document.getElementById('filtServStatus').value;
  let items=[...db.festas];
  if (busca) items=items.filter(s=>s.nome.toLowerCase().includes(busca));
  if (status) items=items.filter(s=>s.status===status);
  const tbody=document.getElementById('tbodyServ');
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🎉</div><p>Nenhuma festa cadastrada</p></div></td></tr>`; return; }
  tbody.innerHTML = items.map(s => `
    <tr class="data-row" onclick="toggleDetail('serv-${s.id}')">
      <td><span class="expand-icon" id="icon-serv-${s.id}">▶</span></td>
      <td><strong>${s.nome}</strong></td>
      <td>${s.descricao||'—'}</td>
      <td>${fmtMoney(s.preco)}</td>
      <td><span class="badge-pill ${s.status==='ativo'?'badge-ativo':'badge-inativo'}">${s.status}</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-edit" onclick="event.stopPropagation();editItem('serv','${s.id}')">✏️</button>
        <button class="btn btn-danger" onclick="event.stopPropagation();excluir('festas','${s.id}')">✕</button>
      </td>
    </tr>
    <tr class="detail-row" id="serv-${s.id}">
      <td colspan="6">
        <div id="serv-view-${s.id}">
          <div class="detail-box">
            <div class="detail-field"><label>Nome</label><span>${s.nome}</span></div>
            <div class="detail-field"><label>Descrição</label><span>${s.descricao||'—'}</span></div>
            <div class="detail-field"><label>Preço</label><span>${fmtMoney(s.preco)}</span></div>
            <div class="detail-field"><label>Status</label><span>${s.status}</span></div>
          </div>
        </div>
        <div id="serv-edit-${s.id}" style="display:none;padding:1rem">
          <div class="edit-form-row">
            <div class="form-grid">
              <div class="form-group"><label>Nome</label><input type="text" id="eserv-nome-${s.id}" value="${s.nome}"></div>
              <div class="form-group"><label>Descrição</label><input type="text" id="eserv-desc-${s.id}" value="${s.descricao||''}"></div>
              <div class="form-group"><label>Preço (R$)</label><input type="number" id="eserv-preco-${s.id}" value="${s.preco}" step="0.01"></div>
              <div class="form-group"><label>Status</label>
                <select id="eserv-status-${s.id}">
                  <option value="ativo" ${s.status==='ativo'?'selected':''}>Ativo</option>
                  <option value="inativo" ${s.status==='inativo'?'selected':''}>Inativo</option>
                </select>
              </div>
            </div>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-primary btn-sm" onclick="salvarEditFesta('${s.id}')">✓ Salvar</button>
              <button class="btn btn-secondary btn-sm" onclick="cancelEdit('serv','${s.id}')">Cancelar</button>
            </div>
          </div>
        </div>
      </td>
    </tr>`).join('');
}
async function salvarEditFesta(id) {
  const s = db.festas.find(x=>x.id===id);
  if (!s) return;
  s.nome = document.getElementById('eserv-nome-'+id).value.trim();
  s.descricao = document.getElementById('eserv-desc-'+id).value;
  s.preco = parseFloat(document.getElementById('eserv-preco-'+id).value);
  s.status = document.getElementById('eserv-status-'+id).value;
  saveData(); renderAll();
  await dbAtualizar('festas', s);
  showToast('Festa atualizada!');
}
