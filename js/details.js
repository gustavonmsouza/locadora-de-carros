const $d = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const vehicleId = Number(params.get('id'));
const fallbackPhoto = 'assets/car-placeholder.svg';
let vehicle;
const showAlert = (msg, type='warning') => $d('#avisos').innerHTML = `<div class="alert alert-${type}" role="alert">${esc(msg)}</div>`;
function renderVehicle(a) {
 const image = a.imagem || fallbackPhoto;
 $d('#detalhesVeiculo').innerHTML = `<div class="details-grid">
  <div class="details-photo"><img src="${esc(image)}" alt="${esc(a.marca+' '+a.modelo)}" onerror="this.onerror=null;this.src='${fallbackPhoto}'"><span class="details-tag">${a.disponivel?'Disponível para solicitação':'Indisponível'}</span>${creditoImagem(a)}</div>
  <div class="details-info"><span class="eyebrow dark-eyebrow">DRIVEON • DETALHES DO VEÍCULO</span><div class="details-title"><h1>${esc(a.marca)} <span>${esc(a.modelo)}</span></h1><span class="year-pill">${esc(a.ano)}</span></div>
   <p class="details-description">Confira os dados do automóvel e informe o período desejado. Seu pedido será enviado para análise de acordo com o processo da plataforma.</p>
   <div class="details-spec-grid"><div><small>Marca</small><strong>${esc(a.marca)}</strong></div><div><small>Modelo</small><strong>${esc(a.modelo)}</strong></div><div><small>Ano</small><strong>${esc(a.ano)}</strong></div><div><small>Matrícula</small><strong>${esc(a.matricula)}</strong></div><div><small>Placa</small><strong>${esc(a.placa)}</strong></div><div><small>Proprietário</small><strong>${esc(nomeProprietario(a))}</strong></div></div>
   <form id="formSolicitar" class="request-box"><h2>Solicitar aluguel</h2><div class="row g-3"><div class="col-sm-6"><label class="form-label" for="retirada">Data de retirada</label><input class="form-control" id="retirada" type="date" required value="${esc(params.get('inicio')||'')}"></div><div class="col-sm-6"><label class="form-label" for="devolucao">Data de devolução</label><input class="form-control" id="devolucao" type="date" required value="${esc(params.get('fim')||'')}"></div><div class="col-12"><label class="form-label" for="banco">Banco para crédito (opcional)</label><select class="form-select" id="banco"><option value="">Sem solicitação de crédito</option></select></div></div><button class="btn btn-accent w-100 mt-3" ${!a.disponivel?'disabled':''}>Enviar pedido para análise <span>→</span></button><small class="request-note">O envio não confirma o aluguel. O pedido será analisado por um agente.</small></form>
  </div></div>`;
}
async function load() {
 if (!vehicleId) { showAlert('Veículo não informado. Volte ao catálogo e selecione um automóvel.'); return; }
 try {
  vehicle = await api.get('/automoveis/'+vehicleId); renderVehicle(vehicle);
  const banks = await api.get('/usuarios?tipo=banco');
  $d('#banco').innerHTML += banks.map(b=>`<option value="${b.id}">${esc(b.nome)}</option>`).join('');
  $d('#formSolicitar').addEventListener('submit', submitRequest);
 } catch { $d('#detalhesVeiculo').innerHTML='<div class="empty-state">Não foi possível carregar o veículo. Verifique o JSON Server.</div>'; }
}
async function submitRequest(e) {
 e.preventDefault();
 const u=sessao.get();
 if (!u || u.tipo!=='cliente') { showAlert('Para enviar um pedido, entre ou crie uma conta de cliente. Depois, volte a este veículo.'); return; }
 const start=$d('#retirada').value, end=$d('#devolucao').value;
 const today=new Date(); today.setHours(0,0,0,0);
 if (!start || !end || end<=start) { showAlert('A devolução precisa ser posterior à retirada.'); return; }
 if (new Date(start+'T00:00:00')<today) { showAlert('A data de retirada não pode estar no passado.'); return; }
 try {
  const [client, orders] = await Promise.all([api.get('/clientes?usuarioId='+u.id),api.get('/pedidos')]);
  if (!client.length) { showAlert('Seu cadastro de cliente não foi encontrado.'); return; }
  const overlap=orders.some(p=>Number(p.automovelId)===vehicleId&&!['Cancelado','Reprovado'].includes(p.status)&&p.dataInicio<end&&p.dataFim>start);
  if (overlap) { showAlert('Este veículo já possui um pedido para período que se sobrepõe. Escolha outras datas.'); return; }
  await api.post('/pedidos',{automovelId:vehicleId,clienteId:client[0].id,dataInicio:start,dataFim:end,bancoSolicitadoId:$d('#banco').value?Number($d('#banco').value):null,bancoId:null,creditoConcedidoPor:'',status:'Em análise',parecer:'',avaliadoPor:''});
  showAlert('Pedido enviado! Você poderá acompanhar o status no painel do cliente.','success');
  $d('#formSolicitar').reset();
 } catch { showAlert('Não foi possível enviar o pedido. Verifique a conexão com o servidor.','danger'); }
}
load();
