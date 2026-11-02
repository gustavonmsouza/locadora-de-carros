const home$ = s => document.querySelector(s);
const imagemFallback = 'assets/car-placeholder.svg';
const usuarioHome = sessao.get();
if (usuarioHome) {
 document.body.classList.add('sessao-ativa');
 const acessoLink = document.querySelector('.catalog-account-link, .site-nav [data-modo="entrar"]');
 if (acessoLink) { acessoLink.href = usuarioHome.tipo === 'cliente' ? 'cliente.html' : 'agente.html'; acessoLink.textContent = 'Minha conta →'; acessoLink.removeAttribute('data-modo'); }
}
let frota = [];
const nomeCarro = a => `${a.marca} ${a.modelo}`;
function renderFrota(lista) {
 const el=home$('#listaVeiculos');
 home$('#contadorVeiculos').textContent=`${lista.length} ${lista.length===1?'veículo':'veículos'} encontrados`;
 if(!lista.length){el.innerHTML='<div class="col-12"><div class="empty-state">Nenhum veículo disponível com esses filtros. Tente outras datas ou modelo.</div></div>';return;}
 const inicio=home$('#dataInicio').value, fim=home$('#dataFim').value;
 el.innerHTML=lista.map(a=>{const img=a.imagem||imagemFallback;const url=`detalhes.html?id=${encodeURIComponent(a.id)}${inicio?'&inicio='+encodeURIComponent(inicio):''}${fim?'&fim='+encodeURIComponent(fim):''}`;
 return `<div class="col-md-6 col-xl-3"><article class="car-card"><a class="car-image-wrap d-block" href="${url}" aria-label="Ver detalhes de ${esc(nomeCarro(a))}"><img class="car-image" src="${esc(img)}" alt="${esc(nomeCarro(a))}" loading="lazy" onerror="this.onerror=null;this.src='${imagemFallback}'"><span class="car-tag">Disponível</span></a>
 <div class="car-info"><span class="car-brand">${esc(a.marca)} • ${esc(a.ano)}</span><h3>${esc(a.modelo)}</h3>${creditoImagem(a)}<div class="car-specs"><span>▣ ${esc(a.matricula)}</span><span>⌁ ${esc(nomeProprietario(a))}</span></div><div class="car-footer"><div><small>Solicite seu aluguel</small><strong>Consulte condições</strong></div><a href="${url}" class="btn btn-primary">Ver detalhes →</a></div></div></article></div>`}).join('');
}
async function carregarFrota(){try{frota=await api.get('/automoveis');renderFrota(frota.filter(a=>a.disponivel));}catch{home$('#listaVeiculos').innerHTML='<div class="col-12"><div class="empty-state">Não foi possível carregar a frota. Confira se o JSON Server está rodando em localhost:3000.</div></div>';}}
home$('#buscaVeiculos').addEventListener('submit',async e=>{e.preventDefault();const termo=home$('#buscaModelo').value.trim().toLowerCase(),inicio=home$('#dataInicio').value,fim=home$('#dataFim').value;if(inicio&&fim&&fim<=inicio){home$('#avisosHome').innerHTML='<div class="alert alert-warning">A data de devolução deve ser posterior à retirada.</div>';return;}home$('#avisosHome').innerHTML='';let lista=frota.filter(a=>a.disponivel&&(!termo||nomeCarro(a).toLowerCase().includes(termo)));if(inicio&&fim){try{const pedidos=await api.get('/pedidos');lista=lista.filter(a=>!pedidos.some(p=>Number(p.automovelId)===Number(a.id)&&!['Cancelado','Reprovado'].includes(p.status)&&p.dataInicio<fim&&p.dataFim>inicio));}catch{}}renderFrota(lista);});
document.querySelectorAll('[data-modo]').forEach(link=>link.addEventListener('click',()=>{const modo=link.dataset.modo;document.querySelectorAll('[data-modo]').forEach(b=>b.classList.toggle('active',b.dataset.modo===modo));home$('#formEntrar').classList.toggle('d-none',modo!=='entrar');home$('#formCadastro').classList.toggle('d-none',modo!=='cadastro');}));
carregarFrota();
