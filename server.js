/* ==========================================================================
   Rizos Ondea — Servidor estático para producción (Railway)
   Sin dependencias: usa solo módulos nativos de Node.
   Railway inyecta la variable PORT automáticamente.
   ========================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

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

// Los HTML se revalidan siempre; los assets (imágenes, css, js) se cachean 7 días.
function cacheControl(ext) {
  return ext === ".html" ? "no-cache" : "public, max-age=604800";
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch (e) {
    return send(res, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Solicitud inválida");
  }

  if (urlPath === "/") urlPath = "/index.html";

  // Bloquea intentos de salirse de la carpeta del sitio (path traversal)
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Prohibido");
  }

  // URLs limpias: /productos → productos.html
  if (!path.extname(filePath) && fs.existsSync(filePath + ".html")) {
    filePath += ".html";
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 404: devuelve la portada para no dejar al visitante en un callejón
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
});
