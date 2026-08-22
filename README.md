# Rizos Ondea — Comunidad curly ✦

Sitio (HTML + CSS + JS + servidor Node sin dependencias) de **Rizos Ondea**: un espacio
colombiano para **aprender a amar tus rizos**. El corazón del sitio son las **guías paso a
paso** — cada paso con su foto o su video — que se publican desde el panel admin, más el
test capilar, los artículos y la comunidad. La **tienda de kits queda en segundo plano**:
sigue funcionando (catálogo, carrito, checkout, Dropi, Wompi) pero ya no es el foco.

> El sitio **no publica ningún número de teléfono** ni botón de WhatsApp: el contacto
> público es el correo `hola@rizosondea.com` e Instagram `@rizosondea`.

## 📚 Guías paso a paso (lo principal)

Las guías viven en el servidor, no en el código: se crean y se editan desde
**`/admin.html` → Guías**.

- **Crear una guía**: título, resumen, tema, textura, nivel, duración, portada y —
  opcional — un video de la guía completa.
- **Pasos**: se agregan, se reordenan (↑ ↓) y se borran. Cada paso lleva título,
  explicación, **una foto y/o un video subidos desde el computador o el celular**, y un tip.
- **Publicada / Borrador**: mientras esté en borrador nadie la ve. Al publicarla aparece
  de inmediato en `/guias.html` y en la portada.
- **Destacada**: la sube a las tres guías que salen en el inicio.
- **Tips finales**: la lista de consejos que cierra la guía.

Las fotos y los videos se guardan en `DATA_DIR/uploads` y se sirven en `/media/<archivo>`
(con soporte de rangos, para que los videos arranquen al instante en iPhone y Android).
Límite: **160 MB por archivo**; formatos JPG, PNG, WEBP, GIF, MP4, WEBM y MOV.

> ⚠️ **Importante en Railway**: sin un *Volume* montado en `/data` (y `DATA_DIR=/data`),
> las guías, los archivos subidos, los pedidos y los correos del Club Ondea **se borran en
> cada redespliegue**. Ver "Persistencia" más abajo.

La primera vez que arranca, el servidor siembra 4 guías de arranque (primer lavado,
definición sin frizz, hidratación semanal y refresco del segundo día) para que la
comunidad no se vea vacía. Se editan o se borran como cualquier otra.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio comunidad: hero, pilares, guías destacadas, rutina básica, comunidad, tips, FAQ, Club Ondea y — al final — la tienda |
| `guias.html` | Listado de guías con filtros por tema y por textura |
| `guia.html?id=...` | Una guía con sus pasos, fotos y videos |
| `test-capilar.html` | Test capilar: 5 preguntas → textura + guías recomendadas |
| `blog.html` + `blog-*.html` | Artículos largos (definición, método curly, frizz) |
| `productos.html` | Catálogo de kits con filtros |
| `producto.html?id=...` | Detalle de un kit |
| `carrito.html` | Carrito + checkout (el pedido se confirma en la web, sin apps externas) |
| `admin.html` | Panel: **Guías**, Club Ondea, Pedidos, Contabilidad, Productos |
| `js/app.js` | Lógica del sitio: guías, carrito, filtros, quiz, iconos SVG |
| `js/admin-guias.js` | Editor de guías del panel (subida de fotos y videos) |
| `js/data.js` | Configuración y catálogo de kits |
| `css/styles.css` · `css/admin.css` | Estilos del sitio y del panel |
| `Statics/` | Logo e imágenes de marca |
| `sitemap.xml`, `robots.txt` | SEO técnico (las guías se añaden al sitemap solas) |

## 🛡️ Panel de administración

En **`/admin.html`** (enlace discreto al final del footer):

- **Guías** — crear, editar, reordenar, publicar y borrar guías; subir fotos y videos.
- **Club Ondea** — correos suscritos desde el sitio, con exportación a CSV.
- **Pedidos** — los pedidos de la tienda, con cambio de estado y envío a Dropi.
- **Contabilidad** y **Productos** — ganancia, margen bruto y neto por kit.

**Acceso**: usuario `gamendo`, contraseña `amoapipe` por defecto. En producción cámbialos
con `ADMIN_USER` y `ADMIN_PASS` en Railway → *Variables* (recomendado: los valores por
defecto están en el repositorio).

### Persistencia (Railway)

Crea un **Volume** montado en `/data` y define `DATA_DIR=/data`. Ahí se guardan:

| Archivo | Contenido |
|---|---|
| `contenido.json` | Guías y correos del Club Ondea |
| `uploads/` | Fotos y videos subidos desde el panel |
| `pedidos.json` | Pedidos de la tienda |

## API

| Ruta | Acceso | Para qué |
|---|---|---|
| `GET /api/guias` | público | Guías publicadas (las lee el sitio) |
| `POST /api/suscriptores` | público | Alta en el Club Ondea |
| `GET /media/<archivo>` | público | Fotos y videos de las guías |
| `GET/POST /api/admin/guias` | clave admin | Listar (con borradores) y crear |
| `PUT/DELETE /api/admin/guias/:id` | clave admin | Editar y borrar |
| `POST /api/admin/guias/orden` | clave admin | Reordenar |
| `POST/GET /api/admin/media` | clave admin | Subir archivo (bytes crudos) y listar |
| `DELETE /api/admin/media/:archivo` | clave admin | Borrar (falla si una guía lo usa) |
| `GET /api/admin/suscriptores` | clave admin | Correos del Club Ondea |

Las rutas de admin se autentican con la cabecera `x-admin-key: usuario:contraseña`.

## 🔌 Integración con Dropi

El servidor trae un módulo listo para enviar pedidos al proveedor de dropshipping
[Dropi](https://dropi.co). Está **desactivado por defecto**; para activarlo:

1. Crea la cuenta en Dropi y genera la llave en **Integraciones** del panel de Dropi.
2. En Railway → *Variables* define:
   - `DROPI_ENABLED=true`
   - `DROPI_INTEGRATION_KEY=<tu llave>`
   - `DROPI_API_BASE=<URL base de la API — usa primero la URL del ambiente de PRUEBAS
     que indica la documentación oficial de tu cuenta>`
   - `DROPI_PAYMENT_METHOD_ID=<id del método de pago contraentrega en tu cuenta>`
   - `DROPI_AUTO_SEND=true` (opcional: reenvía cada pedido automáticamente; si lo omites,
     los envías uno a uno con el botón "→ Dropi" del panel admin).
3. En `js/data.js` agrega a cada producto real su `dropiId` (el ID del producto en el
   catálogo de Dropi). Sin `dropiId`, el pedido no se puede reenviar.
4. El formato del cuerpo que se envía a Dropi (`POST /orders/myorders`, header
   `dropi-integration-key`) está centralizado en la función `buildDropiOrder()` de
   [`server.js`](server.js): si la documentación oficial de tu cuenta usa nombres de campo
   distintos, ajústalos solo ahí.
5. En el panel admin (Resumen) verás el estado de la conexión, y en Pedidos una columna
   Dropi con el botón de envío/reintento y el ID devuelto por Dropi.

## 💳 Pasarela de pagos Wompi

El checkout trae integrado el **Web Checkout de Wompi** (tarjeta, PSE, Nequi,
botón Bancolombia). Está **desactivado por defecto** — la opción "Pago online
seguro" ni siquiera aparece en el carrito hasta activarlo:

1. Crea la cuenta en [Wompi](https://wompi.co) y copia de **Desarrolladores** las llaves.
2. En Railway → *Variables* define:
   - `WOMPI_ENABLED=true`
   - `WOMPI_PUBLIC_KEY=<llave pública>` (usa `pub_test_…` para probar, `pub_prod_…` en vivo)
   - `WOMPI_INTEGRITY_SECRET=<secreto de integridad>`
   - `WOMPI_EVENTS_SECRET=<secreto de eventos>`
3. En el panel de Wompi → **Desarrolladores → URL de eventos** registra:
   `https://www.rizosondea.com/api/wompi/eventos`
4. Flujo completo, ya cableado:
   - La clienta elige "Pago online seguro (Wompi)" → el pedido se crea con pago
     *pendiente* y se la redirige al checkout de Wompi (monto firmado con el
     secreto de integridad — nadie puede alterar el precio).
   - Wompi le cobra y la devuelve a `gracias.html`, que muestra el resultado.
   - El **webhook** `/api/wompi/eventos` (firma verificada) marca el pedido como
     `aprobado` / `rechazado` y, si quedó aprobado, **lo envía a Dropi
     automáticamente** — sin intervención manual.
   - Los pedidos Wompi NO usan `DROPI_AUTO_SEND`: solo viajan a Dropi cuando el
     pago está aprobado.
5. Verifica la configuración en `GET /api/wompi/estado` (con la clave de admin).

Los demás métodos (Nequi, Daviplata, transferencia, contraentrega) registran el pedido en
el panel y muestran la confirmación con el número de pedido en la misma página.

## SEO incluido

- Titles y descriptions únicos por página, orientados a "aprender a cuidar rizos",
  "guías método curly" y "comunidad curly Colombia".
- JSON-LD: `Organization` (sin teléfono), `FAQPage` de la comunidad, `ItemList` de
  productos y `WebSite`.
- Open Graph, `lang="es-CO"`, robots y **sitemap dinámico**: `/sitemap.xml` toma las
  páginas fijas del archivo y le suma cada guía publicada con su `lastmod`.
- Recomendado al publicar: verificar el sitio en **Google Search Console** y enviar el
  sitemap.

## ⚙️ Antes de publicar

1. **Dominio**: si cambia, reemplaza `https://www.rizosondea.com/` en `canonical`,
   `og:*`, JSON-LD, `sitemap.xml` y `robots.txt`.
2. **Volume en Railway**: sin él se pierden guías y archivos subidos en cada deploy.
3. **Claves del panel**: cambia `ADMIN_USER` y `ADMIN_PASS`.
4. **Costos de envío** de la tienda: en `js/data.js` → `envioNacional`, `envioLocal`,
   `envioGratisDesde`.

## Ver el sitio en local

```
node server.js
# → http://localhost:3000
```

Las guías necesitan el servidor (leen `/api/guias`), así que ábrelo por `http://localhost`
y no como archivo suelto.

## 🚂 Desplegar en Railway

El proyecto ya incluye todo lo necesario: `server.js` (servidor sin dependencias, con gzip,
caché y streaming de video), `package.json` (comando `start`) y `railway.json`. Pasos:

1. Sube el repositorio a GitHub:
   ```
   git push origin main
   ```
2. Entra a [railway.com/new](https://railway.com/new) → **Deploy from GitHub repo**
   → elige el repo. Railway detecta Node y ejecuta `node server.js` solo.
3. En el servicio → **Settings → Networking → Generate Domain** para obtener la
   URL pública (`*.up.railway.app`).
4. **Settings → Volumes** → monta un volumen en `/data` y define `DATA_DIR=/data`.
5. (Opcional) Conecta el dominio propio en **Settings → Custom Domain**.

Cada `git push` a `main` redespliega automáticamente.
