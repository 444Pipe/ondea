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
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "gamendo";
const ADMIN_PASS = process.env.ADMIN_PASS || "amoapipe";
const ADMIN_KEY = ADMIN_USER + ":" + ADMIN_PASS; // el panel envía "usuario:contraseña"
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const PEDIDOS_FILE = path.join(DATA_DIR, "pedidos.json");

const ESTADOS = ["nuevo", "confirmado", "enviado", "entregado", "cancelado"];

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
      })),
      subtotal: Math.max(0, parseInt(body.subtotal, 10) || 0),
      envio: Math.max(0, parseInt(body.envio, 10) || 0),
      total: Math.max(0, parseInt(body.total, 10) || 0),
      pago: String(body.pago || "").slice(0, 60),
    };

    pedidos.push(pedido);
    savePedidos();
    return sendJSON(res, 201, { ok: true, id: pedido.id });
  }

  // Todo lo demás requiere la clave del admin
  if (!isAuthed(req)) return sendJSON(res, 401, { ok: false, error: "Clave inválida" });

  // Listar pedidos
  if (urlPath === "/api/pedidos" && req.method === "GET") {
    return sendJSON(res, 200, { ok: true, pedidos: pedidos });
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
      const esVillavo = lugar[0] === "Villavicencio";
      const envio = subtotal >= 150000 ? 0 : (esVillavo ? 6000 : 12000);
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
