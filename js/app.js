/* ==========================================================================
   Rizos Ondea — Lógica del sitio
   Comunidad (guías paso a paso con fotos y videos), test capilar, blog y —
   en segundo plano — la tienda de kits: catálogo, carrito y checkout.
   ========================================================================== */

(function () {
  "use strict";

  var CART_KEY = "ondea_cart";

  /* ---------- Sprite de iconos SVG (estilo de línea, color heredado) ---------- */

  function sym(id, inner, filled) {
    return '<symbol id="i-' + id + '" viewBox="0 0 24 24"><g fill="' + (filled ? "currentColor" : "none") +
      '" stroke="' + (filled ? "none" : "currentColor") +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + "</g></symbol>";
  }

  var ICONS_SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
    sym("truck", '<rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>') +
    sym("pin", '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>') +
    sym("chat", '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>') +
    sym("lock", '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>') +
    sym("cart", '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>') +
    sym("leaf", '<path d="M20 4c-8 0-14 4-15 12 0 0 0 4 4 4 8 0 11-8 11-16z"/><path d="M5 20c3-6 7-10 12-13"/>') +
    sym("heart", '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>') +
    sym("flag", '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>') +
    sym("flask", '<path d="M10 2v6L4.5 18a2.7 2.7 0 0 0 2.4 4h10.2a2.7 2.7 0 0 0 2.4-4L14 8V2"/><line x1="8" y1="2" x2="16" y2="2"/><line x1="7" y1="15" x2="17" y2="15"/>') +
    sym("droplet", '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>') +
    sym("wave", '<path d="M1 9c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M1 16c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>') +
    sym("bottle", '<rect x="7" y="8" width="10" height="14" rx="2"/><path d="M9 8V5h6v3"/><path d="M12 5V2"/><path d="M12 2h4"/>') +
    sym("bow", '<path d="M11 12L4.8 8.6A1.6 1.6 0 0 0 2.4 10v4a1.6 1.6 0 0 0 2.4 1.4z"/><path d="M13 12l6.2-3.4A1.6 1.6 0 0 1 21.6 10v4a1.6 1.6 0 0 1-2.4 1.4z"/><rect x="10.5" y="10" width="3" height="4" rx="1"/>') +
    sym("gift", '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>') +
    sym("mail", '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22 6 12 13 2 6"/>') +
    sym("clock", '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>') +
    sym("bank", '<path d="M3 21h18"/><path d="M3 10h18"/><path d="M12 3l9 7H3z"/><path d="M5 10v11"/><path d="M9.5 10v11"/><path d="M14.5 10v11"/><path d="M19 10v11"/>') +
    sym("cash", '<rect x="1" y="6" width="22" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 12h.01"/><path d="M19 12h.01"/>') +
    sym("phone", '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>') +
    sym("check", '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>') +
    sym("ig", '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>') +
    sym("search", '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/>') +
    sym("star", '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', true) +
    sym("sparkle", '<path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>', true) +
    sym("book", '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/><path d="M4 17.5h16"/><line x1="8" y1="7" x2="16" y2="7"/>') +
    sym("play", '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>') +
    sym("users", '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16.5 3.13a4 4 0 0 1 0 7.75"/>') +
    sym("camera", '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>') +
    "</svg>";

  if (document.body) {
    document.body.insertAdjacentHTML("afterbegin", ICONS_SPRITE);
  }

  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  /* ---------- Utilidades ---------- */

  function fmtCOP(n) {
    return "$" + Math.round(n).toLocaleString("es-CO");
  }

  function stars(rating) {
    var full = Math.round(rating);
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  }

  function getProduct(id) {
    return ONDEA_PRODUCTS.find(function (p) { return p.id === id; });
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function urlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /* ---------- Arte SVG de productos (paleta del logo) ---------- */

  var C = { pink: "#F29DB0", pinkSoft: "#FBD9E3", brown: "#552E1F", deep: "#46251A", cream: "#FFF8F3" };

  function svgWrap(inner) {
    return '<svg viewBox="0 0 200 240" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + inner + "</svg>";
  }

  function label(x, y, w, h, bg, fg) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + bg + '"/>' +
      '<path d="M' + (x + 8) + " " + (y + h / 2) + " q " + (w / 4 - 4) + " -14 " + (w / 2 - 8) + " 0 t " + (w / 2 - 8) + ' 0" fill="none" stroke="' + fg + '" stroke-width="3" stroke-linecap="round"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h - 10) + '" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="14" fill="' + fg + '">Ondea</text>';
  }

  var sparkle = '<path d="M164 40 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="' + C.pink + '"/>';

  var ART = {
    pump: svgWrap(
      '<rect x="52" y="44" width="34" height="10" rx="5" fill="' + C.brown + '"/>' +
      '<rect x="82" y="34" width="36" height="22" rx="7" fill="' + C.brown + '"/>' +
      '<rect x="90" y="56" width="20" height="26" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="60" y="80" width="80" height="146" rx="18" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      label(72, 122, 56, 66, C.pink, C.deep) + sparkle
    ),
    tube: svgWrap(
      '<rect x="72" y="200" width="56" height="20" rx="7" fill="' + C.brown + '"/>' +
      '<path d="M64 58 h72 l-6 142 h-60 z" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="62" y="50" width="76" height="12" rx="4" fill="' + C.brown + '"/>' +
      label(78, 110, 48, 60, C.cream, C.brown) + sparkle
    ),
    jarGel: svgWrap(
      '<rect x="46" y="84" width="108" height="30" rx="10" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="52" y="112" width="96" height="108" rx="18" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      label(66, 138, 68, 56, C.pinkSoft, C.deep) + sparkle
    ),
    jar: svgWrap(
      '<rect x="46" y="84" width="108" height="30" rx="10" fill="' + C.brown + '"/>' +
      '<rect x="52" y="112" width="96" height="108" rx="18" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      label(66, 138, 68, 56, C.cream, C.brown) + sparkle
    ),
    dropper: svgWrap(
      '<circle cx="100" cy="66" r="17" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="88" y="82" width="24" height="22" fill="' + C.brown + '"/>' +
      '<rect x="68" y="104" width="64" height="112" rx="16" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<line x1="100" y1="104" x2="100" y2="150" stroke="' + C.pinkSoft + '" stroke-width="6" stroke-linecap="round"/>' +
      label(76, 152, 48, 52, C.pink, C.deep) + sparkle
    ),
    spray: svgWrap(
      '<path d="M76 36 h30 v18 h-30 z" fill="' + C.brown + '"/>' +
      '<rect x="58" y="40" width="22" height="10" rx="5" fill="' + C.brown + '"/>' +
      '<rect x="82" y="54" width="18" height="24" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="62" y="78" width="76" height="142" rx="16" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      label(74, 118, 52, 62, C.pink, C.deep) + sparkle
    ),
    foam: svgWrap(
      '<path d="M66 84 a34 30 0 0 1 68 0 z" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="66" y="84" width="68" height="136" rx="14" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      label(76, 120, 48, 58, C.pinkSoft, C.deep) + sparkle
    ),
    kit: svgWrap(
      '<rect x="24" y="96" width="52" height="122" rx="12" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="36" y="74" width="28" height="22" rx="6" fill="' + C.brown + '"/>' +
      '<rect x="84" y="66" width="52" height="152" rx="12" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="96" y="46" width="28" height="20" rx="6" fill="' + C.brown + '"/>' +
      '<rect x="144" y="120" width="44" height="98" rx="12" fill="' + C.pinkSoft + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="152" y="102" width="28" height="18" rx="6" fill="' + C.brown + '"/>' +
      '<text x="110" y="150" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="15" fill="' + C.deep + '">Ondea</text>' + sparkle
    ),
    kitSmall: svgWrap(
      '<rect x="34" y="104" width="50" height="112" rx="12" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="46" y="84" width="26" height="20" rx="6" fill="' + C.brown + '"/>' +
      '<rect x="92" y="88" width="50" height="128" rx="12" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<rect x="104" y="68" width="26" height="20" rx="6" fill="' + C.brown + '"/>' +
      '<circle cx="162" cy="180" r="26" fill="' + C.pinkSoft + '" stroke="' + C.brown + '" stroke-width="4"/>' + sparkle
    ),
    bonnet: svgWrap(
      '<circle cx="100" cy="118" r="62" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<path d="M44 148 q56 30 112 0 l-6 22 q-50 24 -100 0 z" fill="' + C.brown + '"/>' +
      '<path d="M70 100 q14 -18 28 0 t 28 0" fill="none" stroke="' + C.deep + '" stroke-width="4" stroke-linecap="round"/>' +
      '<text x="100" y="140" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="15" fill="' + C.deep + '">Ondea</text>' + sparkle
    ),
    towel: svgWrap(
      '<rect x="42" y="84" width="116" height="126" rx="16" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<line x1="42" y1="120" x2="158" y2="120" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<line x1="60" y1="150" x2="140" y2="150" stroke="' + C.deep + '" stroke-width="4" stroke-linecap="round" opacity="0.4"/>' +
      '<line x1="60" y1="172" x2="140" y2="172" stroke="' + C.deep + '" stroke-width="4" stroke-linecap="round" opacity="0.4"/>' +
      '<circle cx="100" cy="102" r="8" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="3"/>' + sparkle
    ),
    diffuser: svgWrap(
      '<path d="M46 118 a54 46 0 0 0 108 0 z" fill="' + C.pink + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<ellipse cx="100" cy="118" rx="54" ry="14" fill="' + C.pinkSoft + '" stroke="' + C.brown + '" stroke-width="4"/>' +
      '<line x1="74" y1="112" x2="74" y2="96" stroke="' + C.brown + '" stroke-width="6" stroke-linecap="round"/>' +
      '<line x1="100" y1="110" x2="100" y2="92" stroke="' + C.brown + '" stroke-width="6" stroke-linecap="round"/>' +
      '<line x1="126" y1="112" x2="126" y2="96" stroke="' + C.brown + '" stroke-width="6" stroke-linecap="round"/>' +
      '<rect x="86" y="162" width="28" height="56" rx="12" fill="' + C.cream + '" stroke="' + C.brown + '" stroke-width="4"/>' + sparkle
    ),
  };

  function artFor(p) { return ART[p.art] || ART.pump; }

  function hasPhotos(p) { return !!(p.images && p.images.length); }

  /* Foto real si el producto la tiene; si no, la ilustración de siempre */
  function visualFor(p) {
    if (hasPhotos(p)) return '<img class="prod-photo" src="' + p.images[0] + '" alt="' + p.name + '" loading="lazy">';
    return artFor(p);
  }

  /* ---------- Carrito (localStorage) ---------- */

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function addToCart(id, qty) {
    qty = qty || 1;
    var cart = getCart();
    var item = cart.find(function (i) { return i.id === id; });
    if (item) { item.qty += qty; } else { cart.push({ id: id, qty: qty }); }
    saveCart(cart);
    var p = getProduct(id);
    toast("✓ " + (p ? p.name : "Producto") + " agregado al carrito");
  }

  function setQty(id, qty) {
    var cart = getCart();
    var item = cart.find(function (i) { return i.id === id; });
    if (!item) return;
    item.qty = Math.max(1, Math.min(99, qty));
    saveCart(cart);
  }

  function removeFromCart(id) {
    saveCart(getCart().filter(function (i) { return i.id !== id; }));
  }

  function cartCount() {
    return getCart().reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function cartSubtotal() {
    return getCart().reduce(function (s, i) {
      var p = getProduct(i.id);
      return p ? s + p.price * i.qty : s;
    }, 0);
  }

  function updateCartBadge() {
    var n = String(cartCount());
    qsa(".cart-count").forEach(function (el) {
      if (el.textContent !== n && el.textContent !== "") {
        el.classList.remove("bump");
        void el.offsetWidth; // reinicia la animación
        el.classList.add("bump");
      }
      el.textContent = n;
    });
  }

  /* ---------- Toast ---------- */

  var toastTimer = null;
  function toast(msg) {
    var el = qs(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  /* ---------- Tarjeta de producto ---------- */

  function productCard(p) {
    var badge = p.badge ? '<span class="prod-badge ' + (p.badgeClass || "") + '">' + p.badge + "</span>" : "";
    var before = p.oldPrice ? '<span class="before">' + fmtCOP(p.oldPrice) + "</span>" : "";
    return (
      '<article class="prod-card">' + badge +
      '<a class="prod-art' + (hasPhotos(p) ? " has-photo" : "") + '" href="producto.html?id=' + p.id + '" aria-label="Ver ' + p.name + '">' + visualFor(p) + "</a>" +
      '<div class="prod-body">' +
      '<span class="prod-cat">' + p.categoryLabel + " · " + p.size + "</span>" +
      '<h3 class="prod-name"><a href="producto.html?id=' + p.id + '">' + p.name + "</a></h3>" +
      '<span class="prod-rating">' + p.short + "</span>" +
      '<div class="prod-price"><span class="now">' + fmtCOP(p.price) + "</span>" + before + "</div>" +
      '<div class="prod-actions">' +
      '<button class="btn btn-brown btn-sm" data-add="' + p.id + '">Agregar ' + icon("cart") + "</button>" +
      '<a class="btn btn-outline btn-sm" href="producto.html?id=' + p.id + '">Ver</a>' +
      "</div></div></article>"
    );
  }

  function bindAddButtons(ctx) {
    qsa("[data-add]", ctx).forEach(function (btn) {
      btn.addEventListener("click", function () {
        addToCart(btn.getAttribute("data-add"), 1);
        // Confirmación visual sobre el propio botón
        var original = btn.innerHTML;
        btn.classList.add("added");
        btn.disabled = true;
        btn.innerHTML = "✓ En el carrito";
        setTimeout(function () {
          btn.classList.remove("added");
          btn.disabled = false;
          btn.innerHTML = original;
        }, 1300);
      });
    });
  }

  /* ---------- Página: Inicio ---------- */

  function initHome() {
    // Altura real de topbar+header → variable CSS, para que el hero llene la
    // pantalla exacta en Chrome y Safari (cada uno mide sus barras distinto)
    function setHeroOffset() {
      var topbar = qs(".topbar");
      var header = qs(".header");
      var offset = (topbar ? topbar.offsetHeight : 0) + (header ? header.offsetHeight : 0);
      document.documentElement.style.setProperty("--hero-offset", offset + "px");
    }
    setHeroOffset();
    window.addEventListener("resize", setHeroOffset);

    // Video del hero: algunos navegadores móviles no arrancan el autoplay solos
    var heroVid = qs(".hero-bg");
    if (heroVid) {
      var tryPlay = function () {
        var pr = heroVid.play();
        if (pr && pr.catch) pr.catch(function () {});
      };
      tryPlay();
      document.addEventListener("touchstart", tryPlay, { once: true });
    }

    // Últimas guías paso a paso de la comunidad
    var guiasHome = qs("#guias-home");
    if (guiasHome) {
      fetchGuias().then(function (guias) {
        var destacadas = guias.filter(function (g) { return g.destacada; });
        var lista = destacadas.concat(guias.filter(function (g) { return !g.destacada; })).slice(0, 3);
        guiasHome.innerHTML = lista.length ? lista.map(guiaCard).join("") : GUIAS_VACIO;
        var contador = qs("#guias-total");
        if (contador) {
          contador.setAttribute("data-count", String(guias.length));
          contador.removeAttribute("data-pending");
        }
        revealScan();
        initCounters();
      });
    }

    // La tienda vive al final del inicio, en tono discreto
    var grid = qs("#destacados-grid");
    if (grid) {
      var ids = ["kit-rizos-lavado-etniker", "kit-rizos-la-pocion", "kit-emergencia-reparacion-milagros"];
      grid.innerHTML = ids.map(function (id) { return productCard(getProduct(id)); }).join("");
      bindAddButtons(grid);
    }

    // Palabra rotativa del hero: rizos → ondas → crespos → afros
    var heroWord = qs("#hero-word");
    if (heroWord && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var words = ["rizos", "ondas", "crespos", "afros"];
      var wi = 0;
      setInterval(function () {
        wi = (wi + 1) % words.length;
        heroWord.classList.add("out");
        setTimeout(function () {
          heroWord.textContent = words[wi];
          heroWord.classList.remove("out");
        }, 280);
      }, 2800);
    }

    initNewsletter();
  }

  /* Club Ondea: el correo se guarda en el servidor y se ve en el panel */
  function initNewsletter() {
    var nlForm = qs("#newsletter-form");
    if (!nlForm) return;
    nlForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var campo = qs("#newsletter-email");
      var email = campo.value.trim();
      if (!email) return;
      var btn = nlForm.querySelector("button");
      if (btn) btn.disabled = true;
      fetch("/api/suscriptores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error("no");
          toast("✓ ¡Bienvenida al Club Ondea! Te escribimos con cada guía nueva.");
          nlForm.reset();
        })
        .catch(function () { toast("No pudimos registrar tu correo. Inténtalo de nuevo."); })
        .then(function () { if (btn) btn.disabled = false; });
    });
  }

  /* ==========================================================================
     Comunidad: guías paso a paso
     El contenido lo sube la dueña desde el panel (/admin.html → Guías) y el
     servidor lo entrega en /api/guias. Cada paso puede llevar foto o video.
     ========================================================================== */

  var CAT_LABEL = {
    rutina: "Rutina", definicion: "Definición", cuidado: "Cuidado",
    transicion: "Transición", estilos: "Estilos", herramientas: "Herramientas",
  };
  var TEX_LABEL = {
    todas: "Todas las texturas", ondulada: "Ondulada 2A–2C",
    rizada: "Rizada 3A–3C", afro: "Afro 4A–4C",
  };
  var NIVEL_LABEL = { principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Texto plano del panel → párrafos, respetando los saltos de línea */
  function parrafos(texto) {
    return String(texto || "").split(/\n{2,}/).filter(function (b) { return b.trim(); })
      .map(function (b) { return "<p>" + esc(b.trim()).replace(/\n/g, "<br>") + "</p>"; }).join("");
  }

  function esVideo(url) { return /\.(mp4|webm|mov)(\?|$)/i.test(url || ""); }

  /* <video> o <img> según el archivo que se haya subido */
  function mediaTag(url, alt, clase) {
    if (!url) return "";
    if (esVideo(url)) {
      return '<video class="' + clase + '" controls playsinline preload="metadata" ' +
        'aria-label="' + esc(alt) + '"><source src="' + esc(url) + '"></video>';
    }
    return '<img class="' + clase + '" src="' + esc(url) + '" alt="' + esc(alt) + '" loading="lazy">';
  }

  var guiasCache = null;
  function fetchGuias() {
    if (guiasCache) return Promise.resolve(guiasCache);
    if (!window.fetch || location.protocol.indexOf("http") !== 0) return Promise.resolve([]);
    return fetch("/api/guias")
      .then(function (r) { return r.json(); })
      .then(function (d) { guiasCache = (d && d.guias) || []; return guiasCache; })
      .catch(function () { return []; });
  }

  function guiaCard(g) {
    var pasos = (g.pasos || []).length;
    var portada = g.portada
      ? (esVideo(g.portada)
        ? '<video muted loop playsinline preload="metadata"><source src="' + esc(g.portada) + '"></video>'
        : '<img src="' + esc(g.portada) + '" alt="' + esc(g.titulo) + '" loading="lazy">')
      : '<span class="guia-cover-fallback">' + icon("sparkle") + "</span>";
    return (
      '<article class="guia-card">' +
      '<a class="guia-cover" href="guia.html?id=' + esc(g.id) + '" aria-label="Abrir la guía ' + esc(g.titulo) + '">' +
      portada +
      '<span class="guia-nivel">' + esc(NIVEL_LABEL[g.nivel] || "") + "</span>" +
      (g.video || (g.pasos || []).some(function (p) { return p.video; })
        ? '<span class="guia-tienevideo">' + icon("play") + " Con video</span>" : "") +
      "</a>" +
      '<div class="guia-body">' +
      '<span class="guia-meta">' + esc(CAT_LABEL[g.categoria] || "Guía") +
      (g.duracion ? " · " + esc(g.duracion) : "") +
      (g.textura && g.textura !== "todas" ? " · " + esc(TEX_LABEL[g.textura]) : "") + "</span>" +
      '<h3><a href="guia.html?id=' + esc(g.id) + '">' + esc(g.titulo) + "</a></h3>" +
      "<p>" + esc(g.resumen) + "</p>" +
      '<a class="guia-more" href="guia.html?id=' + esc(g.id) + '">Ver los ' + pasos + " pasos →</a>" +
      "</div></article>"
    );
  }

  var GUIAS_VACIO =
    '<div class="guias-vacio"><strong>Todavía no hay guías publicadas.</strong>' +
    "<span>Estamos grabando los primeros pasos a paso. Vuelve pronto o únete al Club Ondea para enterarte apenas salgan. ✦</span></div>";

  /* Página: listado de guías, con filtros por tema y por textura */
  function initGuias() {
    var grid = qs("#guias-grid");
    if (!grid) return;
    var filtros = { categoria: urlParam("categoria") || "", textura: urlParam("textura") || "" };

    function pintar(guias) {
      var lista = guias.filter(function (g) {
        return (!filtros.categoria || g.categoria === filtros.categoria) &&
          (!filtros.textura || g.textura === filtros.textura || g.textura === "todas");
      });
      qs("#guias-count").textContent = lista.length
        ? lista.length + (lista.length === 1 ? " guía" : " guías")
        : "";
      grid.innerHTML = lista.length
        ? lista.map(guiaCard).join("")
        : (guias.length
          ? '<div class="guias-vacio"><strong>Ninguna guía con ese filtro.</strong><span>Prueba con otro tema o mira todas las guías.</span></div>'
          : GUIAS_VACIO);
      revealScan();
    }

    fetchGuias().then(function (guias) {
      pintar(guias);
      qsa("[data-filtro]").forEach(function (chip) {
        chip.addEventListener("click", function () {
          var tipo = chip.getAttribute("data-filtro");
          var valor = chip.getAttribute("data-valor");
          filtros[tipo] = filtros[tipo] === valor ? "" : valor;
          qsa('[data-filtro="' + tipo + '"]').forEach(function (c) {
            c.classList.toggle("active", c.getAttribute("data-valor") === filtros[tipo]);
          });
          pintar(guias);
        });
        if (chip.getAttribute("data-valor") === filtros[chip.getAttribute("data-filtro")]) {
          chip.classList.add("active");
        }
      });
    });
  }

  /* Página: una guía con sus pasos, fotos y videos */
  function initGuia() {
    var root = qs("#guia-detalle");
    if (!root) return;
    var id = urlParam("id");

    fetchGuias().then(function (guias) {
      var g = guias.find(function (x) { return x.id === id; });
      if (!g) {
        root.innerHTML =
          '<div class="guias-vacio"><strong>No encontramos esa guía.</strong>' +
          '<span>Puede que la hayamos actualizado o despublicado.</span>' +
          '<a class="btn btn-brown" href="guias.html">Ver todas las guías ✦</a></div>';
        return;
      }

      document.title = g.titulo + " · Guía paso a paso · Rizos Ondea";
      var meta = qs('meta[name="description"]');
      if (meta && g.resumen) meta.setAttribute("content", g.resumen);

      var pasos = g.pasos || [];
      var indice = guias.indexOf(g);
      var anterior = guias[indice - 1];
      var siguiente = guias[indice + 1];

      root.innerHTML =
        '<div class="guia-head">' +
        '<a class="guia-volver" href="guias.html">← Todas las guías</a>' +
        '<span class="kicker">' + icon("book") + " " + esc(CAT_LABEL[g.categoria] || "Guía") + " ✦</span>" +
        "<h1>" + esc(g.titulo) + "</h1>" +
        (g.resumen ? '<p class="lead">' + esc(g.resumen) + "</p>" : "") +
        '<div class="guia-chips">' +
        '<span>' + icon("sparkle") + " " + esc(NIVEL_LABEL[g.nivel] || "") + "</span>" +
        (g.duracion ? "<span>" + icon("clock") + " " + esc(g.duracion) + "</span>" : "") +
        "<span>" + icon("wave") + " " + esc(TEX_LABEL[g.textura] || "") + "</span>" +
        "<span>" + icon("check") + " " + pasos.length + " pasos</span>" +
        "</div></div>" +

        (g.portada || g.video
          ? '<figure class="guia-portada">' + mediaTag(g.video || g.portada, g.titulo, "guia-portada-media") + "</figure>"
          : "") +

        (pasos.length
          ? '<ol class="pasos-lista">' + pasos.map(function (p, i) {
            return '<li class="paso">' +
              '<div class="paso-num" aria-hidden="true">' + (i + 1) + "</div>" +
              '<div class="paso-cuerpo">' +
              (p.titulo ? "<h2>" + esc(p.titulo) + "</h2>" : "") +
              parrafos(p.texto) +
              (p.imagen ? '<figure class="paso-media">' + mediaTag(p.imagen, p.titulo || g.titulo, "") + "</figure>" : "") +
              (p.video ? '<figure class="paso-media">' + mediaTag(p.video, p.titulo || g.titulo, "") + "</figure>" : "") +
              (p.tip ? '<p class="paso-tip">✦ ' + esc(p.tip) + "</p>" : "") +
              "</div></li>";
          }).join("") + "</ol>"
          : "") +

        ((g.tips || []).length
          ? '<div class="guia-tips"><h2>' + icon("heart") + " Para que te salga aún mejor</h2><ul>" +
          g.tips.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>"
          : "") +

        '<div class="guia-cierre">' +
        "<h2>¿Lo intentaste? Cuéntanos cómo te fue</h2>" +
        '<p>Etiquétanos en <a href="https://www.instagram.com/rizosondea/" target="_blank" rel="noopener">@rizosondea</a> con tu antes y después: publicamos las transformaciones de la comunidad cada semana.</p>' +
        '<div class="guia-cierre-acciones">' +
        '<a class="btn btn-brown" href="guias.html">Ver más guías ✦</a>' +
        '<a class="btn btn-outline" href="test-capilar.html">Descubrir mi tipo de rizo</a>' +
        "</div></div>" +

        '<nav class="guia-nav" aria-label="Otras guías">' +
        (anterior ? '<a href="guia.html?id=' + esc(anterior.id) + '"><small>← Anterior</small>' + esc(anterior.titulo) + "</a>" : "<span></span>") +
        (siguiente ? '<a class="sig" href="guia.html?id=' + esc(siguiente.id) + '"><small>Siguiente →</small>' + esc(siguiente.titulo) + "</a>" : "<span></span>") +
        "</nav>";

      revealScan();
    });
  }

  /* ---------- Página: Tienda ---------- */

  function normalizeText(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function initShop() {
    var grid = qs("#tienda-grid");
    if (!grid) return;

    var state = {
      cat: urlParam("cat") || "todas",
      tipo: urlParam("tipo") || "todos",
      orden: "relevancia",
      q: urlParam("q") || "",
    };

    var tipoSel = qs("#filtro-tipo");
    var ordenSel = qs("#filtro-orden");
    var buscar = qs("#filtro-buscar");
    var limpiar = qs("#filtro-limpiar");
    if (state.tipo !== "todos" && tipoSel) tipoSel.value = state.tipo;
    if (buscar && state.q) buscar.value = state.q;

    // Cada chip muestra cuántos productos tiene su categoría
    qsa(".chip[data-cat]").forEach(function (chip) {
      var c = chip.getAttribute("data-cat");
      var n = c === "todas"
        ? ONDEA_PRODUCTS.length
        : ONDEA_PRODUCTS.filter(function (p) { return p.category === c; }).length;
      chip.insertAdjacentHTML("beforeend", '<span class="chip-count">' + n + "</span>");
    });

    function hayFiltros() {
      return state.cat !== "todas" || state.tipo !== "todos" || state.q !== "";
    }

    // La URL refleja los filtros: se puede compartir o volver atrás sin perderlos
    function syncURL() {
      var params = new URLSearchParams();
      if (state.cat !== "todas") params.set("cat", state.cat);
      if (state.tipo !== "todos") params.set("tipo", state.tipo);
      if (state.q) params.set("q", state.q);
      var query = params.toString();
      history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
    }

    function reset() {
      state.cat = "todas";
      state.tipo = "todos";
      state.q = "";
      if (tipoSel) tipoSel.value = "todos";
      if (buscar) buscar.value = "";
      apply();
    }

    function apply() {
      var list = ONDEA_PRODUCTS.slice();
      if (state.cat !== "todas") list = list.filter(function (p) { return p.category === state.cat; });
      if (state.tipo !== "todos") list = list.filter(function (p) { return p.types.indexOf(state.tipo) !== -1; });
      if (state.q) {
        var q = normalizeText(state.q);
        list = list.filter(function (p) {
          return normalizeText(p.name + " " + p.short + " " + p.categoryLabel).indexOf(q) !== -1;
        });
      }
      if (state.orden === "precio-asc") list.sort(function (a, b) { return a.price - b.price; });
      if (state.orden === "precio-desc") list.sort(function (a, b) { return b.price - a.price; });

      grid.innerHTML = list.length
        ? list.map(productCard).join("")
        : '<div class="shop-empty">' +
          "<strong>No encontramos kits con esos filtros.</strong>" +
          "<span>Prueba con otra búsqueda o mira todo el catálogo ✦</span>" +
          '<button class="btn btn-outline btn-sm" id="empty-limpiar">Quitar los filtros</button>' +
          "</div>";
      bindAddButtons(grid);
      revealScan();

      var count = qs("#result-count");
      if (count) {
        count.textContent = list.length === ONDEA_PRODUCTS.length
          ? list.length + " kits"
          : list.length + " de " + ONDEA_PRODUCTS.length + " kits";
      }

      qsa(".chip[data-cat]").forEach(function (chip) {
        chip.classList.toggle("active", chip.getAttribute("data-cat") === state.cat);
      });

      if (limpiar) limpiar.hidden = !hayFiltros();
      var emptyBtn = qs("#empty-limpiar");
      if (emptyBtn) emptyBtn.addEventListener("click", reset);
      syncURL();
    }

    qsa(".chip[data-cat]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.cat = chip.getAttribute("data-cat");
        apply();
      });
    });
    if (tipoSel) tipoSel.addEventListener("change", function () { state.tipo = tipoSel.value; apply(); });
    if (ordenSel) ordenSel.addEventListener("change", function () { state.orden = ordenSel.value; apply(); });

    if (buscar) {
      var debounce = null;
      buscar.addEventListener("input", function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          state.q = buscar.value.trim();
          apply();
        }, 160);
      });
    }
    if (limpiar) limpiar.addEventListener("click", reset);

    apply();
  }

  /* ---------- Página: Detalle de producto ---------- */

  var TYPE_LABELS = { ondulado: "Ondulado 2A-2C", rizado: "Rizado 3A-3C", afro: "Afro 4A-4C" };

  function initProduct() {
    var wrap = qs("#detalle");
    if (!wrap) return;

    var p = getProduct(urlParam("id")) || ONDEA_PRODUCTS[0];

    document.title = p.name + " | Rizos Ondea · Envíos a toda Colombia";
    var metaDesc = qs('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", p.short + " Compra online en Rizos Ondea con envíos a Villavicencio y toda Colombia.");

    var before = p.oldPrice ? '<span class="before">' + fmtCOP(p.oldPrice) + "</span>" : "";
    var envioGratis = p.price >= ONDEA_CONFIG.envioGratisDesde;

    var media;
    if (hasPhotos(p)) {
      media =
        '<div class="detail-art has-photo">' +
        '<img id="detail-img" src="' + p.images[0] + '" alt="' + p.name + '">' +
        (p.images.length > 1
          ? '<div class="detail-thumbs">' + p.images.map(function (src, i) {
              return '<button type="button" class="detail-thumb' + (i === 0 ? " active" : "") + '" data-img="' + src + '" aria-label="Foto ' + (i + 1) + ' de ' + p.name + '"><img src="' + src + '" alt="" loading="lazy"></button>';
            }).join("") + "</div>"
          : "") +
        "</div>";
    } else {
      media = '<div class="detail-art">' + artFor(p) + "</div>";
    }

    wrap.innerHTML =
      media +
      '<div class="detail-info">' +
      '<nav class="breadcrumb" aria-label="Ruta"><a href="index.html">Inicio</a> / <a href="productos.html">Tienda</a> / ' + p.categoryLabel + "</nav>" +
      '<span class="prod-cat">' + p.categoryLabel + "</span>" +
      "<h1>" + p.name + "</h1>" +
      '<div class="detail-price"><span class="now">' + fmtCOP(p.price) + "</span>" + before + "</div>" +
      '<p class="detail-size">Contenido: ' + p.size + "</p>" +
      '<p class="detail-desc">' + p.desc + "</p>" +
      '<div class="type-tags">' + p.types.map(function (t) { return "<span>✦ " + TYPE_LABELS[t] + "</span>"; }).join("") + "</div>" +
      '<div class="qty-row">' +
      '<div class="qty-stepper" aria-label="Cantidad">' +
      '<button type="button" id="qty-menos" aria-label="Menos">−</button>' +
      '<input id="qty" type="number" inputmode="numeric" value="1" min="1" max="99" aria-label="Cantidad">' +
      '<button type="button" id="qty-mas" aria-label="Más">+</button>' +
      "</div>" +
      '<button class="btn btn-pink" id="add-detalle" style="flex:1">Agregar al carrito ' + icon("cart") + "</button>" +
      "</div>" +
      '<a class="btn btn-outline btn-block" href="carrito.html">Ir al carrito y pagar</a>' +
      '<div class="detail-ship">' +
      "<span>" + icon("truck") + " <strong>Envíos a toda Colombia</strong> (2 a 5 días hábiles). " + (envioGratis ? "<strong>¡Este producto tiene envío gratis!</strong>" : "Gratis desde " + fmtCOP(ONDEA_CONFIG.envioGratisDesde) + ".") + "</span>" +
      "<span>" + icon("pin") + " <strong>Hasta la puerta de tu casa</strong> en cualquier municipio del país.</span>" +
      "<span>" + icon("book") + ' ¿Dudas con tu tipo de rizo? Mira las <a href="guias.html" style="color:var(--pink-strong); font-weight:600;">guías paso a paso</a> — son gratis.</span>' +
      "</div>" +
      '<div class="accordion-set">' +
      "<details open><summary>Beneficios</summary><div class='acc-body'><ul>" + p.benefits.map(function (b) { return "<li>" + b + "</li>"; }).join("") + "</ul></div></details>" +
      "<details><summary>Modo de uso</summary><div class='acc-body'><p>" + p.howto + "</p></div></details>" +
      "<details><summary>Ingredientes</summary><div class='acc-body'><p>" + p.ingredients + "</p></div></details>" +
      "</div></div>";

    // Galería: cambiar la foto grande al tocar una miniatura
    var mainImg = qs("#detail-img");
    if (mainImg) {
      qsa(".detail-thumb").forEach(function (btn) {
        btn.addEventListener("click", function () {
          mainImg.src = btn.getAttribute("data-img");
          qsa(".detail-thumb").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
        });
      });
    }

    var qty = qs("#qty");
    qs("#qty-menos").addEventListener("click", function () { qty.value = Math.max(1, +qty.value - 1); });
    qs("#qty-mas").addEventListener("click", function () { qty.value = Math.min(99, +qty.value + 1); });
    qs("#add-detalle").addEventListener("click", function () { addToCart(p.id, Math.max(1, +qty.value || 1)); });

    var related = ONDEA_PRODUCTS.filter(function (x) { return x.id !== p.id && x.category === p.category; });
    if (related.length < 4) {
      ONDEA_PRODUCTS.forEach(function (x) {
        if (related.length < 4 && x.id !== p.id && related.indexOf(x) === -1) related.push(x);
      });
    }
    var relGrid = qs("#relacionados-grid");
    if (relGrid) {
      relGrid.innerHTML = related.slice(0, 4).map(productCard).join("");
      bindAddButtons(relGrid);
    }
  }

  /* ---------- Página: Carrito + Checkout ---------- */

  function shippingCost(city, subtotal) {
    // Tarifa única nacional: el pedido llega hasta la puerta de la casa
    return subtotal >= ONDEA_CONFIG.envioGratisDesde ? 0 : ONDEA_CONFIG.envioNacional;
  }

  function initCart() {
    var itemsWrap = qs("#cart-items");
    if (!itemsWrap) return;

    var summaryWrap = qs("#cart-summary");
    var form = qs("#checkout-form");

    function render() {
      var cart = getCart();

      if (!cart.length) {
        itemsWrap.innerHTML =
          '<div class="cart-empty"><svg class="icon icon-big" aria-hidden="true"><use href="#i-cart"></use></svg><h2>Tu carrito está vacío</h2>' +
          "<p>Descubre nuestra colección para rizos, ondas y afros con envío a toda Colombia.</p>" +
          '<a class="btn btn-pink" href="productos.html">Ver los kits</a></div>';
        if (summaryWrap) summaryWrap.style.display = "none";
        return;
      }
      if (summaryWrap) summaryWrap.style.display = "";

      // Venta cruzada: sugiere complementos de buen margen que no estén ya en el carrito
      var bumpIds = ["duo-rizos-definidos"]
        .filter(function (id) { return getProduct(id) && !cart.some(function (i) { return i.id === id; }); })
        .slice(0, 2);
      var bumpHTML = bumpIds.length
        ? '<div class="cart-bump"><h3>✦ Completa tu pedido</h3>' + bumpIds.map(function (id) {
            var p = getProduct(id);
            return (
              '<div class="bump-item">' +
              '<a class="thumb' + (hasPhotos(p) ? " has-photo" : "") + '" href="producto.html?id=' + p.id + '">' + visualFor(p) + "</a>" +
              '<div class="bump-info"><strong>' + p.name + "</strong><span>" + fmtCOP(p.price) + "</span></div>" +
              '<button class="btn btn-pink btn-sm" data-bump="' + p.id + '">Agregar</button>' +
              "</div>"
            );
          }).join("") + "</div>"
        : "";

      itemsWrap.innerHTML = cart.map(function (i) {
        var p = getProduct(i.id);
        if (!p) return "";
        return (
          '<div class="cart-item" data-id="' + p.id + '">' +
          '<a class="thumb' + (hasPhotos(p) ? " has-photo" : "") + '" href="producto.html?id=' + p.id + '">' + visualFor(p) + "</a>" +
          "<div><h3>" + p.name + '</h3><span class="unit">' + p.size + " · " + fmtCOP(p.price) + " c/u</span></div>" +
          '<div class="line-right">' +
          '<span class="line-total">' + fmtCOP(p.price * i.qty) + "</span>" +
          '<div class="qty-stepper">' +
          '<button type="button" data-menos aria-label="Menos">−</button>' +
          '<input type="number" value="' + i.qty + '" min="1" max="99" data-qty aria-label="Cantidad">' +
          '<button type="button" data-mas aria-label="Más">+</button>' +
          "</div>" +
          "<button class='remove' data-remove>Quitar</button>" +
          "</div></div>"
        );
      }).join("") + bumpHTML;

      qsa("[data-bump]", itemsWrap).forEach(function (btn) {
        btn.addEventListener("click", function () {
          addToCart(btn.getAttribute("data-bump"), 1);
          render();
        });
      });

      qsa(".cart-item", itemsWrap).forEach(function (row) {
        var id = row.getAttribute("data-id");
        var input = qs("[data-qty]", row);
        qs("[data-menos]", row).addEventListener("click", function () { setQty(id, +input.value - 1); render(); });
        qs("[data-mas]", row).addEventListener("click", function () { setQty(id, +input.value + 1); render(); });
        input.addEventListener("change", function () { setQty(id, +input.value || 1); render(); });
        qs("[data-remove]", row).addEventListener("click", function () { removeFromCart(id); render(); });
      });

      renderSummary();
    }

    function renderSummary() {
      var subtotal = cartSubtotal();
      var city = form ? (qs("#f-ciudad").value || "") : "";
      var envio = shippingCost(city, subtotal);
      var faltan = ONDEA_CONFIG.envioGratisDesde - subtotal;

      qs("#sum-subtotal").textContent = fmtCOP(subtotal);
      qs("#sum-envio").textContent = envio === 0 ? "¡Gratis!" : fmtCOP(envio);
      qs("#sum-total").textContent = fmtCOP(subtotal + envio);

      var note = qs("#free-ship-note");
      if (note) {
        if (faltan > 0) {
          note.className = "free-ship-note";
          note.textContent = "✦ Agrega " + fmtCOP(faltan) + " más y tu envío es GRATIS a toda Colombia.";
        } else {
          note.className = "free-ship-note ok";
          note.textContent = "✦ ¡Tu pedido tiene envío GRATIS a toda Colombia!";
        }
      }
    }

    if (form) {
      qs("#f-ciudad").addEventListener("input", renderSummary);

      // Pago online (Wompi): la opción solo aparece si el servidor la tiene activa
      if (window.fetch && location.protocol.indexOf("http") === 0) {
        fetch("/api/wompi/config")
          .then(function (r) { return r.json(); })
          .then(function (c) {
            var opt = qs("#pay-wompi");
            if (c && c.enabled && opt) opt.hidden = false;
          })
          .catch(function () {});
      }

      // El texto del botón cambia según el método de pago elegido
      var submitBtn = qs('#checkout-form button[type="submit"]');
      var submitHTML = submitBtn ? submitBtn.innerHTML : "";
      qsa('input[name="pago"]').forEach(function (radio) {
        radio.addEventListener("change", function () {
          if (!submitBtn) return;
          submitBtn.innerHTML = radio.checked && radio.value === "wompi"
            ? "Pagar en línea de forma segura ✦"
            : submitHTML;
        });
      });

      form.addEventListener("submit", function (ev) {
        ev.preventDefault();

        var nombre = qs("#f-nombre").value.trim();
        var telefono = qs("#f-telefono").value.trim();
        var direccion = qs("#f-direccion").value.trim();
        var ciudad = qs("#f-ciudad").value.trim();
        var depto = qs("#f-depto").value;
        var notas = qs("#f-notas").value.trim();
        var pagoInput = qs('input[name="pago"]:checked');
        var pago = pagoInput ? pagoInput.value : "";

        var cart = getCart();
        var subtotal = cartSubtotal();
        var envio = shippingCost(ciudad, subtotal);

        var orderPayload = {
          cliente: { nombre: nombre, telefono: telefono, direccion: direccion, ciudad: ciudad, depto: depto, notas: notas },
          items: cart.map(function (i) {
            var p = getProduct(i.id);
            return {
              id: i.id,
              name: p ? p.name : i.id,
              qty: i.qty,
              price: p ? p.price : 0,
              dropiId: p && p.dropiId ? p.dropiId : null,
              dropiItems: p && p.dropiItems ? p.dropiItems : null,
              proveedor: p && p.proveedor ? p.proveedor : null,
            };
          }),
          subtotal: subtotal,
          envio: envio,
          total: subtotal + envio,
          pago: pago,
        };

        // Pago online: crea el pedido y redirige al checkout seguro de Wompi.
        // El carrito NO se vacía aquí — lo vacía gracias.html si el pago aprueba.
        if (pago === "wompi") {
          var btnPagar = qs('#checkout-form button[type="submit"]');
          var btnPagarHTML = btnPagar ? btnPagar.innerHTML : "";
          if (btnPagar) { btnPagar.disabled = true; btnPagar.textContent = "Llevándote al pago seguro…"; }
          fetch("/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderPayload),
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (!data || !data.ok || !data.wompi) throw new Error("Wompi no disponible");
              var w = data.wompi;
              location.href =
                "https://checkout.wompi.co/p/?public-key=" + encodeURIComponent(w.publicKey) +
                "&currency=" + encodeURIComponent(w.currency) +
                "&amount-in-cents=" + encodeURIComponent(w.amountInCents) +
                "&reference=" + encodeURIComponent(w.reference) +
                "&signature%3Aintegrity=" + encodeURIComponent(w.signature) +
                "&redirect-url=" + encodeURIComponent(w.redirectUrl);
            })
            .catch(function () {
              if (btnPagar) { btnPagar.disabled = false; btnPagar.innerHTML = btnPagarHTML; }
              toast("No pudimos abrir el pago en línea. Intenta con otro método de pago.");
            });
          return;
        }

        // Resto de métodos: el pedido queda registrado y la confirmación
        // ocurre aquí mismo (ya no se abre ninguna app externa)
        var btnPedido = qs('#checkout-form button[type="submit"]');
        var btnPedidoHTML = btnPedido ? btnPedido.innerHTML : "";
        if (btnPedido) { btnPedido.disabled = true; btnPedido.textContent = "Enviando tu pedido…"; }

        fetch("/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data || !data.ok) throw new Error("pedido");
            var ref = qs("#order-ref");
            if (ref) ref.textContent = data.id;
            saveCart([]);
            qs("#cart-layout").style.display = "none";
            qs("#order-ok").style.display = "";
            window.scrollTo({ top: 0, behavior: "smooth" });
          })
          .catch(function () {
            if (btnPedido) { btnPedido.disabled = false; btnPedido.innerHTML = btnPedidoHTML; }
            toast("No pudimos registrar tu pedido. Revisa tu conexión e inténtalo de nuevo.");
          });
      });
    }

    render();
  }

  /* ---------- Página: Test capilar ---------- */

  var QUIZ = [
    { key: "tipo", q: "¿Cómo es tu textura natural?", opts: [
      { v: "ondulado", t: "Ondulada", s: "Ondas suaves en forma de S (2A-2C)", icon: "wave" },
      { v: "rizado", t: "Rizada", s: "Rizos definidos en espiral (3A-3C)", icon: "sparkle" },
      { v: "afro", t: "Afro / Crespa", s: "Coils apretados y con volumen (4A-4C)", icon: "heart" },
    ]},
    { key: "estado", q: "¿Cómo sientes tu cabello últimamente?", opts: [
      { v: "seco", t: "Seco y con frizz", s: "Le cuesta retener la hidratación", icon: "droplet" },
      { v: "normal", t: "Normal y equilibrado", s: "Solo quiero mantenerlo sano", icon: "leaf" },
      { v: "danado", t: "Maltratado", s: "Tinte, decoloración o calor frecuente", icon: "flask" },
    ]},
    { key: "objetivo", q: "¿Cuál es tu mayor objetivo?", opts: [
      { v: "definicion", t: "Definición sin frizz", s: "Rizos marcados que duren días", icon: "sparkle" },
      { v: "hidratacion", t: "Hidratación profunda", s: "Suavidad, brillo y elasticidad", icon: "droplet" },
      { v: "volumen", t: "Volumen con ligereza", s: "Cuerpo y movimiento sin apelmazar", icon: "wave" },
    ]},
    { key: "frecuencia", q: "¿Cada cuánto lavas tu cabello?", opts: [
      { v: "diario", t: "Casi todos los días", s: "Necesito refresh constante", icon: "clock" },
      { v: "semana", t: "2 a 3 veces por semana", s: "El ritmo clásico curly", icon: "clock" },
      { v: "unavez", t: "1 vez por semana o menos", s: "Wash day completo", icon: "clock" },
    ]},
    { key: "noche", q: "¿Proteges tus rizos al dormir?", opts: [
      { v: "si", t: "Sí, duermo con protección", s: "Piña, gorro o funda de satén", icon: "heart" },
      { v: "no", t: "No, amanezco con frizz", s: "Mi almohada deshace la definición", icon: "star" },
    ]},
  ];

  var QUIZ_TYPE_LABEL = { ondulado: "Ondulada 2A-2C", rizado: "Rizada 3A-3C", afro: "Afro 4A-4C" };
  // La textura del test en el vocabulario de las guías
  var TEXTURA_GUIAS = { ondulado: "ondulada", rizado: "rizada", afro: "afro" };

  function buildRoutine(ans) {
    // Rutina armada solo con el catálogo real conectado a Dropi
    var ids = ["kit-rizos-lavado-etniker"]; // base: limpia, hidrata y define en 3 pasos
    if (ans.estado === "seco" || ans.objetivo === "hidratacion") ids.push("kit-rizos-la-pocion");
    if (ans.estado === "seco" || ans.estado === "danado" || ans.tipo === "afro") ids.push("duo-rizos-definidos");
    if (ans.estado === "danado") ids.push("kit-reparacion-profunda-pocion");
    if (ans.objetivo === "volumen" || ans.frecuencia === "diario") ids.push("kit-rizos-largos-abundantes");

    var seen = {};
    return ids.filter(function (id) {
      if (seen[id]) return false;
      seen[id] = true;
      return true;
    }).slice(0, 6).map(getProduct).filter(Boolean);
  }

  function initQuiz() {
    var root = qs("#quiz-root");
    if (!root) return;
    var bar = qs("#quiz-bar");
    var answers = {};
    var step = 0;

    function renderStep() {
      var total = QUIZ.length;
      if (bar) bar.style.width = Math.round((step / total) * 100) + "%";
      var q = QUIZ[step];
      root.innerHTML =
        '<div class="quiz-step">' +
        '<span class="q-num">Pregunta ' + (step + 1) + " de " + total + "</span>" +
        "<h2>" + q.q + "</h2>" +
        '<div class="quiz-options">' +
        q.opts.map(function (o, i) {
          return '<button class="quiz-option" data-i="' + i + '"><span class="q-emoji">' + icon(o.icon) + "</span><span>" + o.t + "<small>" + o.s + "</small></span></button>";
        }).join("") +
        "</div>" +
        (step > 0 ? '<button class="quiz-back" id="quiz-back">← Volver a la pregunta anterior</button>' : "") +
        "</div>";

      qsa(".quiz-option", root).forEach(function (btn) {
        btn.addEventListener("click", function () {
          answers[q.key] = q.opts[+btn.getAttribute("data-i")].v;
          step++;
          if (step >= QUIZ.length) { renderResult(); } else { renderStep(); }
        });
      });
      var back = qs("#quiz-back");
      if (back) back.addEventListener("click", function () { step--; renderStep(); });
    }

    function renderResult() {
      if (bar) bar.style.width = "100%";
      var routine = buildRoutine(answers);
      var total = routine.reduce(function (s, p) { return s + p.price; }, 0);
      var envioGratis = total >= ONDEA_CONFIG.envioGratisDesde;

      root.innerHTML =
        '<div class="quiz-result">' +
        '<div class="qr-head">' +
        '<span class="qr-badge">' + icon("sparkle") + " Textura " + QUIZ_TYPE_LABEL[answers.tipo] + "</span>" +
        "<h2>Tu rutina Ondea está <span class='script'>lista</span> ✦</h2>" +
        "<p>Según tus respuestas, esto es lo que tu " + (answers.tipo === "ondulado" ? "onda" : "rizo") + " necesita. Empieza por las guías paso a paso de tu textura: son gratis y son el verdadero cambio. Los kits, si algún día los quieres, están abajo.</p>" +
        '<a class="btn btn-brown" href="guias.html?textura=' + TEXTURA_GUIAS[answers.tipo] + '">Ver mis guías paso a paso ' + icon("book") + "</a>" +
        "</div>" +
        '<div class="prod-grid" style="grid-template-columns:repeat(2,1fr);">' +
        routine.map(productCard).join("") +
        "</div>" +
        '<div class="qr-total">' +
        '<div class="qr-price">' + fmtCOP(total) + "<small>" + routine.length + " kits · " + (envioGratis ? "con envío GRATIS a toda Colombia" : "envíos a toda Colombia") + "</small></div>" +
        '<div class="qr-actions">' +
        '<button class="btn btn-pink" id="qr-add-all">Agregar toda mi rutina ' + icon("cart") + "</button>" +
        '<a class="btn btn-outline" href="guias.html?textura=' + TEXTURA_GUIAS[answers.tipo] + '">Guías de mi textura</a>' +
        "</div></div>" +
        '<div style="text-align:center; margin-top:18px;"><button class="quiz-back" id="quiz-restart">Repetir el test</button></div>' +
        "</div>";

      bindAddButtons(root);

      qs("#qr-add-all").addEventListener("click", function () {
        routine.forEach(function (p) { addToCart(p.id, 1); });
        toast("✓ Rutina completa agregada al carrito (" + routine.length + " kits)");
      });

      qs("#quiz-restart").addEventListener("click", function () {
        answers = {};
        step = 0;
        renderStep();
      });
    }

    renderStep();
  }

  /* ---------- Efectos de scroll: revelado, parallax, header, progreso ---------- */

  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var REVEAL_SELECTORS = [
    ".trust-item", ".section-head", ".cat-card", ".prod-card", ".texture-card",
    ".test-banner", ".split > div", ".step", ".testi", ".manifesto blockquote",
    ".manifesto figcaption", ".ig-tile", ".faq details", ".cta-banner",
    ".newsletter", ".blog-card", ".art-cover", ".art-cta",
    ".detail-art", ".detail-info",
    ".guia-card", ".paso", ".guia-tips", ".guia-cierre", ".pilar",
  ];

  // Variantes de entrada según el tipo de elemento
  var REVEAL_VARIANTS = [
    { sel: ".split > div:first-child", cls: "rv-left" },
    { sel: ".split > div:last-child", cls: "rv-right" },
    { sel: ".cat-card, .texture-card, .ig-tile", cls: "rv-zoom" },
  ];

  var revealObserver = null;

  function revealScan() {
    if (REDUCED_MOTION || !("IntersectionObserver" in window)) return;
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("rv-in");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -90px 0px" });
    }
    REVEAL_SELECTORS.forEach(function (sel) {
      qsa(sel).forEach(function (el) {
        if (el.classList.contains("rv")) return;
        var i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.setProperty("--rv-i", Math.min(i, 6));
        el.classList.add("rv");
        REVEAL_VARIANTS.forEach(function (v) {
          if (el.matches(v.sel)) el.classList.add(v.cls);
        });
        revealObserver.observe(el);
      });
    });
  }

  /* Contadores animados (se disparan al entrar en pantalla) */
  /* Los contadores con data-pending esperan a que llegue su dato del
     servidor: initHome vuelve a llamar aquí cuando ya lo tiene. */
  function initCounters() {
    var nums = qsa(".stat-num").filter(function (el) {
      return !el.hasAttribute("data-pending") && !el.hasAttribute("data-counted");
    });
    if (!nums.length) return;
    nums.forEach(function (el) { el.setAttribute("data-counted", "1"); });

    function setFinal(el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      var dec = parseInt(el.getAttribute("data-decimals"), 10) || 0;
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      el.textContent = prefix + target.toFixed(dec).replace(".", ",") + suffix;
    }

    if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
      nums.forEach(setFinal);
      return;
    }

    function animate(el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      var dec = parseInt(el.getAttribute("data-decimals"), 10) || 0;
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var dur = 1500;
      var start = null;
      function frame(ts) {
        if (!start) start = ts;
        var t = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + (target * eased).toFixed(dec).replace(".", ",") + suffix;
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        animate(entry.target);
      });
    }, { threshold: 0.6 });

    nums.forEach(function (el) { io.observe(el); });
  }

  function initScrollFX() {
    revealScan();
    initCounters();

    var progress = document.createElement("div");
    progress.id = "scroll-progress";
    document.body.appendChild(progress);

    var header = qs(".header");
    var heroPhoto = qs(".hero-photo");
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
        if (header) header.classList.toggle("scrolled", y > 24);
        if (heroPhoto && !REDUCED_MOTION) {
          heroPhoto.style.transform = "translateY(" + Math.min(y, 800) * 0.1 + "px) rotate(2deg)";
        }
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Común: menú móvil y contador del carrito ---------- */

  function initCommon() {
    var toggle = qs(".menu-toggle");
    var nav = qs(".nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    }

    updateCartBadge();
  }

  /* ---------- Arranque ---------- */

  /* Pantalla de carga: se desvanece cuando la página termina de cargar
     (dejando ver la animación al menos 1 s) y nunca retiene más de 3,5 s */
  function initSplash() {
    var splash = qs("#splash");
    if (!splash || splash.classList.contains("skip")) return;
    var inicio = Date.now();
    var ocultar = function () { splash.classList.add("done"); };
    var alCargar = function () {
      setTimeout(ocultar, Math.max(0, 1000 - (Date.now() - inicio)));
    };
    if (document.readyState === "complete") alCargar();
    else window.addEventListener("load", alCargar);
    setTimeout(ocultar, 3500);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSplash();
    initCommon();
    var page = document.body.getAttribute("data-page");
    if (page === "inicio") initHome();
    if (page === "guias") initGuias();
    if (page === "guia") initGuia();
    if (page === "tienda") initShop();
    if (page === "producto") initProduct();
    if (page === "carrito") initCart();
    if (page === "test") initQuiz();
    if (page !== "inicio") initNewsletter();
    initScrollFX();
  });
})();
