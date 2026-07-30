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
  const srvNome = _agServicos(ag);
  const msg = `Olá ${ag.cliente}! 🎉\n\nLembrete do seu agendamento:\n🎈 ${srvNome}\n${ag.dataRetirada ? '📦 Retirada: '+fmtDate(ag.dataRetirada)+(ag.horaRetirada?' às '+ag.horaRetirada:'') : ''}\n\nQualquer dúvida estou à disposição!`;
  abrirWhatsapp(ag.telefone, msg);
}

function abrirWhatsapp(telefone, mensagem) {
  const tel = _limparTelefone(telefone);
  if (!tel) { showToast('Telefone não cadastrado para este cliente.'); return; }
  const numComPais = tel.length <= 11 ? '55'+tel : tel;
  const url = 'https://wa.me/' + numComPais + '?text=' + encodeURIComponent(mensagem);
  window.open(url, '_blank');
}
