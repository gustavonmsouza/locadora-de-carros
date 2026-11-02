(async () => {
  const id = new URLSearchParams(location.search).get('id');
  const el = document.querySelector('#documento');
  try {
    const c = await api.get('/contratos/' + encodeURIComponent(id));
    const [cliente, auto, banco] = await Promise.all([
      api.get('/clientes?id=' + encodeURIComponent(c.clienteId)),
      api.get('/automoveis?id=' + encodeURIComponent(c.automovelId)),
      c.bancoId ? api.get('/usuarios?id=' + encodeURIComponent(c.bancoId)) : Promise.resolve([])
    ]);
    const pessoa = cliente[0] || {};
    const carro = auto[0] || {};
    const credor = banco[0];
    const proprietario = c.proprietarioNome || carro.proprietarioNome || c.proprietario || carro.proprietario || 'Não informado';
    const credito = credor ? `Crédito concedido por ${esc(credor.nome)}.` : 'Sem crédito concedido vinculado.';
    el.innerHTML = `<div class="text-center mb-5"><div class="brand-mark mx-auto mb-3">D</div><h1>CONTRATO DE LOCAÇÃO DE AUTOMÓVEL</h1><p class="text-muted">DriveOn · Documento demonstrativo acadêmico</p></div>
      <p><b>Contrato nº:</b> ${esc(c.numero)} &nbsp; <b>Emissão:</b> ${dataBR(c.dataEmissao)}</p>
      <h2 class="fs-5 mt-4">1. PARTES</h2><p><b>Locatário(a):</b> ${esc(pessoa.nome || c.clienteNome)}<br><b>CPF:</b> ${esc(pessoa.cpf || 'Não informado')} · <b>RG:</b> ${esc(pessoa.rg || 'Não informado')}<br><b>Endereço:</b> ${esc(pessoa.endereco || 'Não informado')}</p>
      <h2 class="fs-5 mt-4">2. VEÍCULO</h2><p><b>Automóvel:</b> ${esc(carro.marca || '')} ${esc(carro.modelo || '')} (${esc(carro.ano || '')})<br><b>Matrícula:</b> ${esc(carro.matricula || '')} · <b>Placa:</b> ${esc(carro.placa || '')}<br><b>Proprietário registrado:</b> ${esc(proprietario)}</p>
      <h2 class="fs-5 mt-4">3. PERÍODO</h2><p>Retirada: <b>${dataBR(c.dataInicio)}</b><br>Devolução: <b>${dataBR(c.dataFim)}</b></p>
      <h2 class="fs-5 mt-4">4. CRÉDITO</h2><p>${credito}</p>
      <h2 class="fs-5 mt-4">5. DISPOSIÇÕES</h2><p>As partes reconhecem os dados acima e a formalização do pedido no sistema DriveOn. Este documento é um protótipo acadêmico, não constitui instrumento jurídico real e não substitui a revisão contratual.</p>
      <div class="row mt-5 pt-5"><div class="col-6 text-center"><hr>Locatário(a): ${esc(pessoa.nome || c.clienteNome)}</div><div class="col-6 text-center"><hr>Representante DriveOn</div></div>
      <p class="text-muted small mt-4">Status: ${esc(c.status)} · Documento gerado a partir do pedido ${esc(c.pedidoId)}</p>`;
  } catch {
    el.innerHTML = '<div class="alert alert-danger">Contrato não encontrado.</div>';
  }
})();
