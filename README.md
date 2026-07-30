# Rizos Ondea — Tienda online 🛒✦

E-commerce (HTML + CSS + JS + servidor Node sin dependencias) para **Rizos Ondea**, tienda
online **colombiana curadora de marcas** para cabello rizado, ondulado y afro, con envío a
domicilio en todo el país (modelo dropshipping: no fabrica, selecciona y revende marcas
aliadas). El checkout finaliza el pedido por **WhatsApp** y queda registrado en el panel admin.

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

1. **Número de WhatsApp**: ya configurado (`573188546934` en [`js/data.js`](js/data.js)
   y visible en los footers). Si cambia, actualízalo en esos dos lugares.
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
