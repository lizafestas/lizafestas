/* =====================================================
   LIZA FESTAS — app.js
   Inicialização geral do sistema (deve ser o ÚLTIMO script)
   ===================================================== */

async function init() {
  _inicializando = true;
  await loadData();
  _inicializando = false;

  setToday();
  renderAll();
  updateHeaderDate();

  var secaoSalva = localStorage.getItem('lizafestas_secao') || 'dashboard';
  showSection(secaoSalva);

  var sbMini = localStorage.getItem('lizafestas_sidebar_mini');
  if (sbMini === '1') {
    var sb = document.getElementById('appSidebar');
    var ac = document.querySelector('.app-content');
    if (sb) sb.classList.add('mini');
    if (ac) ac.classList.add('mini');
  }
}
