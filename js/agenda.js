/* =====================================================
   LIZA FESTAS — agenda.js
   ===================================================== */

let agendaFiltroAtual = 'tudo';
let agBuscaClienteAtual = '';
let _agendaPendenteOrigem = null; // {agId, idx, statusCor}

async function salvarAgendamento() {
  const cliente = document.getElementById('ag-cliente').value.trim();
  const telefone = document.getElementById('ag-telefone').value;
  const data = document.getElementById('ag-data').value;
  const dataRetirada = document.getElementById('ag-data-retirada').value;
  const horaRetirada = document.getElementById('ag-hora-retirada').value;
  const sinal = document.getElementById('ag-sinal').value;
  const temaId = document.getElementById('ag-tema').value || null;
  const statusCor = document.getElementById('ag-status-cor').value || 'reservado';

  if (!cliente || !data) { showToast('Preencha cliente e data!'); return; }
  if (!selectedServicos.length) { showToast('Selecione ao menos uma festa!'); return; }

  const sessoes = [{ data, hora: '', servicoIds: [...selectedServicos], status: 'pendente' }];
  const novo = {
    id: uid(), cliente, telefone,
    sessoes,
    servicoIds: [...selectedServicos],
    materiais: {...selectedMateriais},
    temaId,
    dataRetirada, horaRetirada,
    sinal: parseFloat(sinal || 0),
    statusCor,
    obs: document.getElementById('ag-obs').value,
    sinalAtendId: null,
    concluido: false,
    atendimentoId: null
  };
  db.agenda.push(novo);

  const matsReservados = [];
  Object.entries(novo.materiais).forEach(([matId, qtd]) => {
    const m = db.materiais.find(x => x.id === matId);
    if (m) { m.qtd = Math.max(0, parseInt(m.qtd) - parseInt(qtd)); matsReservados.push(m); }
  });

  if (novo.sinal > 0) {
    const sinalAtend = {
      id: uid(), cliente: novo.cliente, data: novo.dataRetirada || data,
      servicoIds: [...novo.servicoIds], materiais: {},
      valor: novo.sinal, pagto: 'pix',
      obs: `Sinal recebido referente à festa de ${fmtDate(data)}.`,
      statusCor: novo.statusCor,
      agendaOrigemId: null,
      isSinal: true
    };
    db.atendimentos.push(sinalAtend);
    await dbInserir('atendimentos', sinalAtend);
    novo.sinalAtendId = sinalAtend.id;
  }

  saveData(); renderAll(); limparFormAgenda();
  await dbInserir('agenda', novo);
  for (const m of matsReservados) await dbAtualizar('materiais', m);
  showToast('Agendamento criado!');
}

function limparFormAgenda() {
  ['ag-cliente','ag-telefone','ag-data-retirada','ag-hora-retirada','ag-sinal','ag-obs'].forEach(id => {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var stEl = document.getElementById('ag-status-cor'); if (stEl) stEl.value = 'reservado';
  var temaEl = document.getElementById('ag-tema'); if (temaEl) temaEl.value = '';
  selectedServicos = [];
  selectedMateriais = {};
  setToday();
  renderServiceChips();
}

function _populateTemaSelect() {
  var sel = document.getElementById('ag-tema');
  if (!sel) return;
  var atual = sel.value;
  sel.innerHTML = '<option value="">Nenhum</option>' + db.temas.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
  sel.value = atual;
}

function setAgendaFiltro(filtro, btn) {
  agendaFiltroAtual = filtro;
  document.querySelectorAll('.agenda-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAgenda();
}

function renderAgenda() {
  _populateTemaSelect();
  renderCalendario();
  agBuscaClienteAtual = (document.getElementById('agBuscaCliente')?.value || '').toLowerCase();
  const retiradaFiltro = document.getElementById('agFiltroRetirada')?.value || '';
  const hoje = _hoje();
  let items = [...db.agenda];

  if (agBuscaClienteAtual) items = items.filter(ag => ag.cliente.toLowerCase().includes(agBuscaClienteAtual));
  if (retiradaFiltro) items = items.filter(ag => ag.dataRetirada === retiradaFiltro);

  if (agendaFiltroAtual === 'realizados') {
    items = items.filter(ag => ag.concluido);
  } else {
    items = items.filter(ag => !ag.concluido);
    if (agendaFiltroAtual === 'hoje') items = items.filter(ag => ag.sessoes.some(s => s.data === hoje));
    else if (agendaFiltroAtual === 'pendentes') items = items.filter(ag => ag.sessoes.some(s => s.status === 'pendente'));
  }

  items.sort((a, b) => (a.sessoes[0]?.data||'').localeCompare(b.sessoes[0]?.data||''));

  const cont = document.getElementById('agendaLista');
  if (!cont) return;
  if (!items.length) { cont.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhum agendamento encontrado</p></div>'; return; }

  cont.innerHTML = items.map(ag => {
    const cor = (typeof _coresStatus !== 'undefined' && _coresStatus[ag.statusCor]) || { bg:'#F9F9F9', border:'#DDD', label:'Sem status' };
    const srvNome = _agServicos(ag);
    const tema = ag.temaId ? db.temas.find(t => t.id === ag.temaId) : null;
    const sessoesHtml = ag.sessoes.map((s, idx) => `
      <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
        <span>${fmtDate(s.data)}</span>
        <span class="badge-pill ${s.status==='realizado'?'badge-ativo':'badge-inativo'}">${s.status==='realizado'?'Realizado':'Pendente'}</span>
        ${!ag.concluido && s.status !== 'realizado' ? `<button class="btn btn-primary btn-sm" style="font-size:10px;padding:2px 8px" onclick="realizarSessao('${ag.id}',${idx})">✓ Realizar</button>` : ''}
        <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:2px 8px" onclick="marcarFalta('${ag.id}',${idx})">Faltou</button>
      </div>`).join('');

    return `
    <div class="card" id="agcard-${ag.id}" style="border-left:4px solid ${cor.border};margin-bottom:1rem${ag.concluido?';opacity:0.75':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <strong style="font-size:15px">${ag.cliente}</strong> ${ag.concluido ? '<span class="badge-pill badge-ativo" style="font-size:10px">Concluído</span>' : ''}
          <div style="font-size:12px;color:var(--text-light)">${srvNome}${tema ? ' · 🎨 '+tema.nome : ''}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <select onchange="setStatusAgenda('${ag.id}', this.value)" style="font-size:11px;padding:4px 8px;border-radius:6px;border:1px solid var(--border)">
            <option value="reservado" ${ag.statusCor==='reservado'?'selected':''}>🟢 Reservado</option>
            <option value="alugado" ${ag.statusCor==='alugado'?'selected':''}>🔴 Alugado</option>
            <option value="devolveu" ${ag.statusCor==='devolveu'?'selected':''}>⚫ Devolveu</option>
            <option value="personalizado" ${ag.statusCor==='personalizado'?'selected':''}>🟣 Personalizado</option>
            <option value="credito" ${ag.statusCor==='credito'?'selected':''}>🟠 Crédito</option>
          </select>
          <button class="btn btn-edit" onclick="abrirEditarAgenda('${ag.id}')">✏️</button>
          <button class="btn btn-edit" onclick="enviarWhatsappAgenda('${ag.id}')">💬</button>
          <button class="btn btn-danger" onclick="excluirAgendamento('${ag.id}')">✕</button>
        </div>
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
        <div><label style="color:var(--text-light)">Retirada:</label> ${ag.dataRetirada ? fmtDate(ag.dataRetirada) + (ag.horaRetirada?' '+ag.horaRetirada:'') : '—'}</div>
        <div><label style="color:var(--text-light)">Sinal:</label> ${ag.sinal > 0 ? fmtMoney(ag.sinal) : '—'}</div>
      </div>
      <div style="margin-top:8px">${sessoesHtml}</div>
      ${ag.obs ? `<div style="margin-top:6px;font-size:12px;color:var(--text-light)">📝 ${ag.obs}</div>` : ''}
    </div>`;
  }).join('');
}

async function setStatusAgenda(id, cor) {
  const ag = db.agenda.find(x => x.id === id);
  if (!ag) return;
  ag.statusCor = cor;
  saveData(); renderAgenda(); renderStatusAgendaPanel();
  await dbAtualizar('agenda', ag);

  const idsParaSincronizar = [ag.atendimentoId, ag.sinalAtendId].filter(Boolean);
  for (const atId of idsParaSincronizar) {
    const at = db.atendimentos.find(x => x.id === atId);
    if (at && at.statusCor !== cor) {
      at.statusCor = cor; saveData(); renderAtendimentos();
      await dbAtualizar('atendimentos', at);
    }
  }
}

function abrirEditarAgenda(id) {
  const ag = db.agenda.find(x => x.id === id);
  if (!ag) return;
  const temaOpcoes = '<option value="">Nenhum</option>' + db.temas.map(t => `<option value="${t.id}" ${ag.temaId===t.id?'selected':''}>${t.nome}</option>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-editar-agenda';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:480px">
      <div class="modal-header"><span>✏️ Editar Agendamento</span><button onclick="document.getElementById('modal-editar-agenda').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group"><label>Cliente</label><input id="edag-cliente" value="${ag.cliente}"></div>
          <div class="form-group"><label>Telefone</label><input id="edag-telefone" value="${ag.telefone||''}" onkeyup="mascaraTel(this)"></div>
          <div class="form-group"><label>Data</label><input type="date" id="edag-data" value="${ag.sessoes[0]?.data||''}"></div>
          <div class="form-group"><label>Data de retirada</label><input type="date" id="edag-data-retirada" value="${ag.dataRetirada||''}"></div>
          <div class="form-group"><label>Hora retirada</label><input type="time" id="edag-hora-retirada" value="${ag.horaRetirada||''}"></div>
          <div class="form-group"><label>Sinal (R$)</label><input type="number" step="0.01" id="edag-sinal" value="${ag.sinal||0}"></div>
          <div class="form-group"><label>Tema</label><select id="edag-tema">${temaOpcoes}</select></div>
          <div class="form-group"><label>Status</label>
            <select id="edag-status">
              <option value="reservado" ${ag.statusCor==='reservado'?'selected':''}>🟢 Reservado</option>
              <option value="alugado" ${ag.statusCor==='alugado'?'selected':''}>🔴 Alugado</option>
              <option value="devolveu" ${ag.statusCor==='devolveu'?'selected':''}>⚫ Devolveu</option>
              <option value="personalizado" ${ag.statusCor==='personalizado'?'selected':''}>🟣 Personalizado</option>
              <option value="credito" ${ag.statusCor==='credito'?'selected':''}>🟠 Crédito</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Observações</label><textarea id="edag-obs">${ag.obs||''}</textarea></div>
        <p style="font-size:11px;color:var(--text-light);margin:0.5rem 0">Festas e materiais não são editáveis aqui — para trocar, exclua e crie um novo agendamento.</p>
        <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
          <button class="btn btn-primary btn-sm" onclick="salvarEdicaoAgenda('${id}')">✓ Salvar</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-editar-agenda').remove()">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function salvarEdicaoAgenda(id) {
  const ag = db.agenda.find(x => x.id === id);
  if (!ag) return;

  ag.cliente = document.getElementById('edag-cliente').value.trim();
  ag.telefone = document.getElementById('edag-telefone').value;
  const novaData = document.getElementById('edag-data').value;
  ag.sessoes[0].data = novaData;
  ag.dataRetirada = document.getElementById('edag-data-retirada').value;
  ag.horaRetirada = document.getElementById('edag-hora-retirada').value;
  ag.temaId = document.getElementById('edag-tema').value || null;
  ag.statusCor = document.getElementById('edag-status').value;
  ag.obs = document.getElementById('edag-obs').value;

  const novoSinal = parseFloat(document.getElementById('edag-sinal').value || 0);
  if (novoSinal !== ag.sinal) {
    if (ag.sinalAtendId) {
      const sinalAtend = db.atendimentos.find(a => a.id === ag.sinalAtendId);
      if (sinalAtend) {
        sinalAtend.valor = novoSinal;
        await dbAtualizar('atendimentos', sinalAtend);
      }
    } else if (novoSinal > 0) {
      const sinalAtend = {
        id: uid(), cliente: ag.cliente, data: ag.dataRetirada || novaData,
        servicoIds: [...ag.servicoIds], materiais: {},
        valor: novoSinal, pagto: 'pix',
        obs: `Sinal recebido referente à festa de ${fmtDate(novaData)}.`,
        statusCor: ag.statusCor,
        agendaOrigemId: null,
        isSinal: true
      };
      db.atendimentos.push(sinalAtend);
      await dbInserir('atendimentos', sinalAtend);
      ag.sinalAtendId = sinalAtend.id;
    }
    ag.sinal = novoSinal;
  }

  const idsParaSincronizar = [ag.atendimentoId, ag.sinalAtendId].filter(Boolean);
  for (const atId of idsParaSincronizar) {
    const at = db.atendimentos.find(x => x.id === atId);
    if (at && at.statusCor !== ag.statusCor) {
      at.statusCor = ag.statusCor;
      await dbAtualizar('atendimentos', at);
    }
  }

  saveData(); renderAll();
  await dbAtualizar('agenda', ag);
  document.getElementById('modal-editar-agenda').remove();
  showToast('Agendamento atualizado!');
}

function realizarSessao(agId, idx) {
  const ag = db.agenda.find(x => x.id === agId);
  if (!ag || !ag.sessoes[idx]) return;

  const totalFestas = (ag.servicoIds||[]).reduce((soma, sid) => {
    const f = db.festas.find(x => x.id === sid);
    return soma + (f ? parseFloat(f.preco) : 0);
  }, 0);
  const sinal = parseFloat(ag.sinal || 0);
  const saldo = Math.max(0, totalFestas - sinal);

  selectedServicos = [...(ag.servicoIds||[])];
  selectedMateriais = {...(ag.materiais||{})};
  document.getElementById('atend-cliente').value = ag.cliente;
  document.getElementById('atend-data').value = ag.sessoes[idx].data;
  document.getElementById('atend-valor').value = saldo.toFixed(2);
  document.getElementById('atend-obs').value = `Vindo da agenda. Total da festa: ${fmtMoney(totalFestas)} · Sinal já pago: ${fmtMoney(sinal)}.`;

  _agendaPendenteOrigem = { agId, idx, statusCor: ag.statusCor };

  showSection('atendimentos');
  renderServiceChips();
  showToast('Revise pagamento e estoque, depois clique em "Registrar Atendimento" para finalizar.');
}

async function marcarFalta(agId, idx) {
  const ag = db.agenda.find(x => x.id === agId);
  if (!ag || !ag.sessoes[idx]) return;
  ag.sessoes[idx].status = 'faltou';
  saveData(); renderAll();
  await dbAtualizar('agenda', ag);
  showToast('Falta registrada.');
}
async function excluirAgendamento(id) {
  if (!confirm('Excluir este agendamento?')) return;
  db.agenda = db.agenda.filter(x => x.id !== id);
  saveData(); renderAll();
  await dbExcluir('agenda', id);
  showToast('Agendamento excluído.');
}
