// script.js - Sistema de Loja

// --- Chaves localStorage ---
const LS_KEYS = { PROD:'sg_produtos_v2', VEND:'sg_vendas_v2', CONF:'sg_conf_v2' };

// --- Dados ---
let produtos = JSON.parse(localStorage.getItem(LS_KEYS.PROD) || '[]');
let vendas = JSON.parse(localStorage.getItem(LS_KEYS.VEND) || '[]');
let conf = JSON.parse(localStorage.getItem(LS_KEYS.CONF) || '{}');
let carrinho = [];

// --- Utils ---
const $ = id=>document.getElementById(id);
const money = v=>Number(v||0).toFixed(2);

// --- Inicialização ---
function init(){
    if(conf.nome) $('nome-loja')?.value = conf.nome;
    $('endereco')?.value = conf.endereco || '';
    $('telefone')?.value = conf.telefone || '';
    if(conf.logo) showLogo(conf.logo);
    renderEstoque(); renderProdutosLista(); renderCarrinho(); renderVendas(); updateTotals();
}

// --- Produtos ---
function addProduto(nome, preco, qtd, sku){
    if(!nome || preco<=0){alert('Nome e preço obrigatórios'); return;}
    const id = Date.now();
    produtos.push({id,nome,preco,qtd,sku});
    localStorage.setItem(LS_KEYS.PROD,JSON.stringify(produtos));
    renderEstoque(); renderProdutosLista();
}

function renderEstoque(){
    const tbody = $('tabela-estoque')?.querySelector('tbody'); if(!tbody) return;
    tbody.innerHTML='';
    produtos.forEach(p=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.nome}<div class="muted small">${p.sku||''}</div></td>
        <td>${money(p.preco)}</td><td>${p.qtd}</td>
        <td class="right"><div class="actions">
            <button onclick='editProd(${p.id})'>Editar</button>
            <button onclick='delProd(${p.id})'>Apagar</button>
        </div></td>`;
        tbody.appendChild(tr);
    });
}

window.delProd = id=>{
    if(!confirm('Apagar produto?')) return;
    produtos = produtos.filter(p=>p.id!==id);
    localStorage.setItem(LS_KEYS.PROD,JSON.stringify(produtos));
    renderEstoque(); renderProdutosLista();
}
window.editProd = id=>{
    const p = produtos.find(x=>x.id===id); if(!p) return;
    const nome = prompt('Nome:',p.nome); if(!nome) return;
    const preco = parseFloat(prompt('Preço:',p.preco)||p.preco);
    const qtd = parseInt(prompt('Quantidade:',p.qtd)||p.qtd);
    p.nome=nome; p.preco=preco; p.qtd=qtd;
    localStorage.setItem(LS_KEYS.PROD,JSON.stringify(produtos));
    renderEstoque(); renderProdutosLista();
}

// --- Lista de produtos para venda ---
function renderProdutosLista(filter=''){
    const tbody = $('tabela-produtos')?.querySelector('tbody'); if(!tbody) return;
    const q = filter.trim().toLowerCase();
    tbody.innerHTML='';
    produtos.filter(p=>p.nome.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q)).forEach(p=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.nome}</td>
        <td>${money(p.preco)}</td>
        <td>${p.qtd}</td>
        <td class="right">
            <input type="number" min="1" max="${p.qtd}" value="1" style="width:60px;" id="qt-${p.id}">
            <input type="number" min="0" value="${p.preco}" style="width:80px;" id="price-${p.id}">
            <button onclick='addToCart(${p.id})'>+</button>
        </td>`;
        tbody.appendChild(tr);
    });
}

// --- Carrinho ---
window.addToCart = id=>{
    const p = produtos.find(x=>x.id===id); if(!p) return;
    const qtd = parseInt($(`qt-${id}`).value || 1);
    let preco = parseFloat($(`price-${id}`).value || p.preco);
    if(qtd>p.qtd){alert('Sem stock suficiente'); return;}
    const item = carrinho.find(c=>c.id===id);
    if(item){ item.qtd+=qtd; item.preco=preco; } 
    else{ carrinho.push({id:p.id,nome:p.nome,preco,qtd}); }
    renderCarrinho(); updateTotals();
}

function renderCarrinho(){
    const tbody = $('tabela-carrinho')?.querySelector('tbody'); if(!tbody) return;
    tbody.innerHTML='';
    carrinho.forEach(item=>{
        const tr = document.createElement('tr');
        const subtotal = item.qtd*item.preco;
        tr.innerHTML = `<td>${item.nome}</td>
        <td>${money(item.preco)}</td>
        <td><input type="number" min="1" value="${item.qtd}" onchange="changeQty(${item.id},this.value)"></td>
        <td>${money(subtotal)}</td>
        <td class="right"><button onclick="removeCart(${item.id})">Remover</button></td>`;
        tbody.appendChild(tr);
    });
}

window.changeQty = (id,val)=>{
    const item = carrinho.find(c=>c.id===id); if(!item) return;
    const p = produtos.find(x=>x.id===id);
    const qtd = parseInt(val||1);
    if(qtd>p.qtd){alert('Quantidade maior que stock'); renderCarrinho(); return;}
    item.qtd = qtd; renderCarrinho(); updateTotals();
}

window.removeCart = id=>{
    carrinho = carrinho.filter(c=>c.id!==id); renderCarrinho(); updateTotals();
              }
function updateTotals(){
    const subtotal = carrinho.reduce((s,i)=>s+i.qtd*i.preco,0);
    const taxaPerc = parseFloat($('taxa')?.value || 0);
    const taxa = subtotal * (taxaPerc/100);
    const total = subtotal + taxa;
    if($('subtotal')) $('subtotal').innerText = money(subtotal);
    if($('valor-taxa')) $('valor-taxa').innerText = money(taxa);
    if($('total')) $('total').innerText = money(total);
}

// --- Modal Resumo / Fatura ---
function openResumoCompra(){
    const modal = $('modal');
    const content = modal.querySelector('.content');
    modal.style.display='flex';
    let html = `<h3>Resumo da Compra</h3><table style="width:100%;border-collapse:collapse;"><thead>
<tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead><tbody>`;
    carrinho.forEach(item=>{
        html+=`<tr><td>${item.nome}</td><td>${item.qtd}</td><td>${money(item.preco)}</td><td>${money(item.qtd*item.preco)}</td></tr>`;
    });
    const subtotal = carrinho.reduce((s,i)=>s+i.qtd*i.preco,0);
    const taxaPerc = parseFloat($('taxa')?.value || 0);
    const taxa = subtotal * (taxaPerc/100);
    const total = subtotal + taxa;
    html+=`</tbody></table><div>Subtotal: ${money(subtotal)}</div><div>Taxa: ${money(taxa)}</div><div>Total: ${money(total)}</div>
<button onclick='confirmarCompra()'>Confirmar Compra</button> <button onclick='closeModal()'>Cancelar</button>`;
    content.innerHTML = html;
}

function closeModal(){
    $('modal').style.display='none';
}

function confirmarCompra(){
    const data = new Date().toISOString();
    const venda = {id:Date.now(),data,items:[...carrinho],subtotal:carrinho.reduce((s,i)=>s+i.qtd*i.preco,0)};
    vendas.push(venda);
    localStorage.setItem(LS_KEYS.VEND,JSON.stringify(vendas));
    carrinho = [];
    renderCarrinho(); updateTotals();
    closeModal();
    alert('Compra confirmada!');
    renderVendas();
}

function renderVendas(){
    const tbody = $('tabela-vendas')?.querySelector('tbody'); if(!tbody) return;
    tbody.innerHTML='';
    vendas.slice().reverse().forEach(v=>{
        const tr = document.createElement('tr');
        tr.innerHTML=`<td>${v.id}</td><td>${new Date(v.data).toLocaleString()}</td><td>${money(v.items.reduce((s,i)=>s+i.qtd*i.preco,0))}</td><td><button onclick='viewVenda(${v.id})'>Ver</button></td>`;
        tbody.appendChild(tr);
    });
}

function viewVenda(id){
    const v = vendas.find(x=>x.id===id); if(!v) return;
    carrinho = [...v.items];
    openResumoCompra();
}

// --- Configurações / Logo ---
$('logoBox')?.addEventListener('click',()=>$('logoInput')?.click());
$('logoInput')?.addEventListener('change',e=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload=ev=>{conf.logo=ev.target.result; localStorage.setItem(LS_KEYS.CONF,JSON.stringify(conf)); showLogo(conf.logo)};
    reader.readAsDataURL(file);
});
function showLogo(src){ $('logoPreview').src=src; $('logoPreview').style.display='block'; }

$('btn-save-settings')?.addEventListener('click',()=>{
    conf.nome=$('nome-loja')?.value; conf.endereco=$('endereco')?.value; conf.telefone=$('telefone')?.value;
    localStorage.setItem(LS_KEYS.CONF,JSON.stringify(conf));
    alert('Configurações salvas!');
});

// --- Inicializa ---
init();

// --- Pesquisa Produtos ---
$('search')?.addEventListener('input',e=>renderProdutosLista(e.target.value));
