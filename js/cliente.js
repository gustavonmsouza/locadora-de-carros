const u = exigir(['cliente']);
let cli, autos = [], bancos = [], pedidos = [], editando = null;
const $ = s => document.querySelector(s);
const modal = new bootstrap.Modal($('#modalPedido'));
$('#quem').textContent = u.nome;
$('#saudacaoCliente').textContent = u.nome.split(' ')[0];

async function carregar() {
  try {
    [cli] = await api.get('/clientes?usuarioId=' + u.id);
    [autos, bancos, pedidos] = await Promise.all([api.get('/automoveis'), api.get('/usuarios?tipo=banco'), api.get('/pedidos?clienteId=' + cli.id)]);
    renderPedidos(); renderDados();
  } catch { aviso('Não foi possível carregar os dados. O JSON Server está rodando?'); }
}

function renderPedidos() {
  $('#contagemPedidos').textContent = `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}`;
  if (!pedidos.length) return $('#lista').innerHTML = '<div class="vazio">Você ainda não fez nenhum pedido. Clique em "Novo pedido" para escolher um carro.</div>';
  $('#lista').innerHTML = pedidos.slice().reverse().map(p => {
    const a = autos.find(x => x.id === p.automovelId) || {}, solicitado = bancos.find(x => x.id === (p.bancoSolicitadoId || (!p.creditoConcedidoPor ? p.bancoId : null))), concedido = bancos.find(x => x.id === p.bancoId && p.creditoConcedidoPor);
    const aberto = p.status === 'Em análise';
    return `<article class="request-card" data-st="${esc(p.status)}">
      <div class="request-card-top">${placaHtml(a.placa)}<span class="status status-${esc(p.status.toLowerCase().replaceAll(' ', '-'))}">${esc(p.status)}</span></div>
      <div class="request-car"><strong>${esc(a.marca)} ${esc(a.modelo)}</strong><span>${esc(a.ano)}</span></div>
      <div class="request-meta"><span><small>RETIRADA</small>${dataBR(p.dataInicio)}</span><span class="date-arrow" aria-hidden="true">→</span><span><small>DEVOLUÇÃO</small>${dataBR(p.dataFim)}</span></div>
      ${solicitado ? `<p class="request-credit">Crédito solicitado a <strong>${esc(solicitado.nome)}</strong></p>` : ''}${concedido ? `<p class="request-credit">Crédito concedido por <strong>${esc(concedido.nome)}</strong></p>` : ''}
      ${p.parecer ? `<p class="parecer">Parecer de ${esc(p.avaliadoPor)}: ${esc(p.parecer)}</p>` : ''}
      ${aberto ? `<div class="request-actions"><button class="btn btn-sm btn-outline-primary" data-ed="${p.id}">Editar pedido</button>
        <button class="btn btn-sm btn-outline-danger" data-cancel="${p.id}">Cancelar</button></div>` : ''}</article>`;
  }).join('');
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => abrir(pedidos.find(p => p.id == b.dataset.ed)));
  document.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
    if (!confirm('Cancelar este pedido?')) return;
    await api.patch('/pedidos/' + b.dataset.cancel, { status: 'Cancelado' }); aviso('Pedido cancelado.', 'success'); carregar();
  });
}

function abrir(p = null) {
  editando = p;
  $('#tituloPedido').textContent = p ? 'Editar pedido' : 'Novo pedido';
  $('#pAuto').innerHTML = autos.filter(a => a.disponivel || (p && a.id === p.automovelId))
    .map(a => `<option value="${a.id}">${esc(a.marca)} ${esc(a.modelo)} ${esc(a.ano)} (${esc(a.placa)})</option>`).join('');
  $('#pBanco').innerHTML = '<option value="">Sem crédito</option>' + bancos.map(b => `<option value="${b.id}">${esc(b.nome)}</option>`).join('');
  $('#pAuto').value = p?.automovelId ?? ''; $('#pIni').value = p?.dataInicio ?? ''; $('#pFim').value = p?.dataFim ?? '';
  $('#pBanco').value = p?.bancoSolicitadoId ?? (!p?.creditoConcedidoPor ? p?.bancoId : '') ?? '';
  modal.show();
}
$('#novo').onclick = () => abrir();

$('#formPedido').onsubmit = async e => {
  e.preventDefault();
  if ($('#pFim').value <= $('#pIni').value) return aviso('A devolução precisa ser depois da retirada.', 'warning');
  if ($('#pIni').value < new Date().toISOString().slice(0,10)) return aviso('A retirada não pode ser uma data passada.', 'warning');
  const autoId=Number($('#pAuto').value);
  const conflitos=pedidos.filter(p=>p.id!==editando?.id && Number(p.automovelId)===autoId && !['Cancelado','Reprovado'].includes(p.status) && p.dataInicio < $('#pFim').value && p.dataFim > $('#pIni').value);
  if(conflitos.length) return aviso('Esse veículo já possui pedido no período selecionado. Escolha outras datas.','warning');
  const dados = { automovelId: Number($('#pAuto').value), dataInicio: $('#pIni').value, dataFim: $('#pFim').value, bancoSolicitadoId: $('#pBanco').value ? Number($('#pBanco').value) : null };
  try {
    if (editando) await api.patch('/pedidos/' + editando.id, { ...dados, bancoId: null, creditoConcedidoPor: '', creditoConcedidoEm: null });
    else await api.post('/pedidos', { ...dados, bancoId: null, creditoConcedidoPor: '', clienteId: cli.id, status: 'Em análise', parecer: '', avaliadoPor: '' });
    modal.hide(); aviso(editando ? 'Pedido atualizado.' : 'Pedido enviado para análise.', 'success'); carregar();
  } catch { aviso('Não foi possível salvar o pedido.'); }
};

function renderDados() {
  $('#dNome').value = cli.nome; $('#dCpf').value = cli.cpf; $('#dRg').value = cli.rg; $('#dEnd').value = cli.endereco; $('#dProf').value = cli.profissao;
  $('#rendas').innerHTML = ''; cli.rendimentos.forEach(r => linhaRenda($('#rendas'), r));
}
$('#addRenda').onclick = () => linhaRenda($('#rendas'));
$('#formDados').onsubmit = async e => {
  e.preventDefault();
  const cpf = $('#dCpf').value.replace(/\D/g, '');
  if (cpf.length !== 11) return aviso('O CPF precisa ter 11 números.', 'warning');
  try {
    await api.patch('/clientes/' + cli.id, { nome: $('#dNome').value.trim(), cpf, rg: $('#dRg').value.trim(), endereco: $('#dEnd').value.trim(), profissao: $('#dProf').value.trim(), rendimentos: lerRendimentos($('#rendas')) });
    aviso('Dados salvos.', 'success'); carregar();
  } catch { aviso('Não foi possível salvar seus dados.'); }
};
$('#excluir').onclick = async () => {
  if (!confirm('Excluir sua conta e todos os seus pedidos? Isso não pode ser desfeito.')) return;
  for (const p of pedidos) await api.del('/pedidos/' + p.id);
  await api.del('/clientes/' + cli.id); await api.del('/usuarios/' + u.id); sessao.sair();
};
carregar();
