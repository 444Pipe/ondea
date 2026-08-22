/* ==========================================================================
   Rizos Ondea — Panel admin · Guías paso a paso y Club Ondea
   Aquí se crean las guías de la comunidad: cada paso puede llevar su foto o
   su video, que se suben directo desde el computador o el celular.
   ========================================================================== */

(function () {
  "use strict";

  var KEY_STORAGE = "ondea_admin_key";

  var CATEGORIAS = [
    ["rutina", "Rutina"], ["definicion", "Definición"], ["cuidado", "Cuidado"],
    ["transicion", "Transición"], ["estilos", "Estilos"], ["herramientas", "Herramientas"],
  ];
  var TEXTURAS = [
    ["todas", "Todas las texturas"], ["ondulada", "Ondulada 2A–2C"],
    ["rizada", "Rizada 3A–3C"], ["afro", "Afro 4A–4C"],
  ];
  var NIVELES = [["principiante", "Principiante"], ["intermedio", "Intermedio"], ["avanzado", "Avanzado"]];

  var state = { guias: [], form: null, cargado: false, subiendo: 0 };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clave() { return localStorage.getItem(KEY_STORAGE) || ""; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function esVideo(url) { return /\.(mp4|webm|mov)(\?|$)/i.test(url || ""); }

  function opciones(lista, valor) {
    return lista.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === valor ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");
  }

  function etiqueta(lista, valor) {
    var par = lista.find(function (o) { return o[0] === valor; });
    return par ? par[1] : valor;
  }

  /* ---------- API ---------- */

  function api(path, method, body) {
    return fetch(path, {
      method: method || "GET",
      headers: { "Content-Type": "application/json", "x-admin-key": clave() },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      if (r.status === 401) throw new Error("AUTH");
      return r.json();
    });
  }

  /* El archivo viaja tal cual en el cuerpo: nada de formularios, así el
     servidor puede escribirlo en disco mientras llega (videos grandes). */
  function subirArchivo(file, onProgreso) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/media");
      xhr.setRequestHeader("x-admin-key", clave());
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-nombre-archivo", encodeURIComponent(file.name));
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgreso) onProgreso(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = function () {
        var d = {};
        try { d = JSON.parse(xhr.responseText); } catch (e) {}
        if (xhr.status >= 200 && xhr.status < 300 && d.ok) resolve(d.archivo);
        else reject(new Error(d.error || "No se pudo subir el archivo"));
      };
      xhr.onerror = function () { reject(new Error("Se cortó la conexión durante la subida")); };
      xhr.send(file);
    });
  }

  function pedirArchivo(accept, alElegir) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", function () {
      if (input.files && input.files[0]) alElegir(input.files[0]);
      document.body.removeChild(input);
    });
    input.click();
  }

  /* ---------- Listado de guías ---------- */

  function cargar() {
    return api("/api/admin/guias").then(function (d) {
      state.guias = d.guias || [];
      state.cargado = true;
      render();
    }).catch(manejarError);
  }

  function manejarError(e) {
    if (e && e.message === "AUTH") {
      alert("Tu sesión venció. Vuelve a entrar al panel.");
      location.reload();
      return;
    }
    alert("Error de conexión con el servidor: " + (e && e.message ? e.message : "intenta de nuevo"));
  }

  function render() {
    if (state.form) renderEditor();
    else renderLista();
  }

  function renderLista() {
    var wrap = $("#guias-wrap");
    if (!wrap) return;

    var cabecera =
      '<div class="view-head">' +
      '<span class="muted">Lo que publiques aquí sale de inmediato en <code>/guias.html</code>. Cada paso puede llevar su foto o su video.</span>' +
      '<button class="abtn abtn-pink" id="btn-nueva-guia">✦ Nueva guía</button>' +
      "</div>";

    if (!state.guias.length) {
      wrap.innerHTML = cabecera +
        '<div class="empty-note"><strong>Todavía no hay guías.</strong><br>Crea la primera: título, pasos y una foto o video en cada paso.</div>';
      $("#btn-nueva-guia").addEventListener("click", nuevaGuia);
      return;
    }

    var filas = state.guias.map(function (g, i) {
      var pasosConMedia = (g.pasos || []).filter(function (p) { return p.imagen || p.video; }).length;
      var portada = g.portada
        ? (esVideo(g.portada)
          ? '<span class="g-mini g-mini-video">▶</span>'
          : '<img class="g-mini" src="' + esc(g.portada) + '" alt="">')
        : '<span class="g-mini g-mini-vacia">✦</span>';
      return "<tr>" +
        "<td>" + portada + "</td>" +
        "<td><strong>" + esc(g.titulo) + "</strong><br><span class='muted'>" + esc(g.resumen || "").slice(0, 90) + "</span></td>" +
        "<td>" + esc(etiqueta(CATEGORIAS, g.categoria)) + "<br><span class='muted'>" + esc(etiqueta(TEXTURAS, g.textura)) + "</span></td>" +
        '<td class="num">' + (g.pasos || []).length + "<br><span class='muted'>" + pasosConMedia + " con media</span></td>" +
        "<td>" + (g.publicada
          ? '<span class="g-chip g-pub">Publicada</span>'
          : '<span class="g-chip g-borr">Borrador</span>') +
        (g.destacada ? '<br><span class="g-chip g-dest">Destacada</span>' : "") + "</td>" +
        '<td class="g-acciones">' +
        '<button class="abtn abtn-light" data-editar="' + esc(g.id) + '">Editar</button>' +
        '<button class="abtn abtn-light" data-subir="' + esc(g.id) + '"' + (i === 0 ? " disabled" : "") + ' title="Subir en el orden">↑</button>' +
        '<button class="abtn abtn-light" data-bajar="' + esc(g.id) + '"' + (i === state.guias.length - 1 ? " disabled" : "") + ' title="Bajar en el orden">↓</button>' +
        (g.publicada ? '<a class="abtn abtn-light" href="guia.html?id=' + esc(g.id) + '" target="_blank" rel="noopener">Ver</a>' : "") +
        '<button class="abtn abtn-danger" data-borrar="' + esc(g.id) + '">Borrar</button>' +
        "</td></tr>";
    }).join("");

    wrap.innerHTML = cabecera +
      '<div class="table-card"><table class="admin-table"><thead><tr>' +
      "<th></th><th>Guía</th><th>Tema</th><th class='num'>Pasos</th><th>Estado</th><th>Acciones</th>" +
      "</tr></thead><tbody>" + filas + "</tbody></table></div>";

    $("#btn-nueva-guia").addEventListener("click", nuevaGuia);
    $$("[data-editar]", wrap).forEach(function (b) {
      b.addEventListener("click", function () { editarGuia(b.getAttribute("data-editar")); });
    });
    $$("[data-borrar]", wrap).forEach(function (b) {
      b.addEventListener("click", function () { borrarGuia(b.getAttribute("data-borrar")); });
    });
    $$("[data-subir]", wrap).forEach(function (b) {
      b.addEventListener("click", function () { moverGuia(b.getAttribute("data-subir"), -1); });
    });
    $$("[data-bajar]", wrap).forEach(function (b) {
      b.addEventListener("click", function () { moverGuia(b.getAttribute("data-bajar"), 1); });
    });
  }

  /* ---------- Editor ---------- */

  function pasoVacio() { return { titulo: "", texto: "", imagen: "", video: "", tip: "" }; }

  function nuevaGuia() {
    state.form = {
      id: null,
      titulo: "", resumen: "", categoria: "rutina", textura: "todas", nivel: "principiante",
      duracion: "", portada: "", video: "", publicada: false, destacada: false,
      pasos: [pasoVacio()], tips: [],
    };
    renderEditor();
  }

  function editarGuia(id) {
    var g = state.guias.find(function (x) { return x.id === id; });
    if (!g) return;
    state.form = JSON.parse(JSON.stringify(g));
    state.form.pasos = state.form.pasos && state.form.pasos.length ? state.form.pasos : [pasoVacio()];
    state.form.tips = state.form.tips || [];
    renderEditor();
    window.scrollTo({ top: 0 });
  }

  function campoMedia(valor, etiquetaCampo, ruta, ayuda) {
    var previo = valor
      ? '<div class="media-previo">' +
        (esVideo(valor)
          ? '<video src="' + esc(valor) + '" controls preload="metadata"></video>'
          : '<img src="' + esc(valor) + '" alt="">') +
        '<button type="button" class="abtn abtn-danger" data-quitar="' + esc(ruta) + '">Quitar</button>' +
        "</div>"
      : "";
    return '<div class="campo-media">' +
      "<label>" + etiquetaCampo + (ayuda ? '<small class="muted">' + ayuda + "</small>" : "") + "</label>" +
      previo +
      '<div class="media-botones">' +
      '<button type="button" class="abtn abtn-light" data-subir-media="' + esc(ruta) + '" data-accept="image/*">📷 Subir foto</button>' +
      '<button type="button" class="abtn abtn-light" data-subir-media="' + esc(ruta) + '" data-accept="video/*">🎬 Subir video</button>' +
      '<span class="media-progreso" data-progreso="' + esc(ruta) + '"></span>' +
      "</div></div>";
  }

  function renderEditor() {
    var wrap = $("#guias-wrap");
    var f = state.form;
    if (!wrap || !f) return;

    var pasos = f.pasos.map(function (p, i) {
      return '<div class="paso-editor">' +
        '<div class="paso-editor-top">' +
        '<span class="paso-editor-num">Paso ' + (i + 1) + "</span>" +
        '<div class="paso-editor-acciones">' +
        '<button type="button" class="abtn abtn-light" data-paso-subir="' + i + '"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="abtn abtn-light" data-paso-bajar="' + i + '"' + (i === f.pasos.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button type="button" class="abtn abtn-danger" data-paso-borrar="' + i + '">Eliminar</button>' +
        "</div></div>" +
        '<label>Título del paso<input type="text" data-campo="pasos.' + i + '.titulo" value="' + esc(p.titulo) + '" placeholder="Ej: Desenreda antes de mojar"></label>' +
        '<label>Explicación<textarea rows="4" data-campo="pasos.' + i + '.texto" placeholder="Cuéntalo como se lo explicarías a una amiga en el baño.">' + esc(p.texto) + "</textarea></label>" +
        '<div class="media-fila">' +
        campoMedia(p.imagen, "Foto del paso", "pasos." + i + ".imagen", "") +
        campoMedia(p.video, "Video del paso", "pasos." + i + ".video", "") +
        "</div>" +
        '<label>Tip del paso (opcional)<input type="text" data-campo="pasos.' + i + '.tip" value="' + esc(p.tip) + '" placeholder="Ese detalle que nadie te cuenta"></label>' +
        "</div>";
    }).join("");

    var tips = f.tips.map(function (t, i) {
      return '<div class="tip-fila">' +
        '<input type="text" data-campo="tips.' + i + '" value="' + esc(t) + '" placeholder="Un consejo extra para el final de la guía">' +
        '<button type="button" class="abtn abtn-danger" data-tip-borrar="' + i + '">✕</button>' +
        "</div>";
    }).join("");

    wrap.innerHTML =
      '<div class="view-head">' +
      '<span class="muted">' + (f.id ? "Editando: <strong>" + esc(f.titulo || "sin título") + "</strong>" : "Nueva guía") + "</span>" +
      '<button class="abtn abtn-light" id="btn-cancelar">← Volver a la lista</button>' +
      "</div>" +

      '<div class="editor-card">' +
      '<h3>Lo básico</h3>' +
      '<label>Título<input type="text" data-campo="titulo" value="' + esc(f.titulo) + '" placeholder="Ej: Cómo definir tus rizos sin frizz"></label>' +
      '<label>Resumen<textarea rows="2" data-campo="resumen" placeholder="Una o dos frases: qué va a aprender quien la lea.">' + esc(f.resumen) + "</textarea></label>" +
      '<div class="editor-grid">' +
      '<label>Tema<select data-campo="categoria">' + opciones(CATEGORIAS, f.categoria) + "</select></label>" +
      '<label>Textura<select data-campo="textura">' + opciones(TEXTURAS, f.textura) + "</select></label>" +
      '<label>Nivel<select data-campo="nivel">' + opciones(NIVELES, f.nivel) + "</select></label>" +
      '<label>Duración<input type="text" data-campo="duracion" value="' + esc(f.duracion) + '" placeholder="Ej: 25 min"></label>' +
      "</div>" +
      '<div class="media-fila">' +
      campoMedia(f.portada, "Portada de la guía", "portada", "Es la imagen que se ve en la lista de guías.") +
      campoMedia(f.video, "Video completo (opcional)", "video", "Si grabaste la guía entera, va aquí arriba de los pasos.") +
      "</div>" +
      '<div class="editor-checks">' +
      '<label class="check"><input type="checkbox" data-campo="publicada"' + (f.publicada ? " checked" : "") + "> Publicada (visible para la comunidad)</label>" +
      '<label class="check"><input type="checkbox" data-campo="destacada"' + (f.destacada ? " checked" : "") + "> Destacada en el inicio</label>" +
      "</div></div>" +

      '<div class="editor-card">' +
      "<h3>Pasos</h3>" +
      pasos +
      '<button type="button" class="abtn abtn-pink" id="btn-agregar-paso">＋ Agregar paso</button>' +
      "</div>" +

      '<div class="editor-card">' +
      "<h3>Tips finales (opcional)</h3>" +
      tips +
      '<button type="button" class="abtn abtn-light" id="btn-agregar-tip">＋ Agregar tip</button>' +
      "</div>" +

      '<div class="editor-guardar">' +
      '<button class="abtn abtn-light" id="btn-cancelar-2">Cancelar</button>' +
      '<button class="abtn abtn-pink" id="btn-guardar">Guardar guía</button>' +
      "</div>";

    conectarEditor(wrap);
  }

  /* Los campos de texto actualizan el modelo sin repintar (para no perder el
     cursor); solo lo estructural — pasos, tips, archivos — vuelve a pintar.
     La escucha de los campos se engancha una sola vez, al arrancar. */
  function escucharCampos(wrap) {
    function alEscribir(ev) {
      var campo = ev.target.getAttribute && ev.target.getAttribute("data-campo");
      if (!campo || !state.form) return;
      escribirCampo(campo, ev.target.type === "checkbox" ? ev.target.checked : ev.target.value);
    }
    wrap.addEventListener("input", alEscribir);
    wrap.addEventListener("change", alEscribir);
  }

  function conectarEditor(wrap) {
    $$("[data-subir-media]", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ruta = btn.getAttribute("data-subir-media");
        pedirArchivo(btn.getAttribute("data-accept"), function (file) {
          var marca = $('[data-progreso="' + ruta + '"]', wrap);
          state.subiendo++;
          if (marca) marca.textContent = "Subiendo… 0%";
          subirArchivo(file, function (pct) { if (marca) marca.textContent = "Subiendo… " + pct + "%"; })
            .then(function (archivo) {
              state.subiendo--;
              escribirCampo(ruta, archivo.url);
              renderEditor();
            })
            .catch(function (e) {
              state.subiendo--;
              if (marca) marca.textContent = "";
              alert(e.message);
            });
        });
      });
    });

    $$("[data-quitar]", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () {
        escribirCampo(btn.getAttribute("data-quitar"), "");
        renderEditor();
      });
    });

    $$("[data-paso-borrar]", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (state.form.pasos.length === 1) return alert("La guía necesita al menos un paso.");
        if (!confirm("¿Eliminar este paso?")) return;
        state.form.pasos.splice(parseInt(btn.getAttribute("data-paso-borrar"), 10), 1);
        renderEditor();
      });
    });
    $$("[data-paso-subir]", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () { moverPaso(parseInt(btn.getAttribute("data-paso-subir"), 10), -1); });
    });
    $$("[data-paso-bajar]", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () { moverPaso(parseInt(btn.getAttribute("data-paso-bajar"), 10), 1); });
    });
    $$("[data-tip-borrar]", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.form.tips.splice(parseInt(btn.getAttribute("data-tip-borrar"), 10), 1);
        renderEditor();
      });
    });

    $("#btn-agregar-paso").addEventListener("click", function () {
      state.form.pasos.push(pasoVacio());
      renderEditor();
    });
    $("#btn-agregar-tip").addEventListener("click", function () {
      state.form.tips.push("");
      renderEditor();
    });
    $("#btn-guardar").addEventListener("click", guardar);
    [$("#btn-cancelar"), $("#btn-cancelar-2")].forEach(function (b) {
      if (b) b.addEventListener("click", cancelar);
    });
  }

  function escribirCampo(ruta, valor) {
    var partes = ruta.split(".");
    var obj = state.form;
    for (var i = 0; i < partes.length - 1; i++) obj = obj[partes[i]];
    obj[partes[partes.length - 1]] = valor;
  }

  function moverPaso(i, delta) {
    var destino = i + delta;
    if (destino < 0 || destino >= state.form.pasos.length) return;
    var tmp = state.form.pasos[i];
    state.form.pasos[i] = state.form.pasos[destino];
    state.form.pasos[destino] = tmp;
    renderEditor();
  }

  function cancelar() {
    if (!confirm("¿Descartar los cambios sin guardar?")) return;
    state.form = null;
    renderLista();
  }

  function guardar() {
    var f = state.form;
    if (!f.titulo.trim()) return alert("La guía necesita un título.");
    if (state.subiendo > 0) return alert("Espera a que terminen de subir los archivos.");

    var btn = $("#btn-guardar");
    btn.disabled = true;
    btn.textContent = "Guardando…";

    var cuerpo = {
      titulo: f.titulo, resumen: f.resumen, categoria: f.categoria, textura: f.textura,
      nivel: f.nivel, duracion: f.duracion, portada: f.portada, video: f.video,
      publicada: !!f.publicada, destacada: !!f.destacada,
      pasos: f.pasos, tips: f.tips.filter(function (t) { return t.trim(); }),
    };

    var peticion = f.id
      ? api("/api/admin/guias/" + f.id, "PUT", cuerpo)
      : api("/api/admin/guias", "POST", cuerpo);

    peticion.then(function (d) {
      if (!d.ok) throw new Error(d.error || "No se pudo guardar");
      state.form = null;
      return cargar();
    }).catch(function (e) {
      btn.disabled = false;
      btn.textContent = "Guardar guía";
      manejarError(e);
    });
  }

  function borrarGuia(id) {
    var g = state.guias.find(function (x) { return x.id === id; });
    if (!g) return;
    if (!confirm('¿Borrar la guía "' + g.titulo + '"? Esta acción no se puede deshacer.')) return;
    api("/api/admin/guias/" + id, "DELETE").then(function (d) {
      if (!d.ok) throw new Error(d.error || "No se pudo borrar");
      return cargar();
    }).catch(manejarError);
  }

  function moverGuia(id, delta) {
    var i = state.guias.findIndex(function (x) { return x.id === id; });
    var destino = i + delta;
    if (i === -1 || destino < 0 || destino >= state.guias.length) return;
    var tmp = state.guias[i];
    state.guias[i] = state.guias[destino];
    state.guias[destino] = tmp;
    renderLista();
    api("/api/admin/guias/orden", "POST", {
      ids: state.guias.map(function (g) { return g.id; }),
    }).catch(manejarError);
  }

  /* ---------- Club Ondea (correos suscritos) ---------- */

  var clubCargado = false;
  function cargarClub() {
    return api("/api/admin/suscriptores").then(function (d) {
      clubCargado = true;
      var lista = d.suscriptores || [];
      var wrap = $("#club-wrap");
      if (!wrap) return;
      if (!lista.length) {
        wrap.innerHTML = '<div class="empty-note"><strong>Todavía nadie se ha suscrito.</strong><br>Los correos del formulario «Club Ondea» del sitio aparecen aquí.</div>';
        return;
      }
      wrap.innerHTML =
        '<div class="view-head"><span class="muted">' + lista.length + " suscritas</span>" +
        '<button class="abtn abtn-light" id="btn-csv-club">⬇ Exportar CSV</button></div>' +
        '<div class="table-card"><table class="admin-table"><thead><tr><th>Correo</th><th>Fecha</th></tr></thead><tbody>' +
        lista.map(function (s) {
          return "<tr><td>" + esc(s.email) + "</td><td class='muted'>" +
            new Date(s.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) +
            "</td></tr>";
        }).join("") +
        "</tbody></table></div>";

      $("#btn-csv-club").addEventListener("click", function () {
        var filas = [["Correo", "Fecha"]].concat(lista.map(function (s) { return [s.email, s.fecha]; }));
        var csv = "﻿" + filas.map(function (r) {
          return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";");
        }).join("\r\n");
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        a.download = "club-ondea.csv";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }).catch(manejarError);
  }

  /* ---------- Arranque ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    var wrap = $("#guias-wrap");
    if (wrap) escucharCampos(wrap);

    var itemGuias = $('.sb-item[data-view="guias"]');
    var itemClub = $('.sb-item[data-view="club"]');

    if (itemGuias) {
      itemGuias.addEventListener("click", function () {
        if (!state.cargado) cargar();
        else render();
      });
    }
    if (itemClub) {
      itemClub.addEventListener("click", function () { if (!clubCargado) cargarClub(); });
    }

    // El botón "Actualizar" de la barra superior también sirve aquí
    var btnRefrescar = $("#btn-refresh");
    if (btnRefrescar) {
      btnRefrescar.addEventListener("click", function () {
        var vistaGuias = $("#view-guias");
        var vistaClub = $("#view-club");
        if (vistaGuias && !vistaGuias.hidden && !state.form) cargar();
        if (vistaClub && !vistaClub.hidden) cargarClub();
      });
    }
  });
})();
