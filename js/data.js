/* ==========================================================================
   Rizos Ondea — Datos de la tienda
   ⚠️ CONFIGURACIÓN: cambia aquí el número de WhatsApp real del negocio.
   ========================================================================== */

const ONDEA_CONFIG = {
  // Número de WhatsApp en formato internacional SIN "+" (57 = Colombia).
  whatsapp: "573188546934",
  ciudad: "Villavicencio",
  envioNacional: 12000,      // COP — envío al resto de Colombia
  envioLocal: 6000,          // COP — envío dentro de Villavicencio
  envioGratisDesde: 150000,  // COP — umbral de envío gratis
};

/* Catálogo real, conectado a Dropi.
   Categorías activas: hidratacion · definicion · accesorios · kits
   (limpieza sigue vacía; al agregar shampoos sueltos, restaura su chip en
   productos.html y su tarjeta en index.html)
   Tipos de rizo: ondulado (2A-2C) · rizado (3A-3C) · afro (4A-4C)

   🔌 INTEGRACIÓN DROPI: cada producto lleva  dropiId  con su ID del
   catálogo de Dropi y  cost  con el precio del proveedor. Fotos en
   Statics/productos/<id>/ (la 1 es la principal). */
const ONDEA_PRODUCTS = [
  {
    id: "duo-rizos-definidos",
    dropiId: "1977942", // ID en el catálogo de Dropi (proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Dúo Rizos Definidos «Milagros»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado", "afro"],
    price: 94900,
    cost: 64090,
    size: "2 tratamientos × 450 ml",
    rating: 4.9,
    reviews: 0,
    badge: "Nuevo",
    badgeClass: "",
    art: "jar",
    images: [
      "Statics/productos/duo-rizos-definidos/1.webp",
      "Statics/productos/duo-rizos-definidos/2.webp",
      "Statics/productos/duo-rizos-definidos/3.jpg",
    ],
    short: "Bio Repolarizador + Nutrición y Crecimiento: tratamiento intensivo que define, repara y fortalece tus rizos.",
    desc: "El Dúo Rizos Definidos de Milagros combina dos tratamientos de alto desempeño: el Bio Repolarizador Capilar (450 ml — pro vitamina B5, keratina, aceite de argán, pulpa de coco y vitamina E) que repara la fibra y aporta brillo intenso, y la Terapia Nutrición y Crecimiento (450 ml — mantequilla de mango, complejo botánico de aminoácidos y vitamina E) que fortalece la hebra, reduce la caída y mejora la definición natural. Juntos hidratan profundamente, controlan el frizz y estimulan el crecimiento. Ideal para rizos secos, frágiles o con procesos químicos; apto para todo tipo de rizo. Dermatológicamente comprobados.",
    benefits: ["Hidratación profunda sin apelmazar", "Repara el daño y aporta brillo intenso", "Fortalece la hebra y reduce la caída", "Mejora la definición y evita la porosidad y el frizz", "Estimula el crecimiento del cabello"],
    howto: "Mezcla 2 cucharadas de cada tratamiento, aplica sobre cabello húmedo de raíz a puntas y distribuye con los dedos o un peine de dientes anchos cubriendo cada rizo. Deja actuar 15-30 minutos, enjuaga con abundante agua y lava con tu shampoo de preferencia. Úsalo 1-2 veces por semana.",
    ingredients: "Extractos naturales de plantas, proteínas vegetales y complejos hidratantes con aminoácidos esenciales. Bio Repolarizador: pro vitamina B5, keratina, aceite de argán, pulpa de coco y vitamina E. Nutrición y Crecimiento: mantequilla de mango, complejo botánico de aminoácidos y vitamina E. Uso externo; evitar el contacto con los ojos.",
  },
  {
    id: "kit-emergencia-reparacion-milagros",
    dropiId: "1977270", // ID en el catálogo de Dropi (SKU KIT-00035, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit Emergencia y Reparación «Milagros»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado", "afro"],
    price: 149900,
    cost: 106193,
    size: "4 productos",
    rating: 4.9,
    reviews: 0,
    badge: "Nuevo",
    badgeClass: "",
    art: "kit",
    images: [
      "Statics/productos/kit-emergencia-reparacion-milagros/1.webp",
      "Statics/productos/kit-emergencia-reparacion-milagros/2.webp",
      "Statics/productos/kit-emergencia-reparacion-milagros/3.webp",
      "Statics/productos/kit-emergencia-reparacion-milagros/4.webp",
      "Statics/productos/kit-emergencia-reparacion-milagros/5.webp",
    ],
    short: "La rutina intensiva de rescate para cabello dañado: shampoo + 3 tratamientos reparadores Milagros.",
    desc: "La solución de choque para cabello dañado, quebradizo o sin brillo por tintes, decoloraciones o plancha. Incluye el Shampoo Emergencia Capilar (450 ml), el Tratamiento Bio Repolarizador Capilar (450 ml), el Tratamiento Emergencia Capilar (450 ml) y la ampolleta Rescate Instantáneo «El Experto en Rescate» (30 ml). Sus activos —biotina, colágeno hidrolizado, queratina vegetal, provitamina B5, pulpa de coco y vitamina E— reparan la fibra desde el interior, fortalecen la raíz y estimulan un crecimiento saludable. Dermatológicamente comprobados.",
    benefits: ["Repara el daño de tintes, decoloración y calor", "Fortalece la raíz y reduce la caída", "Devuelve brillo, suavidad y elasticidad", "Resultados visibles desde la primera aplicación", "Rutina completa de reconstrucción en 4 pasos"],
    howto: "Mezcla una ampolleta del Rescate Instantáneo con la misma cantidad de agua hasta lograr textura cremosa; añade una dosis del Bio Repolarizador y una del Tratamiento Emergencia y revuelve. Aplica sobre cabello seco o ligeramente húmedo de medios a puntas (evita el cuero cabelludo), deja actuar 30 minutos —con gorro térmico se potencia— y lava con el Shampoo Emergencia. Úsalo 1-2 veces por semana.",
    ingredients: "Biotina y colágeno hidrolizado, provitamina B5 y queratina vegetal, pulpa de coco y vitamina E, extractos naturales y aminoácidos. Uso externo; evitar el contacto con los ojos.",
  },
  {
    id: "kit-crecimiento-antifrizz-milagros",
    dropiId: "2019484", // ID en el catálogo de Dropi (SKU KIT-00074, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit Crecimiento Antifrizz «Milagros»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado", "afro"],
    price: 169900,
    cost: 113724,
    size: "3 productos",
    rating: 4.9,
    reviews: 0,
    badge: "Envío gratis",
    badgeClass: "badge-pink",
    art: "kit",
    images: [
      "Statics/productos/kit-crecimiento-antifrizz-milagros/1.png",
      "Statics/productos/kit-crecimiento-antifrizz-milagros/2.webp",
      "Statics/productos/kit-crecimiento-antifrizz-milagros/3.webp",
    ],
    short: "Shampoo + acondicionador con cebolla y péptidos + mascarilla profesional: crecimiento, menos caída y cero frizz.",
    desc: "La rutina profesional de Milagros para estimular el crecimiento, reducir el frizz y reparar el cabello dañado. Incluye el Shampoo Crecimiento con extracto de cebolla y péptidos (450 ml) que restaura la fuerza y despierta el crecimiento desde la raíz, el Acondicionador Antifrizz fortalecedor (450 ml) que desenreda al instante y previene la caída por quiebre, y la Mascarilla Reparación Intensiva Milagros Professional (450 ml) que revierte el daño por decoloración, tinturas y calor. Cabello más fuerte, suave, manejable y con menos caída — apto para hombres y mujeres, y para uso frecuente.",
    benefits: ["Estimula el crecimiento con extracto de cebolla y péptidos", "Controla el frizz y facilita el desenredo", "Repara el daño por tintes, decoloración y calor", "Fortalece la fibra y reduce la caída por quiebre", "Resultados que se potencian en 3-6 semanas de constancia"],
    howto: "Lava con el Shampoo Crecimiento masajeando el cuero cabelludo (3-5 veces por semana). Aplica el Acondicionador Antifrizz de medios a puntas, deja actuar 2-5 minutos y enjuaga. Usa la Mascarilla Reparación Intensiva 1-2 veces por semana, dejándola actuar 15-20 minutos antes de enjuagar.",
    ingredients: "Extracto de cebolla morada, péptidos fortalecedores, cafeína, activos antifrizz y componentes reparadores con aminoácidos. Uso externo; evitar el contacto con los ojos.",
  },
  {
    id: "kit-rescate-nutritivo-milagros",
    dropiId: "2127615", // ID en el catálogo de Dropi (SKU KIT-00031, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit Rescate Nutritivo «Milagros»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado", "afro"],
    price: 179900,
    cost: 125810,
    size: "4 productos",
    rating: 4.9,
    reviews: 0,
    badge: "Envío gratis",
    badgeClass: "badge-pink",
    art: "kit",
    images: ["Statics/productos/kit-rescate-nutritivo-milagros/1.png"],
    short: "Shampoo + tratamiento + mascarilla + leave-in Milagros: la rutina completa que recupera, nutre y da brillo.",
    desc: "La rutina completa de recuperación capilar de Milagros para cabello maltratado por químicos, calor o decoloración. Incluye el Shampoo Bio-repolarizador (450 ml) que limpia mientras reconstruye la fibra, el Tratamiento Bio Repolarizador Capilar (450 ml) que repara e hidrata con protección UV, la Mascarilla Multivitamínica con aminoácidos (450 ml) que fortalece y ayuda a reducir la caída, y el Tratamiento Magia Capilar sin enjuague (150 ml) que controla el frizz, hidrata las puntas y da brillo inmediato durante el día. Resultados visibles desde las primeras aplicaciones.",
    benefits: ["Reparación profunda del daño por químicos, calor o decoloración", "Hidratación intensiva y nutrición completa", "Reduce el frizz y las puntas secas", "Cabello más fuerte, brillante y sedoso", "Incluye leave-in para mantener el resultado todo el día"],
    howto: "Lava con el Shampoo Bio-repolarizador y aplica el Tratamiento Bio Repolarizador de medios a puntas; enjuaga. Usa la Mascarilla Multivitamínica 1-2 veces por semana dejándola actuar 15-20 minutos. Finaliza con el Magia Capilar sin enjuague sobre cabello húmedo o seco para controlar el frizz y sellar las puntas.",
    ingredients: "Bio-repolarizadores con pro vitamina B5, keratina, aceite de argán, pulpa de coco y vitamina E; mascarilla con multivitaminas y aminoácidos; Magia Capilar con ácido hialurónico, extracto de lino, aceite de sacha inchi y vitaminas A, B5 y H. Uso externo.",
  },
  {
    id: "kit-rizos-largos-abundantes",
    dropiId: "2207916", // ID en el catálogo de Dropi (SKU KIT-00039, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit Rizos Largos y Abundantes «Tongolé»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado"],
    price: 229900,
    cost: 158358,
    size: "6 productos",
    rating: 5.0,
    reviews: 0,
    badge: "Envío gratis",
    badgeClass: "badge-pink",
    art: "kit",
    images: [
      "Statics/productos/kit-rizos-largos-abundantes/1.png",
      "Statics/productos/kit-rizos-la-pocion/3.jpeg",
      "Statics/productos/kit-rizos-la-pocion/4.jpeg",
      "Statics/productos/kit-rizos-la-pocion/5.jpeg",
    ],
    short: "La rutina Tongolé completa + tónicos Oxy y Energy: hidratación, definición y crecimiento en 6 pasos.",
    desc: "El sistema para conseguir rizos definidos, hidratados, más largos y con volumen natural. Combina la nutrición profunda de Tongolé — Shampoo (450 ml), Tratamiento (450 ml), Crema para Peinar (450 ml) y Mascarilla Capilar (350 ml) — con el poder estimulante de los tónicos Poción: Oxy Tonic (40 ml, diurno, oxigena y revitaliza la raíz) y Energy Tonic (40 ml, nocturno, estimula el crecimiento). Fortalece la raíz, mejora el crecimiento y potencia la forma natural del rizo sin frizz ni pesadez. Ideal para texturas 2A a 3C que buscan crecer sanas, fuertes y con abundancia.",
    benefits: ["Activa el crecimiento y fortalece la raíz", "Hidratación profunda sin apelmazar", "Rizos más abundantes, definidos y con movimiento", "Reduce el frizz y sella la cutícula", "Evita el quiebre y la caída por debilitamiento"],
    howto: "Lava con el Shampoo Tongolé, aplica el Tratamiento y enjuaga. Usa la Mascarilla 1-2 veces por semana. Aplica el Oxy Tonic de día y el Energy Tonic de noche directamente en el cuero cabelludo. Define con la Crema para Peinar sobre cabello húmedo.",
    ingredients: "Consulta la etiqueta de cada producto Tongolé y de los tónicos Oxy y Energy incluidos en el kit. Uso externo.",
  },
  {
    id: "kit-milagro-herbal",
    dropiId: "1979509", // ID en el catálogo de Dropi (SKU KIT-00055, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit Milagro Herbal «Milagros»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado", "afro"],
    price: 194900,
    cost: 139288,
    size: "4 productos",
    rating: 4.9,
    reviews: 0,
    badge: "Envío gratis",
    badgeClass: "badge-pink",
    art: "kit",
    images: [
      "Statics/productos/kit-milagro-herbal/1.jpg",
      "Statics/productos/kit-milagro-herbal/2.webp",
      "Statics/productos/kit-milagro-herbal/3.webp",
      "Statics/productos/kit-milagro-herbal/4.webp",
      "Statics/productos/kit-milagro-herbal/5.webp",
    ],
    short: "Romero, jengibre, canela y eucalipto: crecimiento, control de grasa y menos caída desde la raíz.",
    desc: "El poder de los extractos naturales para un cabello fuerte, fresco y con crecimiento saludable. Incluye el Shampoo Milagro Herbal (450 ml — con ramas de romero y jengibre 100% naturales, eficacia seborreguladora clínicamente comprobada), el Acondicionador Milagro Herbal (450 ml — desenreda y disminuye la caída), la Mascarilla Capilar Milagro Herbal (450 g — con provitamina B5, keratina y péptidos de avena) y el Tónico Revitalizante (110 ml — fortalece los folículos y purifica el cuero cabelludo). Ideal para cabello graso, con caída o debilitado que necesita limpieza profunda sin resecar.",
    benefits: ["Estimula el crecimiento con romero y jengibre", "Regula el exceso de grasa del cuero cabelludo", "Disminuye la caída y fortalece la raíz", "Nutre y repara sin sensación grasosa", "Con extractos 100% naturales y eficacia comprobada"],
    howto: "Antes del lavado, aplica el Tónico sobre el cuero cabelludo seco, masajea y déjalo actuar mínimo 2 horas (o toda la noche). Lava con el Shampoo dejando actuar 3-5 minutos y enjuaga. Aplica el Acondicionador de medios a puntas 5 minutos y retira con agua fría. Usa la Mascarilla 1-2 veces por semana, 15-30 minutos.",
    ingredients: "Romero y jengibre (crecimiento y raíz fuerte), canela y eucalipto (regulan la grasa), extracto de arroz y aminoácidos, provitamina B5, keratina, péptidos de avena y vitaminas naturales. Uso externo; evitar el contacto con los ojos.",
  },
  {
    id: "kit-secado-ondas-sonadas",
    dropiId: "2013522", // ID en el catálogo de Dropi (SKU 733654185498, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit Secado y Ondas Soñadas «La Poción»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado"],
    price: 199900,
    cost: 129379,
    size: "4 productos",
    rating: 4.9,
    reviews: 0,
    badge: "Envío gratis",
    badgeClass: "badge-pink",
    art: "kit",
    images: [
      "Statics/productos/kit-secado-ondas-sonadas/1.png",
      "Statics/productos/kit-secado-ondas-sonadas/2.png",
      "Statics/productos/kit-secado-ondas-sonadas/3.png",
      "Statics/productos/kit-secado-ondas-sonadas/4.png",
      "Statics/productos/kit-secado-ondas-sonadas/5.png",
    ],
    short: "La rutina para ondas con calor sin daño: protección térmica hasta 232 °C, reparación y brillo espejo.",
    desc: "El kit para quienes modelan sus ondas con blower, plancha o tenaza sin sacrificar la salud del cabello. Incluye Bite Me Banano (250 ml — suplemento capilar antioxidante hidroreparador con extracto de banano y aceites de macadamia y aguacate), Shampoo Reparación (450 ml), Termoprotector Capilar B8 (protege hasta 450 °F / 232 °C, con complejo de ceramidas) y el Óleo B8 Brillo Infinito que sella las puntas con efecto espejo. Previene el daño térmico, repara la fibra, controla el frizz y permite styling frecuente sin quiebre.",
    benefits: ["Protección térmica real hasta 232 °C (450 °F)", "Repara la fibra y evita el quiebre por calor", "Brillo con efecto espejo y control del frizz", "Puntas selladas con el Óleo B8", "Permite modelar el cabello con frecuencia sin dañarlo"],
    howto: "Aplica Bite Me como pre-shampoo para desintoxicar. Lava con el Shampoo Reparación y enjuaga. Vuelve a usar Bite Me como acondicionador, deja actuar y enjuaga. Sobre el cabello húmedo aplica el Termoprotector antes del blower, plancha o tenaza. Finaliza con unas gotas del Óleo B8 para brillo y control del frizz.",
    ingredients: "Bite Me: extracto de banano, aceites de macadamia y aguacate. Termoprotector: complejo de ceramidas y siliconas volátiles. Óleo B8: mezcla de aceites vegetales selladores. Uso externo.",
  },
  {
    id: "kit-reparacion-profunda-pocion",
    dropiId: "2012557", // ID en el catálogo de Dropi (SKU KIT-00043, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit Reparación Profunda «La Poción»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado", "afro"],
    price: 219900,
    cost: 154667,
    size: "5 productos",
    rating: 5.0,
    reviews: 0,
    badge: "Envío gratis",
    badgeClass: "badge-pink",
    art: "kit",
    images: [
      "Statics/productos/kit-reparacion-profunda-pocion/1.png",
      "Statics/productos/kit-reparacion-profunda-pocion/2.png",
      "Statics/productos/kit-reparacion-profunda-pocion/3.png",
      "Statics/productos/kit-reparacion-profunda-pocion/4.png",
      "Statics/productos/kit-reparacion-profunda-pocion/5.png",
      "Statics/productos/kit-reparacion-profunda-pocion/6.png",
    ],
    short: "El sistema completo de 5 pasos para restaurar cabello seco, maltratado o procesado químicamente.",
    desc: "El sistema completo para restaurar, fortalecer y devolverle la vida al cabello dañado por tintes, decoloraciones, plancha o sol. Incluye Shampoo La Poción (450 ml, limpieza suave sin resecar), Acondicionador La Poción (450 ml), Tratamiento Renovador (450 ml, nutrición profunda), Mascarilla Ancestral (350 ml, con vitaminas A, B1, B2, B6, B12, C y E) y el Óleo B8 Brillo Infinito (aceite ligero que nutre, ilumina y protege). Actúa desde el interior de la fibra para mejorar elasticidad, suavidad y resistencia, sellando la cutícula contra el frizz y la porosidad.",
    benefits: ["Repara el daño profundo de tintes, decoloración y calor", "Fortalece la fibra y evita la ruptura", "Hidratación intensa con brillo sin sensación pesada", "Sella la cutícula: menos frizz y porosidad", "Rutina completa de 5 pasos con envío gratis"],
    howto: "Lava con el Shampoo La Poción y aplica el Acondicionador; enjuaga. Usa el Tratamiento Renovador 2-3 veces por semana y la Mascarilla Ancestral 1-2 veces por semana dejándola actuar 10-15 minutos. Finaliza con unas gotas del Óleo B8 sobre cabello húmedo o seco.",
    ingredients: "Mascarilla Ancestral con vitaminas A, B1, B2, B6, B12, C y E. Consulta la etiqueta de cada producto Poción del kit para la lista completa. Uso externo.",
  },
  {
    id: "kit-rizos-la-pocion",
    dropiId: "1893635", // ID en el catálogo de Dropi (SKU KIT-00085, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit para Rizos Tongolé «La Poción»",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado"],
    price: 189900,
    cost: 129865,
    size: "4 productos",
    rating: 5.0,
    reviews: 0,
    badge: "Envío gratis",
    badgeClass: "badge-pink",
    art: "kit",
    images: [
      "Statics/productos/kit-rizos-la-pocion/1.jpeg",
      "Statics/productos/kit-rizos-la-pocion/2.jpeg",
      "Statics/productos/kit-rizos-la-pocion/3.jpeg",
      "Statics/productos/kit-rizos-la-pocion/4.jpeg",
      "Statics/productos/kit-rizos-la-pocion/5.jpeg",
      "Statics/productos/kit-rizos-la-pocion/6.jpeg",
      "Statics/productos/kit-rizos-la-pocion/7.jpeg",
    ],
    short: "Shampoo + tratamiento + crema para peinar + mascarilla Tongolé: el sistema completo para rizos 2A a 3C.",
    desc: "El sistema completo para hidratar, definir y restaurar ondas, rizos y crespos (2A a 3C) con acabado natural y libre de frizz. Incluye Shampoo Tongolé (450 ml), Tratamiento Tongolé (450 ml), Crema para Peinar Tongolé (450 ml) y Mascarilla Capilar Tongolé (350 ml): fórmulas nutritivas que reparan la fibra capilar, controlan el frizz y logran rizos definidos por más tiempo, sin sensación pesada.",
    benefits: ["Define y realza ondas y rizos de forma natural", "Controla el frizz incluso en climas húmedos", "Hidratación profunda sin apelmazar", "Repara y fortalece la fibra capilar", "Ideal para cabellos ondulados, rizados y crespos (2A a 3C)"],
    howto: "Lava con el Shampoo Tongolé, aplica el Tratamiento y enjuaga. Usa la Mascarilla 1-2 veces por semana dejándola actuar 10-15 minutos. Finaliza con la Crema para Peinar sobre cabello húmedo y define con tus manos o tu técnica preferida.",
    ingredients: "Consulta la etiqueta de cada producto Tongolé incluido en el kit.",
  },
  {
    id: "kit-rizos-lavado-etniker",
    dropiId: "1979862", // ID en el catálogo de Dropi (SKU KIT-00079, proveedor LIVANA COLOMBIA SAS)
    proveedor: "LIVANA", // bodega Dropi — agrupa órdenes y fletes
    name: "Kit Rizos Lavado Etniker",
    category: "kits",
    categoryLabel: "Kits",
    types: ["ondulado", "rizado", "afro"],
    price: 109900,
    cost: 65000,
    size: "3 productos",
    rating: 4.9,
    reviews: 0,
    badge: "Nuevo",
    badgeClass: "",
    art: "kitSmall",
    images: [
      "Statics/productos/kit-rizos-lavado-etniker/1.webp",
      "Statics/productos/kit-rizos-lavado-etniker/2.jpg",
      "Statics/productos/kit-rizos-lavado-etniker/3.jpg",
      "Statics/productos/kit-rizos-lavado-etniker/4.jpg",
    ],
    short: "Shampoo + crema para peinar + gel definidora Etniker: tu wash day en 3 pasos (limpia, hidrata, define).",
    desc: "Tu wash day en 3 pasos con Etniker Afro Hair Care: limpia con el Shampoo (250 ml — a elegir entre Nutritivo o Limpieza Profunda anti-residuos), hidrata con la Crema para Peinar Curl Defining (290 g, coco, karité y monoï de Tahití) y define con la Gel Definidora de Rizos (300 g, coco y linaza). Acabado natural, brillo y cero frizz, sin rigidez ni residuos. Ideal para texturas 2B a 4C y cabellos en transición. Escríbenos en las notas del pedido cuál shampoo prefieres; si no nos dices, enviamos el Nutritivo.",
    benefits: ["Definición y moldeo con fijación flexible", "Control del frizz y brillo sin residuos ni pegajosidad", "Hidratación y desenredo sin tirones", "Rutina simple: limpia → hidrata → define", "Fórmulas sin sulfatos, sin siliconas y sin parabenos"],
    howto: "1) Limpia con el shampoo: el Nutritivo para uso frecuente, o el de Limpieza Profunda máximo 2 veces al mes. 2) En cabello húmedo aplica la crema por secciones y activa con scrunch; no enjuagues. 3) Distribuye la gel por secciones, haz scrunch de abajo hacia arriba y seca al aire o con difusor en calor bajo. Refresh día 2-3: humedece ligeramente y aplica una microdosis de gel.",
    ingredients: "Gel: coco y linaza. Crema: coco, karité y monoï de Tahití (con filtro UV). Fórmulas sin sulfatos, sin sal añadida, sin siliconas, sin aceite mineral y libres de parabenos. Uso externo; evitar contacto con los ojos.",
  },
];
