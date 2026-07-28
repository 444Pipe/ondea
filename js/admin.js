/* ==========================================================================
   Rizos Ondea — Lógica del panel de administración
   Pedidos, estadísticas, gráficas y contabilidad por producto.
   ========================================================================== */

(function () {
  "use strict";

  var KEY_STORAGE = "ondea_admin_key";
  var ESTADOS = ["nuevo", "confirmado", "enviado", "entregado", "cancelado"];

  var state = { key: null, pedidos: [], rango: 30 };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function fmtCOP(n) { return "$" + Math.round(n).toLocaleString("es-CO"); }

  function fmtFecha(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) + " " +
      d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var costMap = {};
  var nameMap = {};
  ONDEA_PRODUCTS.forEach(function (p) {
    costMap[p.id] = p.cost || Math.round(p.price * 0.55);
    nameMap[p.id] = p.name;
  });

  function costOf(item) {
    return costMap[item.id] != null ? costMap[item.id] : Math.round(item.price * 0.55);
  }

  /* ---------- API ---------- */

  function api(path, method, body) {
    return fetch(path, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": state.key || "",
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      if (r.status === 401) throw new Error("AUTH");
      return r.json();
    });
  }

  /* ---------- Sesión ---------- */

  function showLogin(errorMsg) {
    $("#login-view").style.display = "";
    $("#panel-view").style.display = "none";
    $("#login-error").textContent = errorMsg || "";
  }

  function showPanel() {
    $("#login-view").style.display = "none";
    $("#panel-view").style.display = "";
  }

  function tryLogin(key) {
    state.key = key;
    return api("/api/pedidos").then(function (data) {
      localStorage.setItem(KEY_STORAGE, key);
      state.pedidos = data.pedidos || [];
      showPanel();
      render();
    });
  }

  /* ---------- Datos filtrados ---------- */

  function filtered() {
    if (!state.rango) return state.pedidos.slice();
    var desde = Date.now() - state.rango * 86400000;
    return state.pedidos.filter(function (p) { return new Date(p.fecha).getTime() >= desde; });
  }

  function validos(list) {
    return list.filter(function (p) { return p.estado !== "cancelado"; });
  }

  function gananciaPedido(p) {
    return p.items.reduce(function (s, i) { return s + (i.price - costOf(i)) * i.qty; }, 0);
  }

  /* ---------- Render ---------- */

  function render() {
    var lista = filtered();
    var ok = validos(lista);

    renderKPIs(lista, ok);
    renderChartVentas(ok);
    renderChartTop(ok);
    renderPedidos(lista);
    renderConta(ok);
  }

  function renderKPIs(lista, ok) {
    var ventas = ok.reduce(function (s, p) { return s + p.total; }, 0);
    var ganancia = ok.reduce(function (s, p) { return s + gananciaPedido(p); }, 0);
    var unidades = ok.reduce(function (s, p) {
      return s + p.items.reduce(function (x, i) { return x + i.qty; }, 0);
    }, 0);
    var nuevos = state.pedidos.filter(function (p) { return p.estado === "nuevo"; }).length;
    var ticket = ok.length ? ventas / ok.length : 0;

    $("#kpi-grid").innerHTML =
      kpi("Ventas del periodo", fmtCOP(ventas), ok.length + " pedidos válidos", "k-brown") +
      kpi("Ganancia estimada", fmtCOP(ganancia), ventas ? Math.round((ganancia / Math.max(1, ventas - ok.reduce(function (s, p) { return s + p.envio; }, 0))) * 100) + "% de margen sobre productos" : "—", "k-green") +
      kpi("Ticket promedio", fmtCOP(ticket), unidades + " unidades vendidas", "k-gold") +
      kpi("Pedidos nuevos", String(nuevos), "por confirmar (histórico)", "");
  }

  function kpi(label, value, sub, cls) {
    return '<div class="kpi ' + cls + '"><div class="k-label">' + label + '</div><div class="k-value">' + value + '</div><div class="k-sub">' + sub + "</div></div>";
  }

  function renderChartVentas(ok) {
    var dias = state.rango || 30;
    dias = Math.min(dias, 30);
    var buckets = [];
    for (var d = dias - 1; d >= 0; d--) {
      var day = new Date(Date.now() - d * 86400000);
      buckets.push({ key: day.toISOString().slice(0, 10), label: day.getDate(), total: 0 });
    }
    var map = {};
    buckets.forEach(function (b) { map[b.key] = b; });
    ok.forEach(function (p) {
      var k = p.fecha.slice(0, 10);
      if (map[k]) map[k].total += p.total;
    });

    var max = Math.max.apply(null, buckets.map(function (b) { return b.total; }).concat([1]));
    var W = 600, H = 190, pad = 6;
    var bw = (W - pad * 2) / buckets.length;

    var bars = buckets.map(function (b, i) {
      var h = Math.round((b.total / max) * (H - 46));
      var x = pad + i * bw;
      var y = H - 26 - h;
      return '<g><title>' + b.key + " — " + fmtCOP(b.total) + "</title>" +
        '<rect x="' + (x + 2) + '" y="' + y + '" width="' + Math.max(2, bw - 4) + '" height="' + Math.max(2, h) + '" rx="3" fill="' + (b.total ? "#E87FA0" : "#F3DDD3") + '"/>' +
        (buckets.length <= 31 && (i % Math.ceil(buckets.length / 15) === 0)
          ? '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9" fill="#6E4030">' + b.label + "</text>" : "") +
        "</g>";
    }).join("");

    $("#chart-ventas").innerHTML = ok.length
      ? '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Ventas por día">' + bars + "</svg>"
      : '<div class="empty-note">Sin ventas en este periodo.</div>';
  }

  function renderChartTop(ok) {
    var agg = {};
    ok.forEach(function (p) {
      p.items.forEach(function (i) {
        if (!agg[i.id]) agg[i.id] = { name: i.name, qty: 0, ingresos: 0 };
        agg[i.id].qty += i.qty;
        agg[i.id].ingresos += i.price * i.qty;
      });
    });
    var top = Object.keys(agg).map(function (k) { return agg[k]; })
      .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 6);

    if (!top.length) {
      $("#chart-top").innerHTML = '<div class="empty-note">Aún no hay productos vendidos.</div>';
      return;
    }
    var max = top[0].qty;
    $("#chart-top").innerHTML = top.map(function (t) {
      return '<div class="hbar-row">' +
        '<span class="hbar-name" title="' + esc(t.name) + '">' + esc(t.name) + "</span>" +
        '<span class="hbar-val">' + t.qty + " und · " + fmtCOP(t.ingresos) + "</span>" +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + Math.round((t.qty / max) * 100) + '%"></div></div>' +
        "</div>";
    }).join("");
  }

  function renderPedidos(lista) {
    $("#pedidos-count").textContent = "· " + lista.length + " en el periodo";
    if (!lista.length) {
      $("#pedidos-wrap").innerHTML = '<div class="empty-note"><strong>Aún no hay pedidos en este periodo.</strong><br>Cuando una clienta finalice su compra, aparecerá aquí automáticamente. Usa "Cargar datos demo" para ver el panel en acción.</div>';
      return;
    }
    var orden = lista.slice().sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });

    var rows = orden.map(function (p) {
      var itemsTxt = p.items.map(function (i) { return i.qty + "× " + i.name; }).join("\n");
      var itemsShort = p.items.map(function (i) { return i.qty + "× " + i.name.replace(/«|»/g, ""); }).join("<br>");
      var tel = (p.cliente.telefono || "").replace(/\D/g, "");
      var waLink = tel ? '<a class="wa-mini" target="_blank" rel="noopener" href="https://wa.me/57' + tel.replace(/^57/, "") + '">WhatsApp</a>' : "";
      var opts = ESTADOS.map(function (e) {
        return '<option value="' + e + '"' + (p.estado === e ? " selected" : "") + ">" + e.charAt(0).toUpperCase() + e.slice(1) + "</option>";
      }).join("");

      return "<tr>" +
        '<td class="muted">' + fmtFecha(p.fecha) + "<br>" + esc(p.id) + (p.demo ? '<span class="tag-demo">DEMO</span>' : "") + "</td>" +
        "<td><strong>" + esc(p.cliente.nombre) + "</strong><br><span class='muted'>" + esc(p.cliente.ciudad) + ", " + esc(p.cliente.depto) + "</span><br>" + waLink + "</td>" +
        '<td title="' + esc(itemsTxt) + '">' + itemsShort + "</td>" +
        '<td class="num"><strong>' + fmtCOP(p.total) + "</strong><br><span class='muted'>envío " + (p.envio ? fmtCOP(p.envio) : "gratis") + "</span></td>" +
        "<td>" + esc(p.pago) + "</td>" +
        '<td><select class="estado-select estado-' + p.estado + '" data-id="' + esc(p.id) + '">' + opts + "</select></td>" +
        "</tr>";
    }).join("");

    $("#pedidos-wrap").innerHTML =
      '<table class="admin-table"><thead><tr>' +
      "<th>Fecha / ID</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Pago</th><th>Estado</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>";

    $$(".estado-select").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-id");
        api("/api/pedidos/" + id, "PATCH", { estado: sel.value }).then(function () {
          var p = state.pedidos.find(function (x) { return x.id === id; });
          if (p) p.estado = sel.value;
          render();
        }).catch(handleErr);
      });
    });
  }

  function renderConta(ok) {
    var agg = {};
    ok.forEach(function (p) {
      p.items.forEach(function (i) {
        if (!agg[i.id]) agg[i.id] = { id: i.id, name: nameMap[i.id] || i.name, qty: 0, ingresos: 0, costo: 0 };
        agg[i.id].qty += i.qty;
        agg[i.id].ingresos += i.price * i.qty;
        agg[i.id].costo += costOf(i) * i.qty;
      });
    });
    var filas = Object.keys(agg).map(function (k) { return agg[k]; })
      .sort(function (a, b) { return (b.ingresos - b.costo) - (a.ingresos - a.costo); });

    if (!filas.length) {
      $("#conta-wrap").innerHTML = '<div class="empty-note">Sin ventas en el periodo: la contabilidad aparecerá con el primer pedido.</div>';
      return;
    }

    var tot = { qty: 0, ingresos: 0, costo: 0 };
    var rows = filas.map(function (f) {
      var ganancia = f.ingresos - f.costo;
      var margen = f.ingresos ? Math.round((ganancia / f.ingresos) * 100) : 0;
      tot.qty += f.qty; tot.ingresos += f.ingresos; tot.costo += f.costo;
      return "<tr><td>" + esc(f.name) + "</td>" +
        '<td class="num">' + f.qty + "</td>" +
        '<td class="num">' + fmtCOP(f.ingresos) + "</td>" +
        '<td class="num muted">' + fmtCOP(f.costo) + "</td>" +
        '<td class="num pos">' + fmtCOP(ganancia) + "</td>" +
        '<td class="num">' + margen + "%</td></tr>";
    }).join("");

    var totGan = tot.ingresos - tot.costo;
    var totMargen = tot.ingresos ? Math.round((totGan / tot.ingresos) * 100) : 0;

    $("#conta-wrap").innerHTML =
      '<table class="admin-table"><thead><tr>' +
      "<th>Producto</th><th class='num'>Unidades</th><th class='num'>Ingresos</th><th class='num'>Costo</th><th class='num'>Ganancia</th><th class='num'>Margen</th>" +
      "</tr></thead><tbody>" + rows + "</tbody>" +
      "<tfoot><tr><td>Total</td>" +
      '<td class="num">' + tot.qty + "</td>" +
      '<td class="num">' + fmtCOP(tot.ingresos) + "</td>" +
      '<td class="num">' + fmtCOP(tot.costo) + "</td>" +
      '<td class="num pos">' + fmtCOP(totGan) + "</td>" +
      '<td class="num">' + totMargen + "%</td></tr></tfoot></table>";
  }

  /* ---------- Exportar CSV ---------- */

  function downloadCSV(nombre, filas) {
    var csv = "﻿" + filas.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPedidos() {
    var filas = [["Fecha", "ID", "Cliente", "Teléfono", "Ciudad", "Departamento", "Dirección", "Productos", "Subtotal", "Envío", "Total", "Pago", "Estado", "Demo"]];
    filtered().forEach(function (p) {
      filas.push([
        p.fecha, p.id, p.cliente.nombre, p.cliente.telefono, p.cliente.ciudad, p.cliente.depto, p.cliente.direccion,
        p.items.map(function (i) { return i.qty + "x " + i.name; }).join(" | "),
        p.subtotal, p.envio, p.total, p.pago, p.estado, p.demo ? "sí" : "no",
      ]);
    });
    downloadCSV("pedidos-ondea.csv", filas);
  }

  function exportConta() {
    var ok = validos(filtered());
    var agg = {};
    ok.forEach(function (p) {
      p.items.forEach(function (i) {
        if (!agg[i.id]) agg[i.id] = { name: nameMap[i.id] || i.name, qty: 0, ingresos: 0, costo: 0 };
        agg[i.id].qty += i.qty;
        agg[i.id].ingresos += i.price * i.qty;
        agg[i.id].costo += costOf(i) * i.qty;
      });
    });
    var filas = [["Producto", "Unidades", "Ingresos", "Costo", "Ganancia", "Margen %"]];
    Object.keys(agg).forEach(function (k) {
      var f = agg[k];
      var g = f.ingresos - f.costo;
      filas.push([f.name, f.qty, f.ingresos, f.costo, g, f.ingresos ? Math.round((g / f.ingresos) * 100) : 0]);
    });
    downloadCSV("contabilidad-ondea.csv", filas);
  }

  /* ---------- Acciones ---------- */

  function handleErr(e) {
    if (e && e.message === "AUTH") {
      localStorage.removeItem(KEY_STORAGE);
      showLogin("La clave ya no es válida. Ingresa de nuevo.");
    } else {
      alert("Error de conexión con el servidor. Intenta de nuevo.");
    }
  }

  function refresh() {
    return api("/api/pedidos").then(function (data) {
      state.pedidos = data.pedidos || [];
      render();
    }).catch(handleErr);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Login
    $("#login-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      tryLogin($("#login-key").value.trim()).catch(function (e) {
        if (e.message === "AUTH") showLogin("Clave incorrecta.");
        else showLogin("No se pudo conectar con el servidor.");
      });
    });

    // Rango
    $$("#range-row .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.rango = parseInt(chip.getAttribute("data-rango"), 10);
        $$("#range-row .chip").forEach(function (c) { c.classList.toggle("active", c === chip); });
        render();
      });
    });

    $("#btn-refresh").addEventListener("click", refresh);
    $("#btn-logout").addEventListener("click", function () {
      localStorage.removeItem(KEY_STORAGE);
      state.key = null;
      showLogin();
    });

    $("#btn-demo").addEventListener("click", function () {
      var btn = this;
      btn.disabled = true;
      api("/api/demo", "POST", {
        products: ONDEA_PRODUCTS.map(function (p) { return { id: p.id, name: p.name, price: p.price }; }),
      }).then(refresh).catch(handleErr).then(function () { btn.disabled = false; });
    });

    $("#btn-demo-clear").addEventListener("click", function () {
      if (!confirm("¿Eliminar todos los pedidos de demostración?")) return;
      var btn = this;
      btn.disabled = true;
      api("/api/demo", "DELETE").then(refresh).catch(handleErr).then(function () { btn.disabled = false; });
    });

    $("#btn-csv-pedidos").addEventListener("click", exportPedidos);
    $("#btn-csv-conta").addEventListener("click", exportConta);

    // Sesión: ?key= en la URL o clave guardada
    var urlKey = new URLSearchParams(location.search).get("key");
    var saved = urlKey || localStorage.getItem(KEY_STORAGE);
    if (saved) {
      tryLogin(saved).catch(function () { showLogin(); });
    } else {
      showLogin();
    }

    // Auto-actualización cada 2 minutos
    setInterval(function () {
      if (state.key && $("#panel-view").style.display !== "none") refresh();
    }, 120000);
  });
})();
