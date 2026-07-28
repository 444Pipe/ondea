# Rizos Ondea — Tienda online 🛒✦

E-commerce (HTML + CSS + JS + servidor Node sin dependencias) para **Rizos Ondea**, tienda
**curadora de marcas** para cabello rizado, ondulado y afro en **Villavicencio, Meta**, con
envíos a toda Colombia (modelo dropshipping: no fabrica, selecciona y revende marcas aliadas).
El checkout finaliza el pedido por **WhatsApp** (sin pasarela de pagos ni backend).

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio: hero animado, categorías, destacados, texturas, manifiesto, Instagram, newsletter, FAQ |
| `productos.html` | Catálogo con filtros (categoría, tipo de rizo, orden) |
| `producto.html?id=...` | Detalle de producto (beneficios, modo de uso, relacionados) |
| `carrito.html` | Carrito + checkout con envío calculado y pedido por WhatsApp |
| `test-capilar.html` | Test capilar interactivo: 5 preguntas → rutina recomendada |
| `blog.html` + `blog-*.html` | Blog SEO con 3 guías curly (definición, método curly, frizz) |
| `js/data.js` | **Configuración y catálogo** (aquí se edita todo) |
| `js/app.js` | Lógica: carrito, filtros, checkout, quiz, iconos SVG |
| `css/styles.css` | Estilos con la identidad del logo (chocolate + rosa) |
| `Statics/` | Logo + imágenes de marca generadas con IA (hero, Instagram) |
| `sitemap.xml`, `robots.txt` | SEO técnico |

## ⚙️ Antes de publicar (importante)

1. **Número de WhatsApp**: en [`js/data.js`](js/data.js), cambia
   `whatsapp: "573000000000"` por el número real (formato `57` + celular, sin `+`).
   También actualiza el teléfono visible en el footer de las 4 páginas HTML.
2. **Dominio**: cuando tengan dominio propio, reemplaza `https://www.rizosondea.com/`
   en las etiquetas `canonical`, `og:*`, JSON-LD, `sitemap.xml` y `robots.txt`.
3. **Productos**: el catálogo actual es **inventado** (demo). Edita `ONDEA_PRODUCTS`
   en `js/data.js`: nombres, precios, descripciones. Para usar fotos reales,
   reemplaza el arte SVG por `<img>` en las funciones de render de `js/app.js`.
4. **Costos de envío**: en `js/data.js` → `envioNacional`, `envioLocal`, `envioGratisDesde`.

## SEO incluido

- Titles y descriptions únicos por página, orientados a "productos para rizos
  Villavicencio / Colombia" y "método curly Colombia".
- JSON-LD: `Store` (negocio local en Villavicencio con `areaServed` Colombia),
  `FAQPage`, `ItemList` de productos y `WebSite`.
- Open Graph + geo tags (`geo.region CO-MET`), `lang="es-CO"`, sitemap y robots.
- Recomendado al publicar: crear el perfil de **Google Business Profile**
  (Villavicencio) y verificar el sitio en **Google Search Console** enviando el sitemap.

## Ver el sitio en local

Abre `index.html` en el navegador, o corre el mismo servidor de producción:

```
node server.js
# → http://localhost:3000
```

## 🛡️ Panel de administración

En **`/admin.html`** está el panel interno: pedidos que llegan de la tienda,
estadísticas (ventas, ganancia, ticket promedio), gráficas, gestión de estados
(nuevo → confirmado → enviado → entregado / cancelado), contabilidad por
producto y exportación a CSV.

- **Acceso**: hay un enlace "Admin" al final del footer de la tienda.
  Usuario por defecto `gamendo`, contraseña `amoapipe`. En producción puedes
  cambiarlos con las variables `ADMIN_USER` y `ADMIN_PASS` en Railway
  (*Variables*) — recomendado, porque los valores por defecto quedan visibles
  en el código del repositorio.
- **Cómo llegan los pedidos**: cuando una clienta finaliza el checkout, el
  pedido se guarda automáticamente en el servidor además de abrir WhatsApp.
- **Persistencia en Railway**: crea un **Volume** montado en `/data` y define
  la variable `DATA_DIR=/data`. Sin volumen, los pedidos se borran en cada
  redespliegue (el archivo vive en el sistema de archivos efímero).
- **Ganancia por producto**: se calcula con el campo `cost` de cada producto
  en `js/data.js` — actualízalo con tus costos reales.
- **Datos demo**: el botón "Cargar datos demo" siembra ~32 pedidos de ejemplo
  para ver el panel en acción; "Borrar demo" los elimina sin tocar los reales.

## 🚂 Desplegar en Railway

El proyecto ya incluye todo lo necesario: `server.js` (servidor estático sin
dependencias, con gzip y caché), `package.json` (comando `start`) y
`railway.json` (configuración de build y reinicio). Pasos:

1. Sube el repositorio a GitHub (ya está commiteado):
   ```
   git remote add origin https://github.com/TU-USUARIO/rizos-ondea.git
   git push -u origin main
   ```
2. Entra a [railway.com/new](https://railway.com/new) → **Deploy from GitHub repo**
   → elige el repo. Railway detecta Node y ejecuta `node server.js` solo.
3. En el servicio → **Settings → Networking → Generate Domain** para obtener la
   URL pública (`*.up.railway.app`).
4. (Opcional) Conecta el dominio propio en **Settings → Custom Domain** y
   actualiza las URLs `https://www.rizosondea.com/` del SEO (canonical, og,
   JSON-LD, `sitemap.xml`, `robots.txt`) con el dominio definitivo.

Cada `git push` a `main` redespliega automáticamente.
