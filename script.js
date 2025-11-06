// ----------------------------
// CONFIGURAÇÃO
// ----------------------------
const API_URL = "COLE_AQUI_A_URL_DO_SEU_WEB_APP";

// Dados locais
let produtos = [];
let carrinho = [];
let vendas = [];
let configuracoes = {};

// ----------------------------
// FUNÇÕES DE API
// ----------------------------

// Buscar produtos do Google Sheets
async function fetchProdutos() {
  const res = await fetch(`${API_URL}?action=getProdutos`);
  produtos = await res.json();
  renderEstoque();
  renderProdutosLista();
}

// Adicionar venda
async function enviarVenda(venda) {
  await fetch(`${API_URL}?action=addVenda`, {
    method: "POST",
    body: JSON.stringify(venda),
  });
}

// Buscar configurações
async function fetchConfiguracoes() {
  const res = await fetch(`${API_URL}?action=getConfiguracoes`);
  configuracoes = await res.json();
}

// ----------------------------
// PRODUTOS
// ----------------------------
function renderEstoque() {
  const tbody = document.querySelector('#tabela-estoque tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  produtos.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${Number(p.preco).toFixed(2)}</td>
      <td>${p.quantidade}</td>
      <td>
        <button class="btn" onclick="editarProduto('${p.id}')">Editar</button>
        <button class="btn" onclick="removerProduto('${p.id}')">Apagar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProdutosLista(filter='') {
  const tbody = document.querySelector('#tabela-produtos tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  produtos.filter(p => p.nome.toLowerCase().includes(filter.toLowerCase())).forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${Number(p.preco).toFixed(2)}</td>
      <td>${p.quantidade}</td>
      <td><button class="btn" onclick="addToCart('${p.id}')">+</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------------------------
// CARRINHO
// ----------------------------
function addToCart(id) {
  const produto = produtos.find(p => p.id == id);
  if (!produto) return;
  const item = carrinho.find(c => c.id == id);
  if (item) {
    if (item.qtd + 1 > produto.quantidade) { alert('Sem stock suficiente'); return; }
    item.qtd += 1;
  } else {
    carrinho.push({ ...produto, qtd: 1 });
  }
  renderCarrinho();
  updateTotals();
}

function renderCarrinho() {
  const tbody = document.querySelector('#tabela-carrinho tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  carrinho.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td><input type="number" value="${item.qtd}" min="1" onchange="changeQty('${item.id}', this.value)"></td>
      <td>${Number(item.preco).toFixed(2)}</td>
      <td>${(item.qtd*item.preco).toFixed(2)}</td>
      <td><button class="btn" onclick="removeCart('${item.id}')">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function changeQty(id, val) {
  const item = carrinho.find(c => c.id == id);
  if (!item) return;
  const produto = produtos.find(p => p.id == id);
  if (val > produto.quantidade) { alert('Quantidade maior que stock'); renderCarrinho(); return; }
  item.qtd = Number(val);
  renderCarrinho();
  updateTotals();
}

function removeCart(id) {
  carrinho = carrinho.filter(c => c.id != id);
  renderCarrinho();
  updateTotals();
}

// ----------------------------
// TOTAIS
// ----------------------------
function updateTotals() {
  const subtotal = carrinho.reduce((acc, c) => acc + c.qtd * c.preco, 0);
  const taxa = subtotal * 0.17; // 17% IVA fixo
  const total = subtotal + taxa;
  const elSub = document.getElementById('subtotal');
  const elTaxa = document.getElementById('taxa');
  const elTotal = document.getElementById('total');
  if(elSub) elSub.innerText = subtotal.toFixed(2);
  if(elTaxa) elTaxa.innerText = taxa.toFixed(2);
  if(elTotal) elTotal.innerText = total.toFixed(2);
}

// ----------------------------
// FINALIZAR COMPRA
// ----------------------------
async function finalizarCompra() {
  if(carrinho.length === 0) { alert('Carrinho vazio'); return; }
  const cliente = prompt('Nome do cliente:', 'Consumidor final') || 'Consumidor final';
  const subtotal = parseFloat(document.getElementById('subtotal').innerText);
  const taxa = parseFloat(document.getElementById('taxa').innerText);
  const total = parseFloat(document.getElementById('total').innerText);
  const venda = {
    id: Date.now().toString(),
    data: new Date().toISOString(),
    cliente,
    produtos: carrinho,
    subtotal,
    taxa,
    total
  };
  await enviarVenda(venda);
  vendas.push(venda);
  // Atualizar stock
  carrinho.forEach(item => {
    const produto = produtos.find(p => p.id == item.id);
    if(produto) produto.quantidade -= item.qtd;
  });
  carrinho = [];
  renderEstoque();
  renderCarrinho();
  updateTotals();
  alert('Venda registrada com sucesso!');
  abrirFatura(venda);
}

// ----------------------------
// FATURA
// ----------------------------
function abrirFatura(venda) {
  let html = `<h2>Fatura Nº: ${venda.id}</h2>`;
  html += `<p>Cliente: ${venda.cliente}</p>`;
  html += `<p>Data: ${new Date(venda.data).toLocaleString()}</p>`;
  html += `<table border="1" cellpadding="6"><thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead><tbody>`;
  venda.produtos.forEach(item => {
    html += `<tr>
      <td>${item.nome}</td>
      <td>${item.qtd}</td>
      <td>${item.preco.toFixed(2)}</td>
      <td>${(item.qtd*item.preco).toFixed(2)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  html += `<p>Subtotal: ${venda.subtotal.toFixed(2)}</p>`;
  html += `<p>Taxa: ${venda.taxa.toFixed(2)}</p>`;
  html += `<p>Total: ${venda.total.toFixed(2)}</p>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

// ----------------------------
// PRODUTOS CRUD SIMPLES (local, futuramente API)
// ----------------------------
function editarProduto(id) {
  const produto = produtos.find(p => p.id == id);
  if(!produto) return;
  const nome = prompt('Nome:', produto.nome);
  if(!nome) return;
  const preco = parseFloat(prompt('Preço:', produto.preco));
  const qtd = parseInt(prompt('Quantidade:', produto.quantidade));
  produto.nome = nome;
  produto.preco = preco;
  produto.quantidade = qtd;
  renderEstoque();
  renderProdutosLista();
}

function removerProduto(id) {
  if(!confirm('Deseja realmente remover?')) return;
  produtos = produtos.filter(p => p.id != id);
  renderEstoque();
  renderProdutosLista();
}

// ----------------------------
// VENDAS
// ----------------------------
function renderVendas() {
  const tbody = document.querySelector('#tabela-vendas tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  vendas.slice().reverse().forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.id}</td>
      <td>${new Date(v.data).toLocaleString()}</td>
      <td>${v.total.toFixed(2)}</td>
      <td><button class="btn" onclick="abrirFaturaById('${v.id}')">Ver Fatura</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function abrirFaturaById(id) {
  const venda = vendas.find(v => v.id == id);
  if(venda) abrirFatura(venda);
}

// ----------------------------
// EVENT LISTENERS
// ----------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await fetchProdutos();
  await fetchConfiguracoes();

  const search = document.getElementById('search');
  if(search) search.addEventListener('input', e => renderProdutosLista(e.target.value));

  const btnFinalizar = document.getElementById('btn-finalizar');
  if(btnFinalizar) btnFinalizar.addEventListener('click', finalizarCompra);
});
