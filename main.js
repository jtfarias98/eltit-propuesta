/* Supermercados Eltit — interacciones (sin librerías) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = window.PRODUCTS || {};
  const clp = n => '$' + n.toLocaleString('es-CL');
  const FREE = 40000, SHIP = 3990;

  /* ---------- MODO DEMO ----------
     true  = versión de prueba: solo funcionan Categorías, el carro (Agregar, + y −) y las flechas de las vitrinas.
     false = versión final: buscador, links, pago y todo lo demás conectados a la tienda. */
  const DEMO = true;

  const ALLOWED = '#catBtn, #cartBtn, [data-close], #veil, .add__btn, .step button, .shelf__nav';
  const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [tabindex]';
  if (DEMO) {
    ['click', 'mousedown', 'keydown', 'submit'].forEach(t => addEventListener(t, e => {
      if (t === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest && e.target.closest(INTERACTIVE);
      if (t === 'submit') { e.preventDefault(); return; }
      if (!el || el.closest(ALLOWED)) return;
      if (el.matches('input')) return; // se puede escribir en el buscador, pero no busca
      e.preventDefault(); e.stopImmediatePropagation();
    }, true));
  }

  /* ---------- Header con sombra al bajar ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Categorías (círculos y panel) ---------- */
  const CATS = [
    ['Frutas y verduras', 'frutilla'], ['Carnicería', 'asado-tira-1kg-aprox'], ['Lácteos y huevos', 'leche-entera-20-proteina-surlat-1lt'],
    ['Panadería', 'pan-molde-integral-extra-grande-ideal-770gr'], ['Pastelería Eltit', 'kuchen-de-frambuesa-eltit'], ['Despensa', 'cafe-jacob-kronung-200gr'],
    ['Bebidas y licores', 'bebida-zero-coca-cola-1-5lt'], ['Snacks y galletas', 'papas-artesanas-sal-de-mar-lays-150gr'], ['Aseo y limpieza', 'cloro-flores-de-lavanda-clorox-950ml'],
    ['Leña y carbón', 'saco-de-carbon-premium-super-carbon-2-5kg']
  ];
  const MORE = ['Congelados y helados', 'Cuidado personal', 'Niños y mundo bebé', 'Mascotas', 'Bazar y librería', 'Decohogar'];
  $('#catsRow').innerHTML = CATS.map(([n, img]) =>
    `<a href="#" class="cat-circle"><span class="cat-circle__img"><img src="img/p/${img}.webp" alt="" loading="lazy" width="400" height="400"></span>${n}</a>`).join('');
  $('#catList').innerHTML = CATS.map(([n, img]) =>
    `<li><a href="#"><img src="img/p/${img}.webp" alt="" loading="lazy">${n}<svg><use href="#i-chev"/></svg></a></li>`).join('') +
    MORE.map(n => `<li><a href="#"><span class="cat-list__ph">${n[0]}</span>${n}<svg><use href="#i-chev"/></svg></a></li>`).join('');

  /* ---------- Vitrinas de productos ---------- */
  const byId = {};
  Object.values(P).flat().forEach(p => (byId[p.id] = p));
  const card = p => {
    const badge = / Eltit$/.test(p.n) ?'<span class="badge badge--eltit">Hecho en Eltit</span>'
      : /Pucón/.test(p.b) ? '<span class="badge badge--local">Producto local</span>' : '';
    return `<article class="card">
      <div class="card__img">${badge}<img src="img/p/${p.id}.webp" alt="${p.n}" loading="lazy" width="400" height="400"></div>
      <p class="card__brand">${p.b || '&nbsp;'}</p>
      <h3 class="card__name">${p.n}</h3>
      <p class="card__price">${clp(p.p)}</p>
      <p class="card__unit">${p.u ? p.u.replace(' x ', ' x ') : '&nbsp;'}</p>
      <div class="add" data-id="${p.id}">
        <button class="add__btn" type="button" aria-label="Agregar ${p.n} al carro"><svg><use href="#i-plus"/></svg>Agregar</button>
        <div class="step"><button type="button" data-d="-1" aria-label="Quitar uno"><svg><use href="#i-minus"/></svg></button><b>1</b><button type="button" data-d="1" aria-label="Agregar uno"><svg><use href="#i-plus"/></svg></button></div>
      </div>
    </article>`;
  };
  $$('.shelf').forEach(sec => {
    const track = $('.shelf__track', sec), list = P[sec.dataset.cat] || [];
    track.innerHTML = list.map(card).join('');
    const bodyEl = $('.shelf__body', sec);
    bodyEl.insertAdjacentHTML('beforeend',
      '<button class="shelf__nav shelf__nav--prev" type="button" aria-label="Ver anteriores"><svg><use href="#i-chev"/></svg></button>' +
      '<button class="shelf__nav shelf__nav--next" type="button" aria-label="Ver más"><svg><use href="#i-chev"/></svg></button>');
    const [prev, next] = $$('.shelf__nav', bodyEl);
    const upd = () => { prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8; };
    prev.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * .9 }));
    next.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * .9 }));
    track.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  });

  /* ---------- Carro ---------- */
  const cart = new Map();
  const toast = $('#toast'); let tt;
  const say = msg => { toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('is-on'), 1800); };
  const setQty = (id, q, from) => {
    const before = cart.get(id) || 0;
    q > 0 ? cart.set(id, q) : cart.delete(id);
    if (q > before && from !== 'cart') { say(`Agregaste ${byId[id].n}`); bump(); }
    render();
  };
  const bump = () => { const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); };
  const render = () => {
    let items = 0, sub = 0;
    cart.forEach((q, id) => { items += q; sub += q * byId[id].p; });
    $('#cartCount').textContent = items;
    $('#cartTotal').textContent = clp(sub);
    $('#cartSub').textContent = clp(sub);
    $('#cartItemsLbl').textContent = items ? `(${items} ${items === 1 ? 'producto' : 'productos'})` : '';
    $('#cartShip').textContent = sub >= FREE ? '¡Gratis!' : sub ? clp(SHIP) : 'desde ' + clp(SHIP);
    $('#shipMsg').textContent = sub >= FREE ? '¡Listo! Tu despacho es gratis' : `Te faltan ${clp(FREE - sub)} para despacho gratis`;
    $('#shipBar').style.width = Math.min(100, sub / FREE * 100) + '%';
    $('#cart').classList.toggle('is-empty', !items);
    $$('.add').forEach(a => {
      const q = cart.get(a.dataset.id) || 0;
      a.classList.toggle('has-qty', q > 0);
      $('b', a).textContent = q || 1;
    });
    const listEl = $('#cartList');
    const ids = [...cart.keys()];
    // reutiliza filas existentes para que la animación de entrada solo ocurra en las nuevas
    $$('.cart-item', listEl).forEach(r => { if (!cart.has(r.dataset.id)) r.remove(); });
    ids.forEach(id => {
      let row = $(`.cart-item[data-id="${id}"]`, listEl);
      if (!row) {
        const p = byId[id];
        listEl.insertAdjacentHTML('afterbegin', `<div class="cart-item" data-id="${id}">
          <img src="img/p/${id}.webp" alt="" width="64" height="64">
          <div><p class="cart-item__name">${p.n}</p><p class="cart-item__price"></p></div>
          <div class="step add" data-id="${id}" data-cart><button type="button" data-d="-1" aria-label="Quitar uno"><svg><use href="#i-minus"/></svg></button><b></b><button type="button" data-d="1" aria-label="Agregar uno"><svg><use href="#i-plus"/></svg></button></div>
        </div>`);
        row = $(`.cart-item[data-id="${id}"]`, listEl);
      }
      $('.cart-item__price', row).textContent = clp(byId[id].p * cart.get(id));
      $('b', row).textContent = cart.get(id);
    });
  };
  addEventListener('click', e => {
    const add = e.target.closest('.add__btn');
    if (add) { const id = add.closest('.add').dataset.id; setQty(id, (cart.get(id) || 0) + 1); return; }
    const st = e.target.closest('.step button');
    if (st) { const box = st.closest('[data-id]'); const id = box.dataset.id; setQty(id, (cart.get(id) || 0) + Number(st.dataset.d), box.hasAttribute('data-cart') ? 'cart' : ''); }
  });
  render();

  /* ---------- Paneles: categorías (izquierda) y carro (derecha) ---------- */
  const veil = $('#veil');
  const panels = { cats: $('#cats'), cart: $('#cart') };
  const triggers = { cats: $('#catBtn'), cart: $('#cartBtn') };
  let current = null;
  $$('#cats .cat-list li, #cats .drawer__foot').forEach((el, i) => { el.dataset.stagger = ''; el.style.setProperty('--i', i); });
  const open = name => {
    if (current === name) return close();
    if (current) { panels[current].classList.remove('is-open'); panels[current].setAttribute('aria-hidden', 'true'); triggers[current].setAttribute('aria-expanded', 'false'); }
    current = name;
    panels[name].classList.add('is-open'); panels[name].setAttribute('aria-hidden', 'false');
    triggers[name].setAttribute('aria-expanded', 'true');
    body.classList.add('panel-open', 'is-locked');
    setTimeout(() => $('.drawer__close', panels[name]).focus({ preventScroll: true }), 500);
  };
  const close = () => {
    if (!current) return;
    panels[current].classList.remove('is-open'); panels[current].setAttribute('aria-hidden', 'true');
    triggers[current].setAttribute('aria-expanded', 'false');
    body.classList.remove('panel-open', 'is-locked');
    triggers[current].focus({ preventScroll: true });
    current = null;
  };
  triggers.cats.addEventListener('click', () => open('cats'));
  triggers.cart.addEventListener('click', () => open('cart'));
  veil.addEventListener('click', close);
  $$('[data-close]').forEach(b => b.addEventListener('click', close));
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  /* ---------- Carrusel principal (avanza solo) ---------- */
  const slides = $$('#heroTrack .slide'), dots = $('#heroDots');
  dots.innerHTML = slides.map((_, i) => `<button type="button" role="tab" aria-label="Destacado ${i + 1}" aria-selected="${i === 0}"></button>`).join('');
  let idx = 0, timer;
  const go = i => {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, j) => s.classList.toggle('is-active', j === idx));
    $$('button', dots).forEach((d, j) => d.setAttribute('aria-selected', j === idx));
  };
  const play = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go(idx + 1), 6000); };
  $('.hero__arrow--next').addEventListener('click', () => { go(idx + 1); play(); });
  $('.hero__arrow--prev').addEventListener('click', () => { go(idx - 1); play(); });
  $$('button', dots).forEach((d, j) => d.addEventListener('click', () => { go(j); play(); }));
  const hero = $('.hero');
  hero.addEventListener('mouseenter', () => clearInterval(timer));
  hero.addEventListener('mouseleave', play);
  play();

  /* ---------- Aparición al hacer scroll ---------- */
  const rev = $$('.cats-row, .perks, .shelf, .duo, .strip, .story, .stores, .news');
  rev.forEach(el => el.classList.add('reveal'));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rev.forEach(el => io.observe(el));
  } else rev.forEach(el => el.classList.add('is-in'));
})();
