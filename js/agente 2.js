const u = exigir(['empresa','banco']);
let pedidos=[], clientes=[], autos=[], bancos=[], contratos=[], atual=null;
const $=s=>document.querySelector(s);
// Modal resiliente: funciona mesmo se o JavaScript do Bootstrap CDN não carregar.
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
// Fechar modal pelo botão X também no modo fallback.
elementoModal.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => btn.addEventListener('click', () => modal.hide()));
$('#quem').textContent=u.nome+(u.tipo==='banco'?' (banco)':' (empresa)');
async function carregar(){try{[pedidos,clientes,autos,bancos,contratos]=await Promise.all([api.get('/pedidos'),api.get('/clientes'),api.get('/automoveis'),api.get('/usuarios?tipo=banco'),api.get('/contratos')]);render();renderContratos();}catch(e){aviso('Não foi possível carregar. Confira se o JSON Server está ativo e se a coleção contratos existe no db.json.');}}
function render(){const filtro=$('#filtro').value;const lista=pedidos.filter(p=>!filtro||p.status===filtro).slice().reverse();
const counts=['Em análise','Aprovado','Reprovado','Contratado'].map(st=>[st,pedidos.filter(p=>p.status===st).length]);$('#resumoAgente').innerHTML=counts.map(([st,n])=>`<div class="col-6 col-lg-3"><div class="painel h-100"><small class="text-muted">${esc(st)}</small><div class="fs-2 fw-bold">${n}</div></div></div>`).join('');
if(!lista.length){$('#lista').innerHTML='<div class="vazio">Nenhum pedido para esse filtro.</div>';return;}
$('#lista').innerHTML=lista.map(p=>{const c=clientes.find(x=>Number(x.id)===Number(p.clienteId))||{rendimentos:[]},a=autos.find(x=>Number(x.id)===Number(p.automovelId))||{},b=bancos.find(x=>Number(x.id)===Number(p.bancoId));const renda=(c.rendimentos||[]).reduce((sum,r)=>sum+Number(r.valor||0),0);const acts=[];if(p.status==='Em análise')acts.push(`<button class="btn btn-sm btn-primary" data-av="${p.id}">Avaliar</button>`);if(p.status==='Aprovado')acts.push(`<button class="btn btn-sm btn-primary" data-ct="${p.id}">Executar contrato</button>`);if(u.tipo==='banco'&&!p.bancoId&&['Em análise','Aprovado'].includes(p.status))acts.push(`<button class="btn btn-sm btn-outline-primary" data-cr="${p.id}">Vincular crédito</button>`);
return `<article class="pedido">${placaHtml(a.placa)}<div><strong>${esc(c.nome)}</strong> · ${esc(c.profissao||'Profissão não informada')}<br><b>Renda total:</b> ${brl(renda)} · ${esc((c.rendimentos||[]).map(r=>r.empregador+' ('+brl(r.valor)+')').join(', ')||'Sem rendimentos cadastrados')}<br><b>Identificação:</b> CPF ${esc(c.cpf||'—')} · RG ${esc(c.rg||'—')}<br><b>Endereço:</b> ${esc(c.endereco||'—')}<br>${esc(a.marca)} ${esc(a.modelo)} (${esc(a.ano)}) · ${dataBR(p.dataInicio)} a ${dataBR(p.dataFim)}<br><span class="status">${esc(p.status)}</span> · ${b?'Crédito: '+esc(b.nome):'Sem crédito'}${p.parecer?`<p class="parecer">${esc(p.avaliadoPor)}: ${esc(p.parecer)}</p>`:''}</div><div class="d-grid gap-2">${acts.join('')}</div></article>`}).join('');
document.querySelectorAll('[data-av]').forEach(btn=>btn.onclick=()=>{atual=pedidos.find(p=>p.id==btn.dataset.av);const c=clientes.find(x=>Number(x.id)===Number(atual.clienteId))||{rendimentos:[]};const a=autos.find(x=>Number(x.id)===Number(atual.automovelId))||{};const renda=(c.rendimentos||[]).reduce((sum,r)=>sum+Number(r.valor||0),0);$('#parecer').value='';$('#resumo').textContent=`${c.nome} — ${a.marca} ${a.modelo}, ${dataBR(atual.dataInicio)} a ${dataBR(atual.dataFim)}.`;$('#dadosFinanceiros').innerHTML=`<b>CPF:</b> ${esc(c.cpf||'—')} · <b>RG:</b> ${esc(c.rg||'—')}<br><b>Profissão:</b> ${esc(c.profissao||'—')}<br><b>Endereço:</b> ${esc(c.endereco||'—')}<br><b>Renda mensal declarada:</b> ${brl(renda)}<br><b>Fontes:</b> ${esc((c.rendimentos||[]).map(r=>r.empregador+': '+brl(r.valor)).join(' | ')||'Não informadas')}<br><b>Banco selecionado:</b> ${esc(bancos.find(b=>Number(b.id)===Number(atual.bancoId))?.nome||'Nenhum')}`;modal.show();});
document.querySelectorAll('[data-ct]').forEach(btn=>btn.onclick=()=>contratar(pedidos.find(p=>p.id==btn.dataset.ct)));document.querySelectorAll('[data-cr]').forEach(btn=>btn.onclick=async()=>{try{await api.patch('/pedidos/'+btn.dataset.cr,{bancoId:Number(u.id),creditoConcedidoPor:u.nome});aviso('Crédito vinculado ao pedido.','success');carregar();}catch{aviso('Não foi possível vincular o crédito.')}});
}
async function avaliar(status){if(!$('#parecer').value.trim())return aviso('Informe um parecer financeiro para decidir.','warning');try{await api.patch('/pedidos/'+atual.id,{status,parecer:$('#parecer').value.trim(),avaliadoPor:u.nome,avaliadoEm:new Date().toISOString()});modal.hide();aviso('Pedido '+status.toLowerCase()+'.','success');carregar();}catch{aviso('Falha ao registrar avaliação.')}}
$('#aprovar').onclick=()=>avaliar('Aprovado');$('#reprovar').onclick=()=>avaliar('Reprovado');
async function contratar(p){if(!confirm('Executar contrato deste pedido? O veículo será marcado como indisponível.'))return;try{const c=clientes.find(x=>Number(x.id)===Number(p.clienteId))||{},a=autos.find(x=>Number(x.id)===Number(p.automovelId))||{};const contrato=await api.post('/contratos',{pedidoId:p.id,clienteId:p.clienteId,automovelId:p.automovelId,bancoId:p.bancoId||null,numero:'DRV-'+String(Date.now()).slice(-8),dataEmissao:new Date().toISOString().slice(0,10),dataInicio:p.dataInicio,dataFim:p.dataFim,status:'Ativo',proprietario:p.bancoId?'banco':'empresa',clienteNome:c.nome||'',automovelDescricao:`${a.marca||''} ${a.modelo||''} ${a.ano||''}`.trim()});await api.patch('/pedidos/'+p.id,{status:'Contratado',contratoId:contrato.id});await api.patch('/automoveis/'+p.automovelId,{disponivel:false,proprietario:p.bancoId?'banco':'empresa'});aviso('Contrato executado com sucesso.','success');carregar();}catch{aviso('Não foi possível executar o contrato. Verifique a coleção contratos.')}}
function renderContratos(){if(!contratos.length){$('#listaContratos').innerHTML='<p class="text-muted">Nenhum contrato executado.</p>';return;}$('#listaContratos').innerHTML=`<table class="table align-middle"><thead><tr><th>Número</th><th>Cliente</th><th>Veículo</th><th>Período</th><th>Status</th><th>Documento</th></tr></thead><tbody>${contratos.slice().reverse().map(c=>`<tr><td>${esc(c.numero)}</td><td>${esc(c.clienteNome)}</td><td>${esc(c.automovelDescricao)}</td><td>${dataBR(c.dataInicio)}–${dataBR(c.dataFim)}</td><td>${esc(c.status)}</td><td><a class="btn btn-sm btn-outline-primary" href="contrato.html?id=${c.id}" target="_blank">Visualizar / imprimir</a></td></tr>`).join('')}</tbody></table>`}
$('#filtro').onchange=render;carregar();
