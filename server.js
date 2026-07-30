/* ==========================================================================
   Rizos Ondea — Servidor para producción (Railway)
   Sirve el sitio estático Y la API de pedidos del panel admin.
   Sin dependencias: solo módulos nativos de Node.

   Variables de entorno:
   - PORT        → la inyecta Railway automáticamente.
   - ADMIN_USER  → usuario del panel admin (por defecto "gamendo").
   - ADMIN_PASS  → contraseña del panel admin (por defecto "amoapipe").
   - DATA_DIR    → carpeta de datos persistente. En Railway crea un Volume
                   montado en /data y define DATA_DIR=/data para que los
                   pedidos sobrevivan a los redespliegues.
   ========================================================================== */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "gamendo";
const ADMIN_PASS = process.env.ADMIN_PASS || "amoapipe";
const ADMIN_KEY = ADMIN_USER + ":" + ADMIN_PASS; // el panel envía "usuario:contraseña"
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const PEDIDOS_FILE = path.join(DATA_DIR, "pedidos.json");

const ESTADOS = ["nuevo", "confirmado", "enviado", "entregado", "cancelado"];

/* ---------- Integración con Dropi (dropshipping) ----------
   Se activa con variables de entorno en Railway:
   - DROPI_ENABLED=true
   - DROPI_INTEGRATION_KEY=<llave generada en Dropi → Integraciones>
   - DROPI_API_BASE=<URL base de la API según la documentación oficial;
                     usa la URL de pruebas primero>
   - DROPI_PAYMENT_METHOD_ID=<id del método de pago (contraentrega) en Dropi>
   - DROPI_AUTO_SEND=true  → envía cada pedido a Dropi automáticamente
     (si es false, se envían manualmente desde el panel admin)            */

const DROPI = {
  enabled: process.env.DROPI_ENABLED === "true",
  base: (process.env.DROPI_API_BASE || "https://api.dropi.co/integrations").replace(/\/+$/, ""),
  key: process.env.DROPI_INTEGRATION_KEY || "",
  paymentMethodId: parseInt(process.env.DROPI_PAYMENT_METHOD_ID, 10) || 1,
  autoSend: process.env.DROPI_AUTO_SEND === "true",
};

/* ---------- Integración con Wompi (pasarela de pagos) ----------
   Desactivada por defecto. Para activarla, define en Railway:
   - WOMPI_ENABLED=true
   - WOMPI_PUBLIC_KEY=<llave pública (pub_test_… para pruebas, pub_prod_… en vivo)>
   - WOMPI_INTEGRITY_SECRET=<secreto de integridad — Wompi → Desarrolladores>
   - WOMPI_EVENTS_SECRET=<secreto de eventos, valida la firma del webhook>
   - WOMPI_REDIRECT_BASE=<opcional; por defecto https://www.rizosondea.com>
   En el panel de Wompi registra como URL de eventos (webhook):
     https://www.rizosondea.com/api/wompi/eventos
   Flujo: el checkout crea el pedido con pago pendiente y redirige a Wompi;
   cuando el webhook reporta la transacción APPROVED, el pedido se envía a
   Dropi automáticamente (si Dropi está activo).                          */

const WOMPI = {
  enabled: process.env.WOMPI_ENABLED === "true",
  publicKey: process.env.WOMPI_PUBLIC_KEY || "",
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET || "",
  eventsSecret: process.env.WOMPI_EVENTS_SECRET || "",
  redirectBase: (process.env.WOMPI_REDIRECT_BASE || "https://www.rizosondea.com").replace(/\/+$/, ""),
};

function wompiActivo() {
  return WOMPI.enabled && !!WOMPI.publicKey && !!WOMPI.integritySecret;
}

function httpsJSON(method, urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(new Error("URL inválida: " + urlStr)); }
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: method,
      headers: Object.assign(
        { "Content-Type": "application/json", Accept: "application/json" },
        data ? { "Content-Length": Buffer.byteLength(data) } : {},
        headers || {}
      ),
      timeout: 20000,
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = { raw: raw.slice(0, 500) }; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Dropi no respondió (timeout)")));
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

/* ⚠️ Estructura basada en la documentación pública de la API de integraciones
   de Dropi (POST /orders/myorders). Cuando tengas tu cuenta, confirma los
   nombres exactos de los campos con la documentación oficial que entrega
   Dropi al generar la llave, y ajústalos SOLO en esta función. */
function buildDropiOrder(pedido) {
  const partes = (pedido.cliente.nombre || "").trim().split(/\s+/);
  return {
    state: pedido.cliente.depto,
    city: pedido.cliente.ciudad,
    name: partes.slice(0, 1).join(" ") || "Cliente",
    surname: partes.slice(1).join(" ") || ".",
    dir: pedido.cliente.direccion,
    phone: pedido.cliente.telefono,
    payment_method_id: DROPI.paymentMethodId,
    total_order: pedido.total,
    notes: ("Pedido web " + pedido.id + (pedido.cliente.notas ? " · " + pedido.cliente.notas : "")).slice(0, 250),
    products: pedido.items
      .filter((i) => i.dropiId)
      .map((i) => ({ id: i.dropiId, quantity: i.qty })),
  };
}

async function dropiSendOrder(pedido) {
  if (!DROPI.enabled || !DROPI.key) {
    return { ok: false, error: "Dropi no está configurado: define DROPI_ENABLED y DROPI_INTEGRATION_KEY en las variables de entorno." };
  }
  const mapeados = pedido.items.filter((i) => i.dropiId);
  if (!mapeados.length) {
    return { ok: false, error: "Ningún producto de este pedido tiene dropiId. Agrégalo en js/data.js con el ID del catálogo de Dropi." };
  }
  const ahora = new Date().toISOString();
  try {
    const r = await httpsJSON("POST", DROPI.base + "/orders/myorders", { "dropi-integration-key": DROPI.key }, buildDropiOrder(pedido));
    if (r.status >= 200 && r.status < 300) {
      const dropiId = (r.body && (r.body.id || (r.body.order && r.body.order.id) || (r.body.data && r.body.data.id))) || null;
      pedido.dropi = { estado: "enviado", fecha: ahora, id: dropiId, respuesta: r.body };
      savePedidos();
      return { ok: true, dropi: pedido.dropi };
    }
    pedido.dropi = { estado: "error", fecha: ahora, error: "HTTP " + r.status, respuesta: r.body };
    savePedidos();
    return { ok: false, error: "Dropi respondió HTTP " + r.status, detalle: r.body };
  } catch (e) {
    pedido.dropi = { estado: "error", fecha: ahora, error: e.message };
    savePedidos();
    return { ok: false, error: e.message };
  }
}

/* ---------- Almacenamiento de pedidos ---------- */

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let pedidos = [];
try {
  pedidos = JSON.parse(fs.readFileSync(PEDIDOS_FILE, "utf8"));
  if (!Array.isArray(pedidos)) pedidos = [];
} catch (e) {
  pedidos = [];
}

let saveChain = Promise.resolve();
function savePedidos() {
  saveChain = saveChain
    .then(() => fs.promises.writeFile(PEDIDOS_FILE, JSON.stringify(pedidos, null, 2)))
    .catch((e) => console.error("Error guardando pedidos:", e.message));
}

function genId() {
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return "PED-" + Date.now().toString(36).toUpperCase() + rand;
}

/* ---------- Utilidades HTTP ---------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function cacheControl(ext) {
  return ext === ".html" ? "no-cache" : "public, max-age=86400";
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJSON(res, status, obj) {
  send(res, status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, JSON.stringify(obj));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > (limit || 200 * 1024)) {
        reject(new Error("Cuerpo demasiado grande"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch (e) { reject(new Error("JSON inválido")); }
    });
    req.on("error", reject);
  });
}

function isAuthed(req) {
  return (req.headers["x-admin-key"] || "") === ADMIN_KEY;
}

/* ---------- API ---------- */

async function handleApi(req, res, urlPath) {
  // Crear pedido (lo llama el checkout de la tienda — público)
  if (urlPath === "/api/pedidos" && req.method === "POST") {
    let body;
    try { body = await readBody(req); }
    catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }

    if (!body || !Array.isArray(body.items) || !body.items.length || !body.cliente) {
      return sendJSON(res, 400, { ok: false, error: "Pedido incompleto" });
    }

    const pedido = {
      id: genId(),
      fecha: new Date().toISOString(),
      estado: "nuevo",
      demo: false,
      cliente: {
        nombre: String(body.cliente.nombre || "").slice(0, 120),
        telefono: String(body.cliente.telefono || "").slice(0, 30),
        direccion: String(body.cliente.direccion || "").slice(0, 200),
        ciudad: String(body.cliente.ciudad || "").slice(0, 80),
        depto: String(body.cliente.depto || "").slice(0, 80),
        notas: String(body.cliente.notas || "").slice(0, 300),
      },
      items: body.items.slice(0, 40).map((i) => ({
        id: String(i.id || "").slice(0, 60),
        name: String(i.name || "").slice(0, 140),
        qty: Math.max(1, Math.min(99, parseInt(i.qty, 10) || 1)),
        price: Math.max(0, parseInt(i.price, 10) || 0),
        dropiId: i.dropiId ? String(i.dropiId).slice(0, 40) : null,
      })),
      subtotal: Math.max(0, parseInt(body.subtotal, 10) || 0),
      envio: Math.max(0, parseInt(body.envio, 10) || 0),
      total: Math.max(0, parseInt(body.total, 10) || 0),
      pago: String(body.pago || "").slice(0, 60),
    };

    if (DROPI.enabled) pedido.dropi = { estado: "pendiente" };

    // Pedido pagado en línea con Wompi: queda "pendiente de pago" y NO se
    // envía a Dropi todavía — eso lo dispara el webhook cuando el pago
    // quede APPROVED (ver /api/wompi/eventos).
    const esWompi = wompiActivo() && pedido.pago === "wompi" && pedido.total > 0;
    if (esWompi) pedido.pagoOnline = { metodo: "wompi", estado: "pendiente" };

    pedidos.push(pedido);
    savePedidos();

    // Reenvío automático a Dropi (no bloquea la respuesta a la clienta)
    if (DROPI.enabled && DROPI.autoSend && !esWompi) {
      dropiSendOrder(pedido).catch((e) => console.error("Dropi auto-send:", e.message));
    }

    if (esWompi) {
      const amountInCents = pedido.total * 100;
      const firma = crypto
        .createHash("sha256")
        .update(pedido.id + amountInCents + "COP" + WOMPI.integritySecret)
        .digest("hex");
      return sendJSON(res, 201, {
        ok: true,
        id: pedido.id,
        wompi: {
          publicKey: WOMPI.publicKey,
          currency: "COP",
          amountInCents: amountInCents,
          reference: pedido.id,
          signature: firma,
          redirectUrl: WOMPI.redirectBase + "/gracias.html?pedido=" + pedido.id,
        },
      });
    }

    return sendJSON(res, 201, { ok: true, id: pedido.id });
  }

  // ¿Está activo el pago online? (lo consulta el checkout — público)
  if (urlPath === "/api/wompi/config" && req.method === "GET") {
    return sendJSON(res, 200, { ok: true, enabled: wompiActivo() });
  }

  // Estado del pago de un pedido (lo consulta la página de gracias — público)
  const matchPago = urlPath.match(/^\/api\/pedidos\/([A-Za-z0-9-]+)\/pago$/);
  if (matchPago && req.method === "GET") {
    const pedido = pedidos.find((p) => p.id === matchPago[1]);
    if (!pedido) return sendJSON(res, 404, { ok: false, error: "Pedido no encontrado" });
    return sendJSON(res, 200, {
      ok: true,
      estado: pedido.pagoOnline ? pedido.pagoOnline.estado : "na",
    });
  }

  // Webhook de eventos de Wompi (público; validado con el secreto de eventos)
  if (urlPath === "/api/wompi/eventos" && req.method === "POST") {
    let body;
    try { body = await readBody(req); }
    catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }

    const trans = body && body.data && body.data.transaction;
    const sig = body && body.signature;
    if (!trans || !trans.reference || !sig || !Array.isArray(sig.properties)) {
      return sendJSON(res, 400, { ok: false, error: "Evento incompleto" });
    }

    // Verificación de autenticidad: SHA256(valores de properties + timestamp + secreto)
    if (WOMPI.eventsSecret) {
      const valor = (ruta) => ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), body.data);
      const concatenado = sig.properties.map((p) => String(valor(p))).join("");
      const esperado = crypto
        .createHash("sha256")
        .update(concatenado + body.timestamp + WOMPI.eventsSecret)
        .digest("hex");
      if (esperado !== sig.checksum) {
        return sendJSON(res, 401, { ok: false, error: "Firma del evento inválida" });
      }
    }

    const pedido = pedidos.find((p) => p.id === trans.reference);
    if (pedido) {
      const MAPA = { APPROVED: "aprobado", DECLINED: "rechazado", VOIDED: "anulado", ERROR: "error" };
      const estadoNuevo = MAPA[trans.status] || "pendiente";
      const yaAprobado = pedido.pagoOnline && pedido.pagoOnline.estado === "aprobado";
      pedido.pagoOnline = {
        metodo: "wompi",
        estado: estadoNuevo,
        transaccion: String(trans.id || "").slice(0, 80),
        fecha: new Date().toISOString(),
      };
      savePedidos();

      // Pago aprobado → el encargo sale hacia Dropi de una (idempotente)
      if (estadoNuevo === "aprobado" && !yaAprobado && DROPI.enabled) {
        const dropiYaEnviado = pedido.dropi && pedido.dropi.estado === "enviado";
        if (!dropiYaEnviado) {
          dropiSendOrder(pedido).catch((e) => console.error("Dropi tras pago Wompi:", e.message));
        }
      }
    }

    return sendJSON(res, 200, { ok: true });
  }

  // Todo lo demás requiere la clave del admin
  if (!isAuthed(req)) return sendJSON(res, 401, { ok: false, error: "Clave inválida" });

  // Listar pedidos
  if (urlPath === "/api/pedidos" && req.method === "GET") {
    return sendJSON(res, 200, { ok: true, pedidos: pedidos });
  }

  // Estado de la integración con Dropi (para el panel)
  if (urlPath === "/api/dropi/estado" && req.method === "GET") {
    return sendJSON(res, 200, {
      ok: true,
      enabled: DROPI.enabled,
      keySet: !!DROPI.key,
      autoSend: DROPI.autoSend,
      base: DROPI.base,
    });
  }

  // Estado de la integración con Wompi (para el panel)
  if (urlPath === "/api/wompi/estado" && req.method === "GET") {
    return sendJSON(res, 200, {
      ok: true,
      enabled: WOMPI.enabled,
      publicKeySet: !!WOMPI.publicKey,
      integritySecretSet: !!WOMPI.integritySecret,
      eventsSecretSet: !!WOMPI.eventsSecret,
      activo: wompiActivo(),
    });
  }

  // Enviar (o reintentar) un pedido hacia Dropi
  const matchDropi = urlPath.match(/^\/api\/pedidos\/([A-Za-z0-9-]+)\/dropi$/);
  if (matchDropi && req.method === "POST") {
    const pedido = pedidos.find((p) => p.id === matchDropi[1]);
    if (!pedido) return sendJSON(res, 404, { ok: false, error: "Pedido no encontrado" });
    const resultado = await dropiSendOrder(pedido);
    return sendJSON(res, resultado.ok ? 200 : 502, resultado);
  }

  // Cambiar estado de un pedido
  const matchEstado = urlPath.match(/^\/api\/pedidos\/([A-Za-z0-9-]+)$/);
  if (matchEstado && req.method === "PATCH") {
    let body;
    try { body = await readBody(req); }
    catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }
    const pedido = pedidos.find((p) => p.id === matchEstado[1]);
    if (!pedido) return sendJSON(res, 404, { ok: false, error: "Pedido no encontrado" });
    if (ESTADOS.indexOf(body.estado) === -1) return sendJSON(res, 400, { ok: false, error: "Estado inválido" });
    pedido.estado = body.estado;
    savePedidos();
    return sendJSON(res, 200, { ok: true });
  }

  // Sembrar pedidos de demostración (el panel envía el catálogo)
  if (urlPath === "/api/demo" && req.method === "POST") {
    let body;
    try { body = await readBody(req, 500 * 1024); }
    catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }
    const productos = Array.isArray(body.products) ? body.products : [];
    if (!productos.length) return sendJSON(res, 400, { ok: false, error: "Falta el catálogo" });

    const nombres = ["Laura Martínez", "Karen Rodríguez", "Daniela Pérez", "Valentina Gómez", "Mariana Torres", "Sofía Ramírez", "Camila Herrera", "Isabella Castro", "Luciana Vargas", "Gabriela Rojas"];
    const ciudades = [
      ["Villavicencio", "Meta"], ["Villavicencio", "Meta"], ["Villavicencio", "Meta"], ["Acacías", "Meta"],
      ["Bogotá", "Bogotá D.C."], ["Bogotá", "Bogotá D.C."], ["Medellín", "Antioquia"], ["Cali", "Valle del Cauca"],
      ["Granada", "Meta"], ["Barranquilla", "Atlántico"], ["Bucaramanga", "Santander"],
    ];
    const pagos = ["Nequi", "Nequi", "Daviplata", "Contraentrega", "Transferencia bancaria"];
    const nuevos = [];
    const cuantos = 32;

    for (let n = 0; n < cuantos; n++) {
      const diasAtras = Math.floor(Math.pow(Math.random(), 1.4) * 30);
      const fecha = new Date(Date.now() - diasAtras * 86400000 - Math.floor(Math.random() * 43200000));
      const numItems = 1 + Math.floor(Math.random() * 3);
      const items = [];
      const usados = {};
      for (let k = 0; k < numItems; k++) {
        const p = productos[Math.floor(Math.random() * productos.length)];
        if (usados[p.id]) continue;
        usados[p.id] = true;
        items.push({ id: p.id, name: p.name, qty: 1 + (Math.random() < 0.25 ? 1 : 0), price: p.price });
      }
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const lugar = ciudades[Math.floor(Math.random() * ciudades.length)];
      const envio = subtotal >= 150000 ? 0 : 12000;
      let estado;
      if (diasAtras > 8) estado = Math.random() < 0.9 ? "entregado" : "cancelado";
      else if (diasAtras > 3) estado = Math.random() < 0.6 ? "enviado" : "entregado";
      else estado = Math.random() < 0.5 ? "nuevo" : "confirmado";

      nuevos.push({
        id: genId() + n,
        fecha: fecha.toISOString(),
        estado: estado,
        demo: true,
        cliente: {
          nombre: nombres[Math.floor(Math.random() * nombres.length)],
          telefono: "3" + String(Math.floor(Math.random() * 90000000) + 10000000),
          direccion: "Calle " + (1 + Math.floor(Math.random() * 60)) + " # " + (1 + Math.floor(Math.random() * 40)) + "-" + (1 + Math.floor(Math.random() * 90)),
          ciudad: lugar[0],
          depto: lugar[1],
          notas: "",
        },
        items: items,
        subtotal: subtotal,
        envio: envio,
        total: subtotal + envio,
        pago: esVillavo ? pagos[Math.floor(Math.random() * pagos.length)] : pagos[Math.floor(Math.random() * 3)],
      });
    }

    pedidos = pedidos.concat(nuevos);
    savePedidos();
    return sendJSON(res, 201, { ok: true, creados: nuevos.length });
  }

  // Eliminar los pedidos de demostración
  if (urlPath === "/api/demo" && req.method === "DELETE") {
    const antes = pedidos.length;
    pedidos = pedidos.filter((p) => !p.demo);
    savePedidos();
    return sendJSON(res, 200, { ok: true, eliminados: antes - pedidos.length });
  }

  return sendJSON(res, 404, { ok: false, error: "Ruta no encontrada" });
}

/* ---------- Servidor ---------- */

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch (e) {
    return send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Solicitud inválida");
  }

  if (urlPath.startsWith("/api/")) {
    handleApi(req, res, urlPath).catch((e) => sendJSON(res, 500, { ok: false, error: e.message }));
    return;
  }

  if (urlPath === "/") urlPath = "/index.html";

  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Prohibido");
  }

  // La carpeta de datos y el propio servidor nunca se sirven al público
  const rel = path.relative(ROOT, filePath);
  if (rel === "server.js" || rel.split(path.sep)[0] === "data" || filePath.startsWith(DATA_DIR)) {
    return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "404 — No encontrado");
  }

  if (!path.extname(filePath) && fs.existsSync(filePath + ".html")) {
    filePath += ".html";
  }

  // Video: streaming con soporte de rangos (Safari/iOS exige respuestas 206 para reproducir)
  const extVideo = path.extname(filePath).toLowerCase();
  if (extVideo === ".mp4" || extVideo === ".webm") {
    return fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "404 — No encontrado");
      }
      const headers = {
        "Content-Type": MIME[extVideo],
        "Cache-Control": cacheControl(extVideo),
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": "bytes",
      };
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if (m && (m[1] || m[2])) {
        let start = m[1] ? parseInt(m[1], 10) : stat.size - parseInt(m[2], 10);
        let end = m[1] && m[2] ? parseInt(m[2], 10) : stat.size - 1;
        if (isNaN(start) || isNaN(end) || start < 0 || start > end || start >= stat.size) {
          headers["Content-Range"] = "bytes */" + stat.size;
          return send(res, 416, headers, "");
        }
        end = Math.min(end, stat.size - 1);
        headers["Content-Range"] = "bytes " + start + "-" + end + "/" + stat.size;
        headers["Content-Length"] = end - start + 1;
        res.writeHead(206, headers);
        return fs.createReadStream(filePath, { start: start, end: end }).pipe(res);
      }
      headers["Content-Length"] = stat.size;
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    });
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return fs.readFile(path.join(ROOT, "index.html"), (err2, home) => {
        if (err2) return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "404 — No encontrado");
        send(res, 404, { "Content-Type": "text/html; charset=utf-8" }, home);
      });
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const headers = {
      "Content-Type": type,
      "Cache-Control": cacheControl(ext),
      "X-Content-Type-Options": "nosniff",
    };

    const wantsGzip = (req.headers["accept-encoding"] || "").includes("gzip");
    const compressible = /^(text\/|application\/(javascript|json|xml))/.test(type) || ext === ".svg";

    if (wantsGzip && compressible) {
      zlib.gzip(data, (zErr, zipped) => {
        if (zErr) return send(res, 200, headers, data);
        headers["Content-Encoding"] = "gzip";
        send(res, 200, headers, zipped);
      });
    } else {
      send(res, 200, headers, data);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("✦ Rizos Ondea sirviendo en el puerto " + PORT);
  console.log("  Panel admin: /admin.html · Pedidos guardados en " + PEDIDOS_FILE);
});
