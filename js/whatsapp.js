/* =====================================================
   LIZA FESTAS — whatsapp.js
   Geração de mensagens e link wa.me para clientes
   ===================================================== */

function _limparTelefone(tel) {
  return (tel||'').replace(/\D/g,'');
}

function enviarWhatsappAtend(id) {
  const a = db.atendimentos.find(x=>x.id===id);
  if (!a) { showToast('Atendimento não encontrado.'); return; }
  const festasNomes = (a.servicoIds||[]).map(sid=>{const s=db.servicos.find(x=>x.id===sid);return s?s.nome:'';}).filter(Boolean).join(', ');
  const msg = `Olá ${a.cliente}! 🎉\n\nConfirmando os detalhes da sua festa:\n📅 Data: ${fmtDate(a.data)}\n🎈 Festa(s): ${festasNomes}\n💰 Valor: ${fmtMoney(a.valor)}\n\nQualquer dúvida estou à disposição!`;
  abrirWhatsapp(a.telefone, msg);
}

function enviarWhatsappAgenda(agId) {
  const ag = db.agenda.find(x=>x.id===agId);
  if (!ag) { showToast('Agendamento não encontrado.'); return; }

  const festasNomes = (ag.servicoIds||[]).map(id=>{ const f=db.festas.find(x=>x.id===id); return f?f.nome:null; }).filter(Boolean).join(' + ') || _agServicos(ag);
  const tema = ag.temaId ? db.temas.find(t=>t.id===ag.temaId) : null;
  const dataSessao = ag.sessoes && ag.sessoes[0] ? ag.sessoes[0].data : null;

  const msg = `Olá ${ag.cliente}! 🎉\n\nConfirmando os detalhes da sua locação:\n\n🎈 Festa: ${festasNomes||'—'}`
    + (tema ? `\n🎨 Tema: ${tema.nome}` : '')
    + (dataSessao ? `\n📅 Data: ${fmtDate(dataSessao)}` : '')
    + (ag.dataRetirada ? `\n📦 Retirada: ${fmtDate(ag.dataRetirada)}${ag.horaRetirada?' às '+ag.horaRetirada:''}` : '')
    + (ag.obs ? `\n📝 Observações: ${ag.obs}` : '')
    + `\n\nQualquer dúvida estou à disposição!`;

  abrirWhatsapp(ag.telefone, msg);
}

function enviarWhatsappSeparacao(agId) {
  const ag = db.agenda.find(x=>x.id===agId);
  if (!ag) { showToast('Agendamento não encontrado.'); return; }

  const festasNomes = (ag.servicoIds||[]).map(id=>{ const f=db.festas.find(x=>x.id===id); return f?f.nome:null; }).filter(Boolean).join(' + ');
  const tema = ag.temaId ? db.temas.find(t=>t.id===ag.temaId) : null;
  const materiaisTxt = Object.entries(ag.materiaisSeparados||{}).map(([id,q])=>{
    const m = db.materiais.find(x=>x.id===id);
    return m ? '• '+m.nome+' — '+q+' '+(m.unidade||'un') : null;
  }).filter(Boolean).join('\n');

  const msg = `Olá ${ag.cliente}! 🎉\n\nSegue os detalhes da sua locação:\n\n🎈 Festa: ${festasNomes||'—'}`
    + (tema ? `\n🎨 Tema: ${tema.nome}` : '')
    + (ag.dataRetirada ? `\n📦 Retirada: ${fmtDate(ag.dataRetirada)}${ag.horaRetirada?' às '+ag.horaRetirada:''}` : '')
    + (materiaisTxt ? `\n\n📋 Materiais separados:\n${materiaisTxt}` : '')
    + `\n\nQualquer dúvida estou à disposição!`;

  abrirWhatsapp(ag.telefone, msg);
}

function abrirWhatsapp(telefone, mensagem) {
  const tel = _limparTelefone(telefone);
  if (!tel) { showToast('Telefone não cadastrado para este cliente.'); return; }
  const numComPais = tel.length <= 11 ? '55'+tel : tel;
  const url = 'https://wa.me/' + numComPais + '?text=' + encodeURIComponent(mensagem);
  window.open(url, '_blank');
}
