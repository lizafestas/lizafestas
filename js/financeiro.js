/* =====================================================
   LIZA FESTAS — financeiro.js
   Despesas administrativas e extras — tabelas
   desp_adm e desp_extra
   ===================================================== */

async function salvarDespAdm() {
  const desc = document.getElementById('dadm-desc').value.trim();
  const valor = document.getElementById('dadm-valor').value;
  const data = document.getElementById('dadm-data').value;
  if (!desc||!valor||!data) { showToast('Preencha todos os campos!'); return; }
  const nova = { id:uid(), desc, valor:parseFloat(valor), data, categoria:document.getElementById('dadm-categoria').value };
  db.despAdm.push(nova);
  saveData(); renderAll(); limparFormDespAdm();
  await dbInserir('despAdm', nova);
  showToast('Despesa administrativa registrada!');
}
function limparFormDespAdm() {
  document.getElementById('dadm-desc').value='';
  document.getElementById('dadm-valor').value='';
  setToday();
}
function renderDespAdm() {
  const tbody = document.getElementById('tbodyDespAdm');
  if (!tbody) return;
  const items = [...db.despAdm].sort((a,b)=>b.data.localeCompare(a.data));
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🏢</div><p>Nenhuma despesa administrativa</p></div></td></tr>`; return; }
  tbody.innerHTML = items.map(d => `
    <tr class="data-row">
      <td>${fmtDate(d.data)}</td>
      <td>${d.desc}</td>
      <td>${d.categoria||'—'}</td>
      <td>${fmtMoney(d.valor)}</td>
      <td><button class="btn btn-danger" onclick="excluir('despAdm','${d.id}')">✕</button></td>
    </tr>`).join('');
}

async function salvarDespExtra() {
  const desc = document.getElementById('dext-desc').value.trim();
  const valor = document.getElementById('dext-valor').value;
  const data = document.getElementById('dext-data').value;
  if (!desc||!valor||!data) { showToast('Preencha todos os campos!'); return; }
  const nova = { id:uid(), desc, valor:parseFloat(valor), data };
  db.despExtra.push(nova);
  saveData(); renderAll(); limparFormDespExtra();
  await dbInserir('despExtra', nova);
  showToast('Despesa extra registrada!');
}
function limparFormDespExtra() {
  document.getElementById('dext-desc').value='';
  document.getElementById('dext-valor').value='';
  setToday();
}
function renderDespExtra() {
  const tbody = document.getElementById('tbodyDespExtra');
  if (!tbody) return;
  const items = [...db.despExtra].sort((a,b)=>b.data.localeCompare(a.data));
  if (!items.length) { tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">💸</div><p>Nenhuma despesa extra</p></div></td></tr>`; return; }
  tbody.innerHTML = items.map(d => `
    <tr class="data-row">
      <td>${fmtDate(d.data)}</td>
      <td>${d.desc}</td>
      <td>${fmtMoney(d.valor)}</td>
      <td><button class="btn btn-danger" onclick="excluir('despExtra','${d.id}')">✕</button></td>
    </tr>`).join('');
}
