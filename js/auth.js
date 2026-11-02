const $ = s => document.querySelector(s);
const destino = u => u.tipo === 'cliente' ? 'cliente.html' : 'agente.html';
if (sessao.get()) location.href = destino(sessao.get());

document.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-modo]').forEach(x => x.classList.toggle('active', x === b));
  $('#formEntrar').classList.toggle('d-none', b.dataset.modo !== 'entrar');
  $('#formCadastro').classList.toggle('d-none', b.dataset.modo !== 'cadastro');
});
$('#cTipo').onchange = e => $('#camposCliente').classList.toggle('d-none', e.target.value !== 'cliente');
$('#addRenda').onclick = () => linhaRenda($('#rendas'));
linhaRenda($('#rendas'));

$('#formEntrar').onsubmit = async e => {
  e.preventDefault();
  try {
    const q = `/usuarios?email=${encodeURIComponent($('#eEmail').value.trim())}&senha=${encodeURIComponent($('#eSenha').value)}`;
    const [u] = await api.get(q);
    if (!u) return aviso('E-mail ou senha incorretos.');
    sessao.set(u); location.href = destino(u);
  } catch { aviso('Não foi possível falar com o servidor. O JSON Server está rodando?'); }
};

$('#formCadastro').onsubmit = async e => {
  e.preventDefault();
  const tipo = $('#cTipo').value, email = $('#cEmail').value.trim(), nome = $('#cNome').value.trim();
  try {
    if ((await api.get('/usuarios?email=' + encodeURIComponent(email))).length) return aviso('Esse e-mail já tem cadastro.');
    if (tipo === 'cliente') {
      const cpf = $('#cCpf').value.replace(/\D/g, '');
      if (cpf.length !== 11) return aviso('O CPF precisa ter 11 números.');
      if (!$('#cRg').value.trim() || !$('#cEnd').value.trim() || !$('#cProf').value.trim()) return aviso('Preencha RG, endereço e profissão.');
    }
    const u = await api.post('/usuarios', { nome, email, senha: $('#cSenha').value, tipo });
    if (tipo === 'cliente') await api.post('/clientes', {
      usuarioId: u.id, nome, cpf: $('#cCpf').value.replace(/\D/g, ''), rg: $('#cRg').value.trim(),
      endereco: $('#cEnd').value.trim(), profissao: $('#cProf').value.trim(), rendimentos: lerRendimentos($('#rendas'))
    });
    sessao.set(u); location.href = destino(u);
  } catch { aviso('Não foi possível criar a conta. Confira o servidor e tente de novo.'); }
};
