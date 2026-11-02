const u = exigir(['empresa', 'banco']);
let pedidos = [], clientes = [], autos = [], bancos = [], contratos = [], atual = null, pedidoEditando = null;
const $ = s => document.querySelector(s);

// Usa o modal do Bootstrap quando disponível e um fallback simples caso a CDN falhe.
const elementoModal = $('#modalAval');
const modal = (typeof bootstrap !== 'undefined' && bootstrap.Modal)
  ? new bootstrap.Modal(elementoModal)
  : {
      show() {
        elementoModal.style.display = 'block';
        elementoModal.classList.add('show');
        elementoModal.removeAttribute('aria-hidden');
        elementoModal.setAttribute('aria-modal', 'true');
        document.body.classList.add('modal-open');
        if (!document.querySelector('.modal-backdrop')) {
          const backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          backdrop.onclick = () => this.hide();
          document.body.appendChild(backdrop);
        }
      },
      hide() {
        elementoModal.classList.remove('show');
        elementoModal.style.display = 'none';
        elementoModal.setAttribute('aria-hidden', 'true');
        elementoModal.removeAttribute('aria-modal');
        document.body.classList.remove('modal-open');
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      }
    };
elementoModal.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => btn.addEventListener('click', () => modal.hide()));
$('#quem').textContent = u.nome + (u.tipo === 'banco' ? ' (banco)' : ' (empresa)');
const elementoModalEditar = $('#modalEditarPedido');
const modalEditar = (typeof bootstrap !== 'undefined' && bootstrap.Modal)
  ? new bootstrap.Modal(elementoModalEditar)
  : {
      show() {
        elementoModalEditar.style.display = 'block';
        elementoModalEditar.classList.add('show');
        elementoModalEditar.removeAttribute('aria-hidden');
        elementoModalEditar.setAttribute('aria-modal', 'true');
        document.body.classList.add('modal-open');
        if (!document.querySelector('.modal-backdrop')) {
          const backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          backdrop.onclick = () => this.hide();
          document.body.appendChild(backdrop);
        }
      },
      hide() {
        elementoModalEditar.classList.remove('show');
        elementoModalEditar.style.display = 'none';
        elementoModalEditar.setAttribute('aria-hidden', 'true');
        elementoModalEditar.removeAttribute('aria-modal');
        document.body.classList.remove('modal-open');
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      }
    };
elementoModalEditar.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => btn.addEventListener('click', () => modalEditar.hide()));

const bancoSolicitadoId = p => p.bancoSolicitadoId ?? (!p.creditoConcedidoPor ? p.bancoId : null);
const bancoCredor = p => p.creditoConcedidoPor ? bancos.find(b => Number(b.id) === Number(p.bancoId)) : null;
async function carregar() {
  try {
    [pedidos, clientes, autos, bancos, contratos] = await Promise.all([
      api.get('/pedidos'), api.get('/clientes'), api.get('/automoveis'),
      api.get('/usuarios?tipo=banco'), api.get('/contratos')
    ]);
    render();
    renderContratos();
  } catch {
    aviso('Não foi possível carregar. Confira se o JSON Server está ativo e se a coleção contratos existe no db.json.');
  }
}

function render() {
  const filtro = $('#filtro').value;
  const lista = pedidos.filter(p => !filtro || p.status === filtro).slice().reverse();
  const counts = ['Em análise', 'Aprovado', 'Reprovado', 'Contratado'].map(st => [st, pedidos.filter(p => p.status === st).length]);
  $('#resumoAgente').innerHTML = counts.map(([st, n]) => `<div class="col-6 col-lg-3"><div class="metric-card metric-${st.toLowerCase().replaceAll(' ', '-')}"><span>${esc(st)}</span><strong>${n}</strong><small>pedido${n === 1 ? '' : 's'}</small></div></div>`).join('');
  if (!lista.length) {
    $('#lista').innerHTML = '<div class="vazio">Nenhum pedido para esse filtro.</div>';
    return;
  }

  $('#lista').innerHTML = lista.map(p => {
    const c = clientes.find(x => Number(x.id) === Number(p.clienteId)) || { rendimentos: [] };
    const a = autos.find(x => Number(x.id) === Number(p.automovelId)) || {};
    const pedidoBanco = bancos.find(b => Number(b.id) === Number(bancoSolicitadoId(p)));
    const credor = bancoCredor(p);
    const renda = (c.rendimentos || []).reduce((sum, r) => sum + Number(r.valor || 0), 0);
    const acts = [];
    if (['Em análise', 'Aprovado'].includes(p.status)) acts.push(`<button class="btn btn-sm btn-outline-primary" data-editar-pedido="${p.id}">Editar pedido</button>`);
    if (p.status === 'Em análise') acts.push(`<button class="btn btn-sm btn-primary" data-av="${p.id}">Avaliar</button>`);
    if (p.status === 'Aprovado') acts.push(`<button class="btn btn-sm btn-primary" data-ct="${p.id}">Executar contrato</button>`);
    const podeConceder = u.tipo === 'banco' && !p.creditoConcedidoPor && ['Em análise', 'Aprovado'].includes(p.status)
      && (!pedidoBanco || Number(pedidoBanco.id) === Number(u.id));
    if (podeConceder) acts.push(`<button class="btn btn-sm btn-outline-primary" data-cr="${p.id}">Conceder crédito</button>`);
    const credito = pedidoBanco ? `Crédito solicitado a: ${esc(pedidoBanco.nome)}` : 'Sem crédito solicitado';
    const estadoCredito = credor ? ` · concedido por ${esc(credor.nome)}` : (p.creditoConcedidoPor ? ` · concedido por ${esc(p.creditoConcedidoPor)}` : ' · aguardando análise do banco');
    return `<article class="review-card">
      <div class="review-main"><div class="review-heading"><div><span class="section-kicker">PEDIDO #${esc(p.id)}</span><h3>${esc(c.nome)}</h3><span class="review-subtitle">${esc(c.profissao || 'Profissão não informada')}</span></div><span class="status status-${esc(p.status.toLowerCase().replaceAll(' ', '-'))}">${esc(p.status)}</span></div>
      <div class="review-trip"><strong>${esc(a.marca)} ${esc(a.modelo)}</strong><span>${esc(a.ano)} · ${dataBR(p.dataInicio)} a ${dataBR(p.dataFim)}</span></div>
      <div class="review-details"><div><small>RENDA MENSAL</small><strong>${brl(renda)}</strong></div><div><small>DOCUMENTOS</small><span>CPF ${esc(c.cpf || '—')} · RG ${esc(c.rg || '—')}</span></div><div><small>FONTES DE RENDA</small><span>${esc((c.rendimentos || []).map(r => r.empregador + ' (' + brl(r.valor) + ')').join(', ') || 'Sem rendimentos cadastrados')}</span></div><div><small>ENDEREÇO</small><span>${esc(c.endereco || '—')}</span></div></div>
      <p class="review-credit">${credito}${pedidoBanco ? estadoCredito : ''}</p>${p.parecer ? `<p class="parecer">${esc(p.avaliadoPor)}: ${esc(p.parecer)}</p>` : ''}</div><div class="review-actions">${acts.join('')}</div></article>`;
  }).join('');

  document.querySelectorAll('[data-editar-pedido]').forEach(btn => btn.onclick = () => abrirEdicao(pedidos.find(p => Number(p.id) === Number(btn.dataset.editarPedido))));
  document.querySelectorAll('[data-av]').forEach(btn => btn.onclick = () => {
    atual = pedidos.find(p => p.id == btn.dataset.av);
    const c = clientes.find(x => Number(x.id) === Number(atual.clienteId)) || { rendimentos: [] };
    const a = autos.find(x => Number(x.id) === Number(atual.automovelId)) || {};
    const renda = (c.rendimentos || []).reduce((sum, r) => sum + Number(r.valor || 0), 0);
    const escolhido = bancos.find(b => Number(b.id) === Number(bancoSolicitadoId(atual)));
    $('#parecer').value = '';
    $('#resumo').textContent = `${c.nome} — ${a.marca} ${a.modelo}, ${dataBR(atual.dataInicio)} a ${dataBR(atual.dataFim)}.`;
    $('#dadosFinanceiros').innerHTML = `<b>CPF:</b> ${esc(c.cpf || '—')} · <b>RG:</b> ${esc(c.rg || '—')}<br><b>Profissão:</b> ${esc(c.profissao || '—')}<br><b>Endereço:</b> ${esc(c.endereco || '—')}<br><b>Renda mensal declarada:</b> ${brl(renda)}<br><b>Fontes:</b> ${esc((c.rendimentos || []).map(r => r.empregador + ': ' + brl(r.valor)).join(' | ') || 'Não informadas')}<br><b>Banco solicitado:</b> ${esc(escolhido?.nome || 'Nenhum')}`;
    modal.show();
  });
  document.querySelectorAll('[data-ct]').forEach(btn => btn.onclick = () => contratar(pedidos.find(p => p.id == btn.dataset.ct)));
  document.querySelectorAll('[data-cr]').forEach(btn => btn.onclick = async () => {
    try {
      const pedido = pedidos.find(p => p.id == btn.dataset.cr);
      await api.patch('/pedidos/' + pedido.id, { bancoId: Number(u.id), creditoConcedidoPor: u.nome, creditoConcedidoEm: new Date().toISOString() });
      aviso('Crédito concedido pelo banco. A propriedade do veículo permanece registrada separadamente.', 'success');
      carregar();
    } catch { aviso('Não foi possível conceder o crédito.'); }
  });
}

function abrirEdicao(p) {
  if (!p || !['Em análise', 'Aprovado'].includes(p.status)) return;
  pedidoEditando = p;
  const autoId = Number(p.automovelId);
  $('#editarAuto').innerHTML = autos
    .filter(a => a.disponivel || Number(a.id) === autoId)
    .map(a => `<option value="${a.id}">${esc(a.marca)} ${esc(a.modelo)} ${esc(a.ano)} (${esc(a.placa)})</option>`).join('');
  $('#editarBanco').innerHTML = '<option value="">Sem solicitação de crédito</option>'
    + bancos.map(b => `<option value="${b.id}">${esc(b.nome)}</option>`).join('');
  $('#editarAuto').value = String(autoId);
  $('#editarInicio').value = p.dataInicio || '';
  $('#editarFim').value = p.dataFim || '';
  $('#editarBanco').value = bancoSolicitadoId(p) == null ? '' : String(bancoSolicitadoId(p));
  modalEditar.show();
}

$('#formEditarPedido').onsubmit = async e => {
  e.preventDefault();
  if (!pedidoEditando) return;
  const dataInicio = $('#editarInicio').value;
  const dataFim = $('#editarFim').value;
  const automovelId = Number($('#editarAuto').value);
  const bancoSolicitado = $('#editarBanco').value;
  if (!dataInicio || !dataFim || dataFim <= dataInicio) return aviso('A devolução precisa ser posterior à retirada.', 'warning');
  if (dataInicio < new Date().toISOString().slice(0, 10)) return aviso('A data de retirada não pode estar no passado.', 'warning');
  try {
    const [pedidosAtuais, autosAtuais] = await Promise.all([api.get('/pedidos'), api.get('/automoveis')]);
    const pedidoAtual = pedidosAtuais.find(p => Number(p.id) === Number(pedidoEditando.id));
    if (!pedidoAtual || !['Em análise', 'Aprovado'].includes(pedidoAtual.status)) {
      pedidoEditando = null;
      modalEditar.hide();
      aviso('Este pedido não está mais disponível para edição. A lista foi atualizada.', 'warning');
      return carregar();
    }
    const autoEscolhido = autosAtuais.find(a => Number(a.id) === automovelId);
    if (!autoEscolhido || (!autoEscolhido.disponivel && automovelId !== Number(pedidoAtual.automovelId))) {
      return aviso('Este veículo não está mais disponível. Selecione outro carro.', 'warning');
    }
    const conflito = pedidosAtuais.some(p => Number(p.id) !== Number(pedidoEditando.id)
      && Number(p.automovelId) === automovelId
      && !['Cancelado', 'Reprovado'].includes(p.status)
      && p.dataInicio < dataFim && p.dataFim > dataInicio);
    if (conflito) return aviso('Esse veículo já possui pedido no período selecionado. Escolha outras datas.', 'warning');

    await api.patch('/pedidos/' + pedidoEditando.id, {
      automovelId,
      dataInicio,
      dataFim,
      bancoSolicitadoId: bancoSolicitado ? Number(bancoSolicitado) : null,
      bancoId: null,
      creditoConcedidoPor: '',
      creditoConcedidoEm: null,
      status: 'Em análise',
      parecer: '',
      avaliadoPor: '',
      avaliadoEm: null,
      contratoId: null
    });
    modalEditar.hide();
    pedidoEditando = null;
    aviso('Pedido atualizado e enviado novamente para análise.', 'success');
    carregar();
  } catch { aviso('Não foi possível atualizar o pedido. Confira a conexão com o JSON Server.'); }
};

async function avaliar(status) {
  if (!atual) return;
  if (!$('#parecer').value.trim()) return aviso('Informe um parecer financeiro para decidir.', 'warning');
  try {
    await api.patch('/pedidos/' + atual.id, { status, parecer: $('#parecer').value.trim(), avaliadoPor: u.nome, avaliadoEm: new Date().toISOString() });
    modal.hide();
    aviso('Pedido ' + status.toLowerCase() + '.', 'success');
    carregar();
  } catch { aviso('Falha ao registrar avaliação.'); }
}
$('#aprovar').onclick = () => avaliar('Aprovado');
$('#reprovar').onclick = () => avaliar('Reprovado');

function proprietarioVeiculo(a) {
  if (a.proprietario === 'cliente') {
    const dono = clientes.find(c => Number(c.id) === Number(a.proprietarioClienteId));
    return { tipo: 'cliente', id: a.proprietarioClienteId ?? null, nome: dono?.nome || 'Cliente' };
  }
  const dono = a.proprietario === 'banco' ? bancos.find(b => Number(b.id) === Number(a.proprietarioId)) : null;
  return { tipo: a.proprietario || 'empresa', id: a.proprietarioId ?? null, nome: dono?.nome || a.proprietarioNome || a.proprietario || 'empresa' };
}
async function contratar(p) {
  if (!confirm('Executar contrato deste pedido? O veículo será marcado como indisponível.')) return;
  try {
    const c = clientes.find(x => Number(x.id) === Number(p.clienteId)) || {};
    const a = autos.find(x => Number(x.id) === Number(p.automovelId)) || {};
    const dono = proprietarioVeiculo(a);
    const contrato = await api.post('/contratos', {
      pedidoId: p.id, clienteId: p.clienteId, automovelId: p.automovelId,
      bancoId: p.creditoConcedidoPor ? p.bancoId : null,
      bancoSolicitadoId: bancoSolicitadoId(p), numero: 'DRV-' + String(Date.now()).slice(-8),
      dataEmissao: new Date().toISOString().slice(0, 10), dataInicio: p.dataInicio, dataFim: p.dataFim,
      status: 'Ativo', proprietario: dono.tipo, proprietarioId: dono.id, proprietarioNome: dono.nome,
      clienteNome: c.nome || '', automovelDescricao: `${a.marca || ''} ${a.modelo || ''} ${a.ano || ''}`.trim()
    });
    await api.patch('/pedidos/' + p.id, { status: 'Contratado', contratoId: contrato.id });
    // Contratar o veículo muda sua disponibilidade, sem trocar seu proprietário.
    await api.patch('/automoveis/' + p.automovelId, { disponivel: false });
    aviso('Contrato executado com sucesso.', 'success');
    carregar();
  } catch { aviso('Não foi possível executar o contrato. Verifique a coleção contratos.'); }
}

function renderContratos() {
  if (!contratos.length) {
    $('#listaContratos').innerHTML = '<p class="text-muted">Nenhum contrato executado.</p>';
    return;
  }
  $('#listaContratos').innerHTML = `<table class="table align-middle"><thead><tr><th>Número</th><th>Cliente</th><th>Veículo</th><th>Período</th><th>Status</th><th>Documento</th></tr></thead><tbody>${contratos.slice().reverse().map(c => `<tr><td>${esc(c.numero)}</td><td>${esc(c.clienteNome)}</td><td>${esc(c.automovelDescricao)}</td><td>${dataBR(c.dataInicio)}–${dataBR(c.dataFim)}</td><td>${esc(c.status)}</td><td><a class="btn btn-sm btn-outline-primary" href="contrato.html?id=${encodeURIComponent(c.id)}" target="_blank" rel="noopener">Visualizar / imprimir</a></td></tr>`).join('')}</tbody></table>`;
}
$('#filtro').onchange = render;
carregar();
