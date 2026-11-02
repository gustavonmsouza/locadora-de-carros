const API = 'http://localhost:3000';
async function req(caminho, opts = {}) {
  const r = await fetch(API + caminho, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) throw new Error('Falha na API (' + r.status + ')');
  return r.json();
}
const api = {
  get: p => req(p),
  post: (p, b) => req(p, { method: 'POST', body: JSON.stringify(b) }),
  patch: (p, b) => req(p, { method: 'PATCH', body: JSON.stringify(b) }),
  del: p => req(p, { method: 'DELETE' })
};
const sessao = {
  get: () => JSON.parse(sessionStorage.getItem('sessao') || 'null'),
  set: u => sessionStorage.setItem('sessao', JSON.stringify(u)),
  sair() { sessionStorage.removeItem('sessao'); location.href = 'index.html'; }
};
function exigir(tipos) {
  const u = sessao.get();
  if (!u || !tipos.includes(u.tipo)) { location.href = 'index.html'; throw new Error('sem sessão'); }
  return u;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = d => d.split('-').reverse().join('/');
const placaHtml = (p, extra = '') => `<span class="placa ${extra}"><i>BRASIL</i><b>${esc(p)}</b></span>`;
const nomeProprietario = a => a.proprietarioNome || ({ empresa: 'Empresa', banco: 'Banco', cliente: 'Cliente' }[a.proprietario] || 'Não informado');
const urlsLicencasImagem = {
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/'
};
const creditoImagem = a => a.imagemFonte && a.imagemAutor
  ? `<small class="image-credit">Foto: <a href="${esc(a.imagemFonte)}" target="_blank" rel="noopener noreferrer">${esc(a.imagemAutor)}</a> · <a href="${urlsLicencasImagem[a.imagemLicenca] || esc(a.imagemFonte)}" target="_blank" rel="noopener noreferrer">${esc(a.imagemLicenca || 'Wikimedia Commons')}</a></small>`
  : '';
function aviso(msg, tipo = 'danger') {
  const el = document.getElementById('avisos');
  el.innerHTML = `<div class="alert alert-${tipo} alert-dismissible" role="alert">${esc(msg)}<button class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button></div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function lerRendimentos(container) {
  return [...container.querySelectorAll('.renda')].map(l => ({
    empregador: l.querySelector('[name=empregador]').value.trim(),
    valor: Number(l.querySelector('[name=valor]').value)
  })).filter(r => r.empregador && r.valor > 0);
}
function linhaRenda(container, r = {}) {
  if (container.querySelectorAll('.renda').length >= 3) return aviso('O máximo é de 3 rendimentos.', 'warning');
  const d = document.createElement('div');
  d.className = 'renda row g-2 mb-2';
  d.innerHTML = `<div class="col-7"><input name="empregador" class="form-control" placeholder="Empregador" value="${esc(r.empregador || '')}"></div>
    <div class="col-4"><input name="valor" type="number" min="0" step="0.01" class="form-control" placeholder="Valor (R$)" value="${r.valor || ''}"></div>
    <div class="col-1"><button type="button" class="btn btn-outline-secondary w-100" aria-label="Remover">×</button></div>`;
  d.querySelector('button').onclick = () => d.remove();
  container.appendChild(d);
}
