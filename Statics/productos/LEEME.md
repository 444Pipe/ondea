# 📸 Fotos de productos

Guarda aquí las fotos de los productos reales (las de Dropi o las tuyas propias).

## Cómo organizarlas

**Una carpeta por producto**, con las fotos adentro:

```
Statics/productos/
  kit-rizos-la-pocion/
    1.jpeg   ← foto principal (la que se ve en la tienda y el carrito)
    2.jpeg
    3.jpeg
    ...
```

- Puedes nombrar la carpeta como quieras (ej. "Nombre del producto (id de Dropi)");
  Claude la normaliza al id de la tienda y numera las fotos.
- La foto `1` es la principal: idealmente la del producto en fondo blanco/limpio.
- Las demás salen como galería en la página del producto, en ese orden.

## Formatos

- Sirven `.jpg`, `.jpeg`, `.png` y `.webp`.
- Mejor si pesan menos de ~400 KB cada una para que la página cargue rápido.

Cuando subas fotos nuevas, avísale a Claude para que las conecte al producto en `js/data.js`.
