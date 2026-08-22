/* ==========================================================================
   Rizos Ondea — Servidor para producción (Railway)
   Sirve el sitio estático, la API de la comunidad (guías paso a paso con
   fotos y videos que se suben desde el panel) y la API de pedidos.
   Sin dependencias: solo módulos nativos de Node.

   Variables de entorno:
   - PORT        → la inyecta Railway automáticamente.
   - ADMIN_USER  → usuario del panel admin (por defecto "gamendo").
   - ADMIN_PASS  → contraseña del panel admin (por defecto "amoapipe").
   - DATA_DIR    → carpeta de datos persistente. En Railway crea un Volume
                   montado en /data y define DATA_DIR=/data para que los
                   pedidos, las guías y las fotos/videos subidos sobrevivan
                   a los redespliegues.
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

/* Contenido de la comunidad: guías paso a paso con fotos y videos que se
   suben desde el panel admin, y el Club Ondea (correos suscritos).
   Los archivos subidos viven en DATA_DIR/uploads y se sirven en /media/… */
const CONTENIDO_FILE = path.join(DATA_DIR, "contenido.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MEDIA_MAX = 160 * 1024 * 1024; // 160 MB por archivo (videos de los pasos)
const MEDIA_EXT = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};

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
function buildDropiOrder(pedido, products, totalOrden, sufijo) {
  const partes = (pedido.cliente.nombre || "").trim().split(/\s+/);
  return {
    state: pedido.cliente.depto,
    city: pedido.cliente.ciudad,
    name: partes.slice(0, 1).join(" ") || "Cliente",
    surname: partes.slice(1).join(" ") || ".",
    dir: pedido.cliente.direccion,
    phone: pedido.cliente.telefono,
    payment_method_id: DROPI.paymentMethodId,
    total_order: totalOrden,
    notes: ("Pedido web " + pedido.id + (sufijo || "") + (pedido.cliente.notas ? " · " + pedido.cliente.notas : "")).slice(0, 250),
    products: products,
  };
}

/* Dropi maneja una orden (y un flete) por bodega: los ítems se agrupan por
   proveedor y se crea una orden por grupo. Los combos y packs ×2 llevan
   dropiItems con varios productos Dropi dentro de un mismo ítem. */
async function dropiSendOrder(pedido) {
  if (!DROPI.enabled || !DROPI.key) {
    return { ok: false, error: "Dropi no está configurado: define DROPI_ENABLED y DROPI_INTEGRATION_KEY en las variables de entorno." };
  }

  const grupos = {};
  pedido.items.forEach((i) => {
    const conDropi = i.dropiId || (Array.isArray(i.dropiItems) && i.dropiItems.length);
    if (!conDropi) return;
    const clave = i.proveedor || "principal";
    (grupos[clave] = grupos[clave] || []).push(i);
  });
  const claves = Object.keys(grupos);
  if (!claves.length) {
    return { ok: false, error: "Ningún producto de este pedido tiene dropiId. Agrégalo en js/data.js con el ID del catálogo de Dropi." };
  }

  const valorGrupo = (items) => items.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
  claves.sort((a, b) => valorGrupo(grupos[b]) - valorGrupo(grupos[a]));

  // Reintentos: las bodegas que ya tienen orden creada en Dropi no se
  // vuelven a enviar (evita duplicar órdenes cuando el envío fue parcial)
  const yaEnviadas = {};
  if (pedido.dropi && Array.isArray(pedido.dropi.ordenes)) {
    pedido.dropi.ordenes.forEach((o) => { if (o.ok) yaEnviadas[o.proveedor] = o; });
  }

  const ahora = new Date().toISOString();
  const ordenes = [];
  for (const clave of claves) {
    if (yaEnviadas[clave]) {
      ordenes.push(yaEnviadas[clave]);
      continue;
    }
    const items = grupos[clave];
    const products = [];
    items.forEach((i) => {
      if (Array.isArray(i.dropiItems) && i.dropiItems.length) {
        i.dropiItems.forEach((d) => products.push({ id: d.id, quantity: d.qty * i.qty }));
      } else {
        products.push({ id: i.dropiId, quantity: i.qty });
      }
    });
    // El envío que pagó la clienta se suma a la orden de mayor valor
    const total = valorGrupo(items) + (clave === claves[0] ? pedido.envio || 0 : 0);
    const sufijo = claves.length > 1 ? " · bodega " + clave : "";
    try {
      const r = await httpsJSON("POST", DROPI.base + "/orders/myorders", { "dropi-integration-key": DROPI.key }, buildDropiOrder(pedido, products, total, sufijo));
      const idDropi = (r.body && (r.body.id || (r.body.order && r.body.order.id) || (r.body.data && r.body.data.id))) || null;
      ordenes.push({ proveedor: clave, ok: r.status >= 200 && r.status < 300, status: r.status, id: idDropi, respuesta: r.body });
    } catch (e) {
      ordenes.push({ proveedor: clave, ok: false, error: e.message });
    }
  }

  const exitosas = ordenes.filter((o) => o.ok);
  pedido.dropi = {
    estado: exitosas.length === ordenes.length ? "enviado" : exitosas.length ? "parcial" : "error",
    fecha: ahora,
    id: exitosas.length ? exitosas[0].id : null,
    ordenes: ordenes,
  };
  savePedidos();
  if (pedido.dropi.estado === "enviado") return { ok: true, dropi: pedido.dropi };
  const fallas = ordenes.filter((o) => !o.ok).map((o) => o.proveedor + " → " + (o.error || "HTTP " + o.status)).join("; ");
  return { ok: false, error: "Dropi: " + fallas, detalle: pedido.dropi };
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

/* ---------- Contenido de la comunidad (guías paso a paso) ---------- */

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/* Guías de arranque: existen para que la comunidad no se vea vacía el
   primer día. Se editan y se borran desde el panel como cualquier otra. */
const GUIAS_SEMILLA = [
  {
    id: "primer-lavado-curly",
    titulo: "Tu primer lavado curly, paso a paso",
    resumen: "El día uno del método curly: cómo lavar, desenredar y secar sin romper tus rizos. Si nunca lo has hecho, empieza por aquí.",
    categoria: "rutina",
    textura: "todas",
    nivel: "principiante",
    duracion: "35 min",
    portada: "Statics/ig-rizos.webp",
    publicada: true,
    destacada: true,
    pasos: [
      { titulo: "Desenreda antes de mojar", texto: "Con el cabello seco y un poco de acondicionador o aceite, separa el pelo en cuatro secciones y desenreda con los dedos desde las puntas hacia la raíz. Nunca desde arriba: ahí es donde se rompe.", tip: "Si escuchas que el pelo truena, estás jalando de más." },
      { titulo: "Lava el cuero cabelludo, no las puntas", texto: "Moja bien y aplica shampoo solo en el cuero cabelludo, masajeando con las yemas de los dedos (nunca con las uñas) durante un minuto. Al enjuagar, la espuma limpia sola el resto del largo.", tip: "" },
      { titulo: "Acondiciona con el pelo lleno de agua", texto: "Con el cabello chorreando, aplica acondicionador de medios a puntas y desenreda con los dedos o un peine de dientes anchos. Déjalo actuar tres minutos mientras el rizo se forma solo.", tip: "" },
      { titulo: "Enjuaga con agua fría o tibia", texto: "El agua fría cierra la cutícula y deja el rizo más brillante. No te obsesiones con dejar el pelo chillón: un poco de deslizamiento significa que quedó hidratado.", tip: "" },
      { titulo: "Aplica producto con el pelo empapado", texto: "Crema para peinar primero, gel después, siempre con el cabello escurriendo agua. Aplica con la técnica de rezo (praying hands) y luego haz scrunch de puntas hacia el cuero cabelludo.", tip: "Producto sobre pelo seco es frizz. Sobre pelo mojado, definición." },
      { titulo: "Seca sin toalla de baño", texto: "Retira el exceso de agua apretando (nunca frotando) con una camiseta de algodón o una toalla de microfibra. Deja secar al aire o usa difusor en calor bajo, sin mover el rizo hasta que esté 80% seco.", tip: "El casquito duro del gel es buena señal: al final se rompe con las manos y queda el rizo suave." },
    ],
    tips: [
      "Los primeros lavados pueden verse raros: el cabello viene acostumbrado a siliconas y necesita 3 o 4 lavados para reaccionar.",
      "Toma fotos de cada lavado. En un mes vas a ver el cambio que hoy no notas.",
    ],
  },
  {
    id: "definir-rizos-sin-frizz",
    titulo: "Cómo definir tus rizos sin frizz",
    resumen: "Scrunch, plopping y casquito: las tres técnicas que hacen la diferencia entre un rizo definido y una nube de frizz.",
    categoria: "definicion",
    textura: "todas",
    nivel: "principiante",
    duracion: "20 min",
    portada: "Statics/ig-flatlay.webp",
    publicada: true,
    destacada: true,
    pasos: [
      { titulo: "Trabaja siempre con el pelo empapado", texto: "La definición se decide con el agua, no con el producto. Si el cabello se secó mientras aplicabas, vuelve a mojar esa sección con un atomizador.", tip: "" },
      { titulo: "Praying hands", texto: "Reparte el producto entre las palmas y deslízalo por la sección de cabello como si estuvieras rezando, de raíz a puntas. Así el producto cubre parejo sin abrir el rizo.", tip: "" },
      { titulo: "Scrunch de puntas a raíz", texto: "Toma el cabello desde las puntas y empújalo hacia el cuero cabelludo con la mano en forma de copa, apretando suave. Vas a escuchar el sonido del agua con el gel: eso es lo que forma el resorte.", tip: "" },
      { titulo: "Plopping 15 minutos", texto: "Envuelve el cabello en una camiseta de algodón sobre la cabeza y déjalo reposar. El rizo se acomoda hacia arriba, se quita el exceso de agua y el largo no se estira con su propio peso.", tip: "Más de 25 minutos y el pelo queda demasiado húmedo: se demora el doble en secar." },
      { titulo: "No lo toques hasta que esté seco", texto: "Cada vez que metes la mano en el pelo mojado rompes la forma del rizo y sale frizz. Deja secar al aire o con difusor sin manipular.", tip: "" },
      { titulo: "Rompe el casquito", texto: "Cuando esté 100% seco, frota un poco de aceite entre las manos y haz scrunch para romper la capa dura del gel. Queda rizo definido y suave al tacto.", tip: "" },
    ],
    tips: [
      "El frizz casi siempre es cabello deshidratado, o cabello tocado en el momento equivocado.",
      "Si vives en clima húmedo (Villavicencio, la costa, el Eje), usa gel de fijación fuerte: ahí el frizz no perdona.",
    ],
  },
  {
    id: "hidratacion-semanal-rizos-secos",
    titulo: "Hidratación semanal para rizos resecos",
    resumen: "La mascarilla que le devuelve elasticidad al rizo quebradizo, y cómo saber si lo que tu pelo necesita es hidratación o proteína.",
    categoria: "cuidado",
    textura: "todas",
    nivel: "intermedio",
    duracion: "45 min",
    portada: "Statics/ig-afro.webp",
    publicada: true,
    destacada: false,
    pasos: [
      { titulo: "Haz la prueba del rizo estirado", texto: "Toma un rizo mojado y estíralo suave. Si se estira mucho y no vuelve, le falta proteína. Si se rompe de una, le falta hidratación. Esa respuesta define tu tratamiento de la semana.", tip: "" },
      { titulo: "Aplica sobre cabello limpio y húmedo", texto: "Después del shampoo, retira el exceso de agua y aplica la mascarilla mechón por mechón, de medios a puntas. La raíz no la necesita.", tip: "" },
      { titulo: "Calor suave por 20 minutos", texto: "Cubre con un gorro plástico y envuelve con una toalla. El calor de tu propia cabeza abre la cutícula y deja entrar el tratamiento. Si tienes vaporizador, mejor.", tip: "" },
      { titulo: "Enjuaga a fondo", texto: "Enjuaga con agua tibia hasta que el pelo deje de sentirse pesado. Un tratamiento mal enjuagado apelmaza el rizo y lo deja sin volumen.", tip: "" },
      { titulo: "Sigue con tu rutina normal", texto: "Acondicionador, crema y gel como cualquier día. Vas a notar el rizo más pesado, brillante y con el resorte de vuelta.", tip: "Una vez por semana es suficiente: hidratar de más también rompe el pelo." },
    ],
    tips: [
      "Rizos porosos (se mojan rápido y se secan rápido) necesitan sellar con aceite después de hidratar.",
      "Si tu pelo está teñido o decolorado, alterna hidratación una semana y proteína la siguiente.",
    ],
  },
  {
    id: "refrescar-rizos-segundo-dia",
    titulo: "Refresca tus rizos al segundo (y tercer) día",
    resumen: "No hay que lavarse todos los días. Así se revive el rizo aplastado de la mañana siguiente, en cinco minutos.",
    categoria: "estilos",
    textura: "todas",
    nivel: "principiante",
    duracion: "10 min",
    portada: "Statics/hero-poster.jpg",
    publicada: true,
    destacada: false,
    pasos: [
      { titulo: "Duerme cuidando el rizo", texto: "Piña alta con scrunchie de satén, o gorro y funda de satén. El algodón absorbe la humedad del pelo y aplasta la forma mientras duermes.", tip: "" },
      { titulo: "Humedece, no empapes", texto: "Con un atomizador de agua (opcional: una cucharadita de acondicionador dentro) rocía sección por sección hasta que el rizo se vuelva a sentir elástico.", tip: "" },
      { titulo: "Scrunch de nuevo", texto: "Aprieta con la mano en copa, de puntas a raíz. El rizo vuelve a acomodarse sin necesidad de producto nuevo.", tip: "" },
      { titulo: "Levanta la raíz", texto: "Con los dedos abiertos, mueve suavemente el cuero cabelludo para devolver volumen. Si quedaron zonas muy aplastadas, un poco de gel diluido solo ahí.", tip: "Refrescar gasta menos producto y menos tiempo que lavar: tu rizo y tu bolsillo lo agradecen." },
    ],
    tips: ["Si al tercer día ya no responde, es señal de acumulación: toca lavado profundo."],
  },
];

let contenido = { guias: [], suscriptores: [] };
try {
  const crudo = JSON.parse(fs.readFileSync(CONTENIDO_FILE, "utf8"));
  contenido.guias = Array.isArray(crudo.guias) ? crudo.guias : [];
  contenido.suscriptores = Array.isArray(crudo.suscriptores) ? crudo.suscriptores : [];
} catch (e) {
  const ahora = new Date().toISOString();
  contenido = {
    guias: GUIAS_SEMILLA.map((g, i) => Object.assign({}, g, { orden: i, creada: ahora, actualizada: ahora })),
    suscriptores: [],
  };
}

let contenidoChain = Promise.resolve();
function saveContenido() {
  contenidoChain = contenidoChain
    .then(() => fs.promises.writeFile(CONTENIDO_FILE, JSON.stringify(contenido, null, 2)))
    .catch((e) => console.error("Error guardando contenido:", e.message));
}
if (!fs.existsSync(CONTENIDO_FILE)) saveContenido();

function txt(v, max) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
}

function parrafo(v, max) {
  return String(v == null ? "" : v).replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, max);
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function slugUnico(base, idActual) {
  const raiz = slugify(base) || "guia";
  let slug = raiz;
  let n = 2;
  while (contenido.guias.some((g) => g.id === slug && g.id !== idActual)) {
    slug = raiz.slice(0, 55) + "-" + n++;
  }
  return slug;
}

/* Solo se aceptan rutas internas: archivos subidos (/media/…) o del propio
   sitio (Statics/…). Así el panel nunca termina incrustando enlaces externos. */
function rutaMedia(v) {
  const s = txt(v, 300);
  if (!s || s.indexOf("..") !== -1) return "";
  if (s.indexOf("/media/") === 0 || s.indexOf("Statics/") === 0) return s;
  return "";
}

const CATEGORIAS = ["rutina", "definicion", "cuidado", "transicion", "estilos", "herramientas"];
const TEXTURAS = ["todas", "ondulada", "rizada", "afro"];
const NIVELES = ["principiante", "intermedio", "avanzado"];

function normalizarGuia(body, existente) {
  const ahora = new Date().toISOString();
  const titulo = txt(body.titulo, 120) || "Guía sin título";
  return {
    id: existente ? existente.id : slugUnico(titulo),
    titulo: titulo,
    resumen: parrafo(body.resumen, 400),
    categoria: CATEGORIAS.indexOf(body.categoria) !== -1 ? body.categoria : "rutina",
    textura: TEXTURAS.indexOf(body.textura) !== -1 ? body.textura : "todas",
    nivel: NIVELES.indexOf(body.nivel) !== -1 ? body.nivel : "principiante",
    duracion: txt(body.duracion, 40),
    portada: rutaMedia(body.portada),
    video: rutaMedia(body.video),
    publicada: body.publicada !== false,
    destacada: !!body.destacada,
    orden: existente ? existente.orden : contenido.guias.length,
    creada: existente ? existente.creada : ahora,
    actualizada: ahora,
    pasos: (Array.isArray(body.pasos) ? body.pasos : []).slice(0, 25).map((p) => ({
      titulo: txt(p.titulo, 120),
      texto: parrafo(p.texto, 1500),
      imagen: rutaMedia(p.imagen),
      video: rutaMedia(p.video),
      tip: parrafo(p.tip, 300),
    })).filter((p) => p.titulo || p.texto || p.imagen || p.video),
    tips: (Array.isArray(body.tips) ? body.tips : []).slice(0, 10)
      .map((t) => parrafo(t, 300)).filter(Boolean),
  };
}

function guiasPublicas() {
  return contenido.guias
    .filter((g) => g.publicada)
    .slice()
    .sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(b.creada).localeCompare(String(a.creada)));
}

/* ---------- Archivos subidos desde el panel ---------- */

function nombreArchivo(original, tipoMime) {
  const nombreBase = String(original || "archivo");
  let ext = path.extname(nombreBase).toLowerCase();
  if (!MEDIA_EXT[ext]) {
    ext = Object.keys(MEDIA_EXT).find((e) => MEDIA_EXT[e] === tipoMime) || "";
  }
  if (!MEDIA_EXT[ext]) return null;
  const base = slugify(path.basename(nombreBase, path.extname(nombreBase))) || "archivo";
  return base.slice(0, 40) + "-" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex") + ext;
}

/* Subida directa: el cuerpo de la petición son los bytes del archivo tal cual
   (sin multipart) y se escriben en disco a medida que llegan, para que un
   video de 100 MB no tenga que caber en memoria. */
function guardarMedia(req, nombre) {
  return new Promise((resolve, reject) => {
    const destino = path.join(UPLOADS_DIR, nombre);
    const salida = fs.createWriteStream(destino);
    let size = 0;
    let abortado = false;
    const fallar = (msg) => {
      if (abortado) return;
      abortado = true;
      salida.destroy();
      fs.unlink(destino, () => {});
      req.destroy();
      reject(new Error(msg));
    };
    req.on("data", (c) => {
      size += c.length;
      if (size > MEDIA_MAX) fallar("El archivo pesa más de " + Math.round(MEDIA_MAX / 1048576) + " MB");
    });
    req.on("error", () => fallar("Se cortó la subida"));
    salida.on("error", () => fallar("No se pudo guardar el archivo"));
    salida.on("finish", () => {
      if (abortado) return;
      if (!size) {
        fs.unlink(destino, () => {});
        return reject(new Error("El archivo llegó vacío"));
      }
      resolve({ nombre: nombre, url: "/media/" + nombre, bytes: size });
    });
    req.pipe(salida);
  });
}

function listarMedia() {
  let archivos = [];
  try { archivos = fs.readdirSync(UPLOADS_DIR); } catch (e) { return []; }
  return archivos
    .filter((f) => MEDIA_EXT[path.extname(f).toLowerCase()])
    .map((f) => {
      let stat = null;
      try { stat = fs.statSync(path.join(UPLOADS_DIR, f)); } catch (e) {}
      return {
        nombre: f,
        url: "/media/" + f,
        bytes: stat ? stat.size : 0,
        fecha: stat ? stat.mtime.toISOString() : null,
        tipo: (MEDIA_EXT[path.extname(f).toLowerCase()] || "").split("/")[0],
      };
    })
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

function mediaEnUso(nombre) {
  const url = "/media/" + nombre;
  return contenido.guias.some((g) =>
    g.portada === url || g.video === url ||
    (g.pasos || []).some((p) => p.imagen === url || p.video === url)
  );
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
        dropiItems: Array.isArray(i.dropiItems)
          ? i.dropiItems.slice(0, 10).map((d) => ({
              id: String(d.id || "").slice(0, 40),
              qty: Math.max(1, Math.min(99, parseInt(d.qty, 10) || 1)),
            }))
          : null,
        proveedor: i.proveedor ? String(i.proveedor).slice(0, 40) : null,
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

  // Guías publicadas (las lee la comunidad — público)
  if (urlPath === "/api/guias" && req.method === "GET") {
    return sendJSON(res, 200, { ok: true, guias: guiasPublicas() });
  }

  // Club Ondea: alguien deja su correo para recibir las guías nuevas (público)
  if (urlPath === "/api/suscriptores" && req.method === "POST") {
    let body;
    try { body = await readBody(req, 4 * 1024); }
    catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }
    const email = txt(body && body.email, 140).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      return sendJSON(res, 400, { ok: false, error: "Correo inválido" });
    }
    if (!contenido.suscriptores.some((s) => s.email === email)) {
      contenido.suscriptores.push({ email: email, fecha: new Date().toISOString() });
      saveContenido();
    }
    return sendJSON(res, 201, { ok: true });
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
      const esVillavo = lugar[0] === "Villavicencio";
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

  /* ---------- Panel: guías paso a paso ---------- */

  // Todas las guías, publicadas y borradores
  if (urlPath === "/api/admin/guias" && req.method === "GET") {
    return sendJSON(res, 200, {
      ok: true,
      guias: contenido.guias.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    });
  }

  // Crear una guía nueva
  if (urlPath === "/api/admin/guias" && req.method === "POST") {
    let body;
    try { body = await readBody(req, 400 * 1024); }
    catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }
    const guia = normalizarGuia(body, null);
    contenido.guias.push(guia);
    saveContenido();
    return sendJSON(res, 201, { ok: true, guia: guia });
  }

  // Reordenar las guías (el panel manda los ids en el orden deseado)
  if (urlPath === "/api/admin/guias/orden" && req.method === "POST") {
    let body;
    try { body = await readBody(req, 20 * 1024); }
    catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }
    const ids = Array.isArray(body.ids) ? body.ids : [];
    ids.forEach((id, i) => {
      const g = contenido.guias.find((x) => x.id === id);
      if (g) g.orden = i;
    });
    saveContenido();
    return sendJSON(res, 200, { ok: true });
  }

  const matchGuia = urlPath.match(/^\/api\/admin\/guias\/([a-z0-9-]+)$/);

  // Editar una guía existente
  if (matchGuia && req.method === "PUT") {
    let body;
    try { body = await readBody(req, 400 * 1024); }
    catch (e) { return sendJSON(res, 400, { ok: false, error: e.message }); }
    const i = contenido.guias.findIndex((g) => g.id === matchGuia[1]);
    if (i === -1) return sendJSON(res, 404, { ok: false, error: "Guía no encontrada" });
    contenido.guias[i] = normalizarGuia(body, contenido.guias[i]);
    saveContenido();
    return sendJSON(res, 200, { ok: true, guia: contenido.guias[i] });
  }

  // Borrar una guía
  if (matchGuia && req.method === "DELETE") {
    const antes = contenido.guias.length;
    contenido.guias = contenido.guias.filter((g) => g.id !== matchGuia[1]);
    if (contenido.guias.length === antes) return sendJSON(res, 404, { ok: false, error: "Guía no encontrada" });
    saveContenido();
    return sendJSON(res, 200, { ok: true });
  }

  /* ---------- Panel: fotos y videos ---------- */

  // Subir un archivo: el cuerpo son los bytes y el nombre viene en la cabecera
  if (urlPath === "/api/admin/media" && req.method === "POST") {
    const nombre = nombreArchivo(
      decodeURIComponent(req.headers["x-nombre-archivo"] || ""),
      String(req.headers["content-type"] || "").split(";")[0].trim()
    );
    if (!nombre) {
      req.resume();
      return sendJSON(res, 400, { ok: false, error: "Formato no permitido. Usa JPG, PNG, WEBP, GIF, MP4, WEBM o MOV." });
    }
    try {
      const archivo = await guardarMedia(req, nombre);
      return sendJSON(res, 201, { ok: true, archivo: archivo });
    } catch (e) {
      return sendJSON(res, 413, { ok: false, error: e.message });
    }
  }

  // Biblioteca de archivos subidos
  if (urlPath === "/api/admin/media" && req.method === "GET") {
    return sendJSON(res, 200, { ok: true, archivos: listarMedia() });
  }

  // Borrar un archivo (solo si ninguna guía lo está usando)
  const matchMedia = urlPath.match(/^\/api\/admin\/media\/([A-Za-z0-9._-]+)$/);
  if (matchMedia && req.method === "DELETE") {
    const nombre = path.basename(matchMedia[1]);
    if (!MEDIA_EXT[path.extname(nombre).toLowerCase()]) {
      return sendJSON(res, 400, { ok: false, error: "Archivo inválido" });
    }
    if (mediaEnUso(nombre)) {
      return sendJSON(res, 409, { ok: false, error: "Este archivo lo está usando una guía. Quítalo de la guía primero." });
    }
    try { fs.unlinkSync(path.join(UPLOADS_DIR, nombre)); }
    catch (e) { return sendJSON(res, 404, { ok: false, error: "El archivo ya no existe" }); }
    return sendJSON(res, 200, { ok: true });
  }

  // Club Ondea: correos suscritos
  if (urlPath === "/api/admin/suscriptores" && req.method === "GET") {
    return sendJSON(res, 200, {
      ok: true,
      suscriptores: contenido.suscriptores.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    });
  }

  return sendJSON(res, 404, { ok: false, error: "Ruta no encontrada" });
}

/* ---------- Servidor ---------- */

/* Entrega un archivo con soporte de rangos: Safari e iOS exigen respuestas
   206 para reproducir video, y así los videos largos empiezan de inmediato. */
function serveConRangos(req, res, filePath, mime, cache) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "404 — No encontrado");
    }
    const headers = {
      "Content-Type": mime,
      "Cache-Control": cache,
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

  // Sitemap: a las páginas fijas se les suman las guías publicadas, para que
  // Google encuentre cada paso a paso nuevo sin tocar el archivo a mano
  if (urlPath === "/sitemap.xml") {
    return fs.readFile(path.join(ROOT, "sitemap.xml"), "utf8", (err, base) => {
      if (err) return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "404 — No encontrado");
      const urls = guiasPublicas().map((g) => {
        const fecha = String(g.actualizada || "").slice(0, 10);
        return "  <url>\n" +
          "    <loc>https://www.rizosondea.com/guia.html?id=" + g.id + "</loc>\n" +
          (/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? "    <lastmod>" + fecha + "</lastmod>\n" : "") +
          "    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n";
      }).join("");
      send(res, 200, { "Content-Type": MIME[".xml"], "Cache-Control": "no-cache" }, base.replace("</urlset>", urls + "</urlset>"));
    });
  }

  // Fotos y videos subidos desde el panel: viven en DATA_DIR/uploads, fuera
  // del repositorio, y se sirven en /media/<archivo>
  if (urlPath.indexOf("/media/") === 0) {
    const nombre = urlPath.slice("/media/".length);
    const ext = path.extname(nombre).toLowerCase();
    if (!MEDIA_EXT[ext] || nombre !== path.basename(nombre)) {
      return send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "404 — No encontrado");
    }
    return serveConRangos(req, res, path.join(UPLOADS_DIR, nombre), MEDIA_EXT[ext], "public, max-age=604800");
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

  // Video del sitio: streaming con soporte de rangos
  const extVideo = path.extname(filePath).toLowerCase();
  if (extVideo === ".mp4" || extVideo === ".webm") {
    return serveConRangos(req, res, filePath, MIME[extVideo], cacheControl(extVideo));
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
  console.log("  Panel admin: /admin.html");
  console.log("  Guías y Club Ondea: " + CONTENIDO_FILE + " · fotos y videos: " + UPLOADS_DIR);
  console.log("  Pedidos: " + PEDIDOS_FILE);
});
