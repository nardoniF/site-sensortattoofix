(function () {
  'use strict';

  const PRODUCTS = [
    {
      id: 'p1',
      name: 'Carcaça canivete Ford 3 botões',
      category: 'Carcaças',
      brand: 'Ford',
      price: 89.9,
      stock: 142,
      sku: 'AKS-FORD-3B',
      image: 'assets/p1.svg',
      blurb: 'Cabeça flip com slot para circuito 433/315 MHz. Ideal para chaveiro e reposição rápida.',
      specs: [
        ['Material', 'ABS + metal'],
        ['Botões', '3 (porta · trava · porta-malas)'],
        ['Compatibilidade', 'Focus / Ranger (adaptação)'],
        ['Inclui lâmina', 'Não']
      ]
    },
    {
      id: 'p2',
      name: 'Carcaça Fiat PX52 2 botões azul',
      category: 'Carcaças',
      brand: 'Fiat',
      price: 64.5,
      stock: 88,
      sku: 'AKS-FIAT-PX52',
      image: 'assets/p2.svg',
      blurb: 'Cabeça removível azul para linha Palio/Siena. Acabamento fosco, encaixe preciso.',
      specs: [
        ['Cor', 'Azul'],
        ['Botões', '2'],
        ['Modelo', 'PX52'],
        ['Uso', 'Reposição de carcaça']
      ]
    },
    {
      id: 'p3',
      name: 'Chave inteligente Honda 4 botões',
      category: 'Smart key',
      brand: 'Honda',
      price: 189.0,
      stock: 36,
      sku: 'AKS-HONDA-4B',
      image: 'assets/p3.svg',
      blurb: 'Case smart key com logo e botão de pânico. Para adaptação e programação profissional.',
      specs: [
        ['Tipo', 'Smart / proximity'],
        ['Botões', '4'],
        ['Logo', 'Honda'],
        ['Emergência', 'Lâmina interna']
      ]
    },
    {
      id: 'p4',
      name: 'Capa silicone Toyota / Lexus',
      category: 'Capas',
      brand: 'Toyota',
      price: 29.9,
      stock: 210,
      sku: 'AKS-SIL-TY',
      image: 'assets/p4.svg',
      blurb: 'Proteção flexível contra impactos e sujeira. Textura antiderrapante, fácil de limpar.',
      specs: [
        ['Material', 'Silicone'],
        ['Toque', 'Soft-touch'],
        ['Cores', 'Preto / vermelho / azul'],
        ['Acesso', 'Botões e lâmina livres']
      ]
    },
    {
      id: 'p5',
      name: 'Lâmina Y-14 Renault / Peugeot',
      category: 'Lâminas',
      brand: 'Renault',
      price: 18.5,
      stock: 320,
      sku: 'AKS-Y14',
      image: 'assets/p5.svg',
      blurb: 'Lâmina de reposição NE73/NE72. Corte em máquina e encaixe em carcaças compatíveis.',
      specs: [
        ['Código', 'Y-14'],
        ['Perfis', 'NE72 / NE73'],
        ['Acabamento', 'Níquel'],
        ['Unidade', 'Peça']
      ]
    },
    {
      id: 'p6',
      name: 'Borracha botões Hyundai 3 botões',
      category: 'Borrachas',
      brand: 'Hyundai',
      price: 22.0,
      stock: 175,
      sku: 'AKS-HY-PAD',
      image: 'assets/p6.svg',
      blurb: 'Pad de borracha para telecomando. Restaura o toque sem trocar a carcaça inteira.',
      specs: [
        ['Botões', '3'],
        ['Linha', 'Hyundai / Kia'],
        ['Material', 'Borracha técnica'],
        ['Instalação', 'Encaixe']
      ]
    },
    {
      id: 'p7',
      name: 'Chip transponder ID46 / ID48',
      category: 'Chips',
      brand: 'Universal',
      price: 45.0,
      stock: 96,
      sku: 'AKS-CHIP-46',
      image: 'assets/p7.svg',
      blurb: 'Chip para clonagem e programação em bancada. Embalagem unitária identificada.',
      specs: [
        ['Família', 'ID46 / ID48'],
        ['Formato', 'Glass / carbon'],
        ['Uso', 'Programação'],
        ['Lote', 'Rastreável']
      ]
    },
    {
      id: 'p8',
      name: 'Carcaça alarme Positron 4 botões',
      category: 'Controles',
      brand: 'Positron',
      price: 54.9,
      stock: 67,
      sku: 'AKS-PXN52',
      image: 'assets/p8.svg',
      blurb: 'Shell PXN52 para controle de alarme. Visual limpo, botões bem definidos.',
      specs: [
        ['Linha', 'Brasil Positron'],
        ['Botões', '4'],
        ['Modelo', 'PXN52'],
        ['Circuito', 'Não incluso']
      ]
    },
    {
      id: 'p9',
      name: 'Tag RFID 125 kHz regravável',
      category: 'Acessórios',
      brand: 'Universal',
      price: 12.9,
      stock: 480,
      sku: 'AKS-RFID-125',
      image: 'assets/p9.svg',
      blurb: 'Tag EM4305 para cópia e controle de acesso. Formato chaveiro, leitura estável.',
      specs: [
        ['Frequência', '125 kHz'],
        ['Chip', 'EM4305'],
        ['Formato', 'Keyfob'],
        ['Gravação', 'Regravável']
      ]
    },
    {
      id: 'p10',
      name: 'Carcaça canivete Jeep 4 botões',
      category: 'Carcaças',
      brand: 'Jeep',
      price: 99.0,
      stock: 41,
      sku: 'AKS-JEEP-4B',
      image: 'assets/p10.svg',
      blurb: 'Canivete com logo e quatro funções. Acabamento premium para linha Jeep.',
      specs: [
        ['Botões', '4'],
        ['Logo', 'Jeep'],
        ['Tipo', 'Flip key'],
        ['Cor', 'Preto']
      ]
    }
  ];

  const CART = [
    { id: 'p1', qty: 2 },
    { id: 'p5', qty: 5 },
    { id: 'p4', qty: 1 }
  ];

  function money(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function byId(id) {
    return PRODUCTS.find((p) => p.id === id);
  }

  function assetPath(path) {
    const inAdmin = /\/admin\/?$|\/admin\//.test(location.pathname);
    if (!inAdmin) return path;
    if (path.startsWith('../')) return path;
    if (path.startsWith('assets/')) return '../' + path;
    return path;
  }

  function toast(msg) {
    let el = document.getElementById('aks-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'aks-toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg || 'POC — demonstração visual';
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  function bindPocActions(root) {
    (root || document).querySelectorAll('[data-poc]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        toast(el.getAttribute('data-poc') || 'POC — demonstração visual');
      });
    });
  }

  function initNav() {
    const btn = document.getElementById('menu-btn');
    const nav = document.getElementById('nav');
    if (btn && nav) {
      btn.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    document.querySelectorAll('.lang-switch button').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.lang-switch button').forEach((x) => x.classList.remove('is-on'));
        b.classList.add('is-on');
        toast(b.dataset.lang === 'usa' ? 'Vista USA — seletor visual (sem i18n)' : 'Vista BR — mercado Brasil');
      });
    });
  }

  function productCard(p) {
    return `
      <article class="product-card">
        <a class="product-media" href="produto.html?id=${p.id}" aria-label="${p.name}">
          <img src="${assetPath(p.image)}" alt="">
        </a>
        <div class="product-body">
          <div class="tag">${p.category} · ${p.brand}</div>
          <h3><a href="produto.html?id=${p.id}">${p.name}</a></h3>
          <div class="price">${money(p.price)} <small>mock</small></div>
          <div class="product-actions">
            <a class="btn btn-outline btn-sm" href="produto.html?id=${p.id}">Ver</a>
            <button class="btn btn-primary btn-sm" type="button" data-poc="POC — item adicionado (mock)">Comprar</button>
          </div>
        </div>
      </article>`;
  }

  function renderProductGrid(selector, list) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = (list || PRODUCTS).map(productCard).join('');
    bindPocActions(el);
  }

  function renderProductDetail() {
    const mount = document.getElementById('product-detail');
    if (!mount) return;
    const id = new URLSearchParams(location.search).get('id') || 'p1';
    const p = byId(id) || PRODUCTS[0];
    mount.innerHTML = `
      <div class="detail-media">
        <img src="${assetPath(p.image)}" alt="${p.name}">
      </div>
      <div class="detail-copy">
        <p class="eyebrow">${p.category} · SKU ${p.sku}</p>
        <h1>${p.name}</h1>
        <div class="price">${money(p.price)} <small>preço ilustrativo</small></div>
        <div class="meta-row">
          <span class="pill">${p.brand}</span>
          <span class="pill">Estoque mock: ${p.stock}</span>
          <span class="pill">Entrega sob consulta</span>
        </div>
        <p>${p.blurb}</p>
        <ul class="spec-list">
          ${p.specs.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('')}
        </ul>
        <div class="hero-actions">
          <button class="btn btn-primary" type="button" data-poc="POC — adicionar ao carrinho">Adicionar ao carrinho</button>
          <a class="btn btn-outline" href="carrinho.html">Ver carrinho</a>
        </div>
      </div>`;
    bindPocActions(mount);
  }

  function renderCart() {
    const list = document.getElementById('cart-lines');
    const summary = document.getElementById('cart-summary');
    if (!list || !summary) return;
    let sub = 0;
    list.innerHTML = CART.map((row) => {
      const p = byId(row.id);
      const total = p.price * row.qty;
      sub += total;
      return `
        <div class="line-item">
          <div class="line-thumb"><img src="${assetPath(p.image)}" alt=""></div>
          <div>
            <strong>${p.name}</strong>
            <div style="color:var(--steel);font-size:.85rem">Qtd ${row.qty} · ${money(p.price)}</div>
          </div>
          <div class="price">${money(total)}</div>
        </div>`;
    }).join('');
    const frete = 24.9;
    summary.innerHTML = `
      <div class="summary-row"><span>Subtotal</span><span>${money(sub)}</span></div>
      <div class="summary-row"><span>Frete (ilustrativo)</span><span>${money(frete)}</span></div>
      <div class="summary-row total"><span>Total mock</span><span>${money(sub + frete)}</span></div>
      <a class="btn btn-primary btn-block" style="margin-top:1rem" href="checkout.html">Ir ao checkout</a>
      <button class="btn btn-outline btn-block" style="margin-top:.5rem" type="button" data-poc="POC — cupom visual">Aplicar cupom</button>`;
    bindPocActions(summary);
  }

  function initCheckout() {
    const root = document.getElementById('checkout-root');
    if (!root) return;
    const steps = [...root.querySelectorAll('.step')];
    const panels = [...root.querySelectorAll('.step-panel')];
    let current = 0;

    function show(i) {
      current = Math.max(0, Math.min(panels.length - 1, i));
      panels.forEach((p, idx) => { p.hidden = idx !== current; });
      steps.forEach((s, idx) => {
        s.classList.toggle('is-active', idx === current);
        s.classList.toggle('is-done', idx < current);
      });
    }

    root.querySelectorAll('[data-step-next]').forEach((btn) => {
      btn.addEventListener('click', () => show(current + 1));
    });
    root.querySelectorAll('[data-step-prev]').forEach((btn) => {
      btn.addEventListener('click', () => show(current - 1));
    });
    root.querySelectorAll('.option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const group = opt.parentElement;
        group.querySelectorAll('.option').forEach((o) => o.classList.remove('is-on'));
        opt.classList.add('is-on');
      });
    });
    show(0);
    bindPocActions(root);
  }

  function initAdmin() {
    const nav = document.getElementById('admin-nav');
    if (!nav) return;
    const buttons = [...nav.querySelectorAll('button[data-admin]')];
    const sections = [...document.querySelectorAll('.admin-section')];
    function open(id) {
      buttons.forEach((b) => b.classList.toggle('is-on', b.dataset.admin === id));
      sections.forEach((s) => { s.hidden = s.id !== 'admin-' + id; });
      if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    }
    buttons.forEach((b) => b.addEventListener('click', () => open(b.dataset.admin)));
    const hash = (location.hash || '#produtos').replace('#', '');
    open(buttons.some((b) => b.dataset.admin === hash) ? hash : 'produtos');

    const prodBody = document.querySelector('#admin-produtos tbody');
    if (prodBody) {
      prodBody.innerHTML = PRODUCTS.map((p) => `
        <tr>
          <td>${p.sku}</td>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td>${money(p.price)}</td>
          <td>${p.stock}</td>
          <td><span class="status status-ok">Ativo</span></td>
          <td><button class="btn btn-sm btn-ghost" type="button" data-poc="POC — editar produto">Editar</button></td>
        </tr>`).join('');
    }
    bindPocActions(document.getElementById('admin-main'));
  }

  function initFilters() {
    const bar = document.getElementById('loja-filters');
    if (!bar) return;
    const cats = ['Todas', ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];
    bar.innerHTML = cats.map((c, i) =>
      `<button type="button" class="filter${i === 0 ? ' is-on' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter');
      if (!btn) return;
      bar.querySelectorAll('.filter').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      const cat = btn.dataset.cat;
      const list = cat === 'Todas' ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);
      renderProductGrid('#loja-grid', list);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    bindPocActions(document);
    initFilters();
    if (document.getElementById('home-grid')) renderProductGrid('#home-grid', PRODUCTS.slice(0, 8));
    if (document.getElementById('loja-grid')) renderProductGrid('#loja-grid', PRODUCTS);
    renderProductDetail();
    renderCart();
    initCheckout();
    initAdmin();
  });

  window.AKS = { PRODUCTS, money, toast };
})();
