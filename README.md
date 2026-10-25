# fastore-web

Tienda virtual **FAStore** (`shop.juarezcampos.net`) y su administración. Angular 21 (standalone, signals, sin zone.js), sin librerías de UI.
Habla con `fastore-api` en `/fastore-api/api` (proxy en local, carpeta hermana en producción).

## Páginas

- **Tienda:** portada con banners, catálogo con filtros (`/tienda`, `/categoria/:slug`), ficha de producto con galería y botones para compartir (`/producto/:slug`), carrito con código de descuento y pedido por WhatsApp (`/carrito`).
- **Admin** (`/admin`, ingreso con identidad): dashboard de ventas y ganancia, productos (fotos, costos, precio sugerido), categorías y marcas, banners, pedidos y carritos abandonados, códigos de descuento y fórmula de costos.

Diseño mobile-first con la paleta de la marca: primario `#2563EB`, acento `#FF9F43`, oscuro `#22292F`. Logo e ícono en `public/img/marca/`.

## SEO

`public/seo.php` entrega el `index.html` con los metadatos de cada URL ya escritos (título con precio, descripción, Open Graph, Twitter y JSON-LD `Product`), pidiéndolos a `fastore-api`. Así WhatsApp, Facebook y Google ven el producto sin ejecutar JavaScript. `public/.htaccess` envía a `seo.php` toda ruta que no sea archivo y publica `/sitemap.xml`.

## Local

```bash
npm install
npx ng serve --port 4700           # o _local\fastore-web.cmd (requiere fastore-api en 8010)
npx ng build                       # producción → dist/fastore-web/browser
```

Para revisar el SEO del build: `_local\fastore-seo.cmd` (PHP sirve el build con `seo.php` en el puerto 4710).

## Pruebas con Playwright

```bash
npx playwright test --project=escritorio --project=celular     # tienda
FASTORE_E2E_CORREO=... FASTORE_E2E_CLAVE=... npx playwright test --project=admin
```

La cuenta de pruebas del admin existe solo en la identidad local (ver `_local/credenciales-local.txt`). Las capturas quedan en `test-results/capturas`. Usa Microsoft Edge (`PW_CHANNEL=chromium` para el Chromium de Playwright).

## Banners iniciales

`node herramientas/generar-banners.mjs` arma los banners (1920×640 y 900×900 para celular) con fotos reales de los productos y la imagen para compartir `public/img/social.jpg`. Luego `php artisan fastore:banners <carpeta>` en `fastore-api` los carga. Después se administran desde Admin → Banners.
