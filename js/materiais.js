/* =====================================================
   LIZA FESTAS — materiais.js
   Estoque de materiais — grava direto na tabela `materiais`
   ===================================================== */

async function salvarMaterial() {
  const nome=document.getElementById('mat-nome').value.trim();
  const custo=document.getElementById('mat-custo').value;
  const qtd=document.getElementById('mat-qtd').value;
  if (!nome||!custo) { showToast('Preencha nome e custo!'); return; }
  const novo = {
    id:uid(), nome,
    fornecedor:document.getElementById('mat-fornecedor').value,
    custo:parseFloat(custo), qtd:qtd||'0',
    min:document.getElementById('mat-min').value||'0',
    unidade:document.getElementById('mat-unidade').value,
    grade:document.getElementById('mat-grade').value||''
  };
  db.materiais.push(novo);
  saveData(); renderAll(); limparFormMat();
  await dbInserir('materiais', novo);
  showToast('Material cadastrado!');
}
function limparFormMat(){ ['mat-nome','mat-fornecedor','mat-custo','mat-qtd','mat-min','mat-grade'].forEach(id=>document.getElementById(id).value=''); }
function renderMateriais(){
  const busca=(document.getElementById('filtMatNome').value||'').toLowerCase();
  let items=[...db.materiais];
  if (busca) items=items.filter(m=>m.nome.toLowerCase().includes(busca));
  const tbody=document.getElementById('tbodyMat');
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🧴</div><p>Nenhum material cadastrado</p></div></td></tr>`; return; }
  tbody.innerHTML = items.map(m => {
    const baixo=parseInt(m.qtd)<parseInt(m.min||0);
    return `
    <tr class="data-row" onclick="toggleDetail('mat-${m.id}')">
      <td><span class="expand-icon" id="icon-mat-${m.id}">▶</span></td>
      <td><strong>${m.nome}</strong></td>
      <td>${m.fornecedor||'—'}</td>
      <td>${fmtMoney(m.custo)}</td>
      <td>${m.qtd} ${m.unidade}</td>
      <td>${m.grade||'—'}</td>
      <td>${m.min||'0'}</td>
      <td><span class="badge-pill ${baixo?'badge-inativo':'badge-ativo'}">${baixo?'Baixo':'OK'}</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-edit" onclick="event.stopPropagation();editItem('mat','${m.id}')">✏️</button>
        <button class="btn btn-danger" onclick="event.stopPropagation();excluir('materiais','${m.id}')">✕</button>
      </td>
    </tr>
    <tr class="detail-row" id="mat-${m.id}">
      <td colspan="9">
        <div id="mat-view-${m.id}">
          <div class="detail-box">
            <div class="detail-field"><label>Nome</label><span>${m.nome}</span></div>
            <div class="detail-field"><label>Fornecedor</label><span>${m.fornecedor||'—'}</span></div>
            <div class="detail-field"><label>Custo</label><span>${fmtMoney(m.custo)}</span></div>
            <div class="detail-field"><label>Estoque</label><span>${m.qtd} ${m.unidade}</span></div>
            <div class="detail-field"><label>Grade</label><span>${m.grade||'—'}</span></div>
            <div class="detail-field"><label>Mínimo</label><span>${m.min||'0'} ${m.unidade}</span></div>
            <div class="detail-field"><label>Situação</label><span style="color:${baixo?'var(--danger)':'var(--success)'}">${baixo?'⚠️ Baixo':'✅ Normal'}</span></div>
          </div>
        </div>
        <div id="mat-edit-${m.id}" style="display:none;padding:1rem">
          <div class="edit-form-row">
            <div class="form-grid">
              <div class="form-group"><label>Nome</label><input type="text" id="emat-nome-${m.id}" value="${m.nome}"></div>
              <div class="form-group"><label>Fornecedor</label><input type="text" id="emat-forn-${m.id}" value="${m.fornecedor||''}"></div>
              <div class="form-group"><label>Custo (R$)</label><input type="number" id="emat-custo-${m.id}" value="${m.custo}" step="0.01"></div>
              <div class="form-group"><label>Quantidade</label><input type="number" id="emat-qtd-${m.id}" value="${m.qtd}"></div>
              <div class="form-group"><label>Estoque Mín.</label><input type="number" id="emat-min-${m.id}" value="${m.min||'0'}"></div>
              <div class="form-group"><label>Unidade</label>
                <select id="emat-un-${m.id}">
                  ${['un','ml','g','L','kg','cx'].map(u=>`<option value="${u}" ${m.unidade===u?'selected':''}>${u}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>Grade</label><input type="text" id="emat-grade-${m.id}" value="${m.grade||''}" placeholder="Ex: P, M, G"></div>
            </div>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-primary btn-sm" onclick="salvarEditMat('${m.id}')">✓ Salvar</button>
              <button class="btn btn-secondary btn-sm" onclick="cancelEdit('mat','${m.id}')">Cancelar</button>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
}
async function salvarEditMat(id) {
  const m = db.materiais.find(x=>x.id===id);
  if (!m) return;
  m.nome = document.getElementById('emat-nome-'+id).value.trim();
  m.fornecedor = document.getElementById('emat-forn-'+id).value;
  m.custo = parseFloat(document.getElementById('emat-custo-'+id).value);
  m.qtd = document.getElementById('emat-qtd-'+id).value;
  m.min = document.getElementById('emat-min-'+id).value;
  m.unidade = document.getElementById('emat-un-'+id).value;
  m.grade = document.getElementById('emat-grade-'+id).value;
  saveData(); renderAll();
  await dbAtualizar('materiais', m);
  showToast('Material atualizado!');
}
