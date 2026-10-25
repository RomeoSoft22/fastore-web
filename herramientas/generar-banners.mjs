// Genera los banners iniciales de la portada (escritorio 1920×640 y celular 900×900) con las fotos
// reales de los productos, y la imagen para compartir (1200×630) .
//
//   node herramientas/generar-banners.mjs [salida] [api]
//   salida: carpeta de destino (por defecto herramientas/banners)
//   api:    URL de fastore-api (por defecto http://127.0.0.1:8010)
//
// El texto (título, subtítulo, botón) NO va en la imagen: lo pinta la tienda encima y se edita en
// Admin → Banners. La zona del texto (izquierda en escritorio, abajo en celular) se deja despejada.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const salida = resolve(process.argv[2] ?? 'herramientas/banners');
const api = (process.argv[3] ?? 'http://127.0.0.1:8010').replace(/\/$/, '');
mkdirSync(salida, { recursive: true });

const BANNERS = [
  {
    archivo: 'nfc',
    fondo: 'radial-gradient(circle at 78% 30%, #4f86f7 0%, #2563eb 40%, #1e40af 100%)',
    acento: '#FF9F43',
    productos: ['tarjetas-nfc-215-metal-mate', 'tarjetas-nfc-215-negro', 'tarjetas-nfc-215', 'mini-ntags-215-nfc-cards'],
    figura: 'ondas',
    titulo: 'Tarjetas NFC desde S/ 10',
    subtitulo: 'Comparte tu contacto, redes o Wi-Fi con solo acercar el celular.',
    boton: 'Ver tarjetas NFC',
    enlace: '/categoria/nfc',
  },
  {
    archivo: 'autos',
    fondo: 'linear-gradient(120deg, #161b20 0%, #22292f 50%, #2f3842 100%)',
    acento: '#FF9F43',
    productos: ['soam-camara-de-salpicadero-4k-1080p', 'camara-de-coche-triple-vavupo-1080p', 'camara-de-dash-hd-1080p-de-doble-lente-con-vision-nocturna-infrarroja'],
    figura: 'carretera',
    titulo: 'Cámaras para tu auto',
    subtitulo: 'Graba cada viaje en HD, de día y de noche. Seguridad que se instala en minutos.',
    boton: 'Ver cámaras',
    enlace: '/categoria/tecnologia',
  },
  {
    archivo: 'figuras',
    fondo: 'radial-gradient(circle at 75% 40%, #ffc184 0%, #ff9f43 42%, #e8862a 100%)',
    acento: '#2563EB',
    productos: ['figura-coleccionable-de-anime-nier-automata-2b-uniforme-blanco-listo', 'mewtwo-pokemon-figura-de-accion', 'figura-coleccionable-de-anime-nier-automata-2b-uniforme-negro-listo'],
    figura: 'estrellas',
    titulo: 'Figuras para coleccionar',
    subtitulo: 'Anime y videojuegos: Nier Automata, Pokémon y más. Unidades limitadas.',
    boton: 'Ver figuras',
    enlace: '/categoria/figuras-de-accion',
  },
];

async function fotos(slugs) {
  const urls = [];
  for (const slug of slugs) {
    const r = await fetch(`${api}/api/tienda/productos/${slug}`);
    if (!r.ok) continue;
    const { producto } = await r.json();
    // Las URLs del API apuntan al proxy del navegador; aquí se piden directo al API.
    if (producto.imagen) urls.push(producto.imagen.url.replace(/^.*\/api\/media\//, `${api}/api/media/`));
  }
  return urls;
}

const decoraciones = {
  ondas: acento => `
    <svg class="deco" viewBox="0 0 400 400" style="right:6%;top:50%;width:46%;transform:translateY(-50%)">
      ${[60, 110, 160, 210].map((r, i) => `<circle cx="200" cy="200" r="${r}" fill="none" stroke="${acento}" stroke-width="3" opacity="${0.55 - i * 0.12}"/>`).join('')}
    </svg>`,
  carretera: acento => `
    <svg class="deco" viewBox="0 0 800 400" preserveAspectRatio="none" style="left:0;bottom:0;width:100%;height:42%">
      <path d="M0 400 L330 120 L470 120 L800 400 Z" fill="#0a1220" opacity=".55"/>
      ${[0, 1, 2, 3].map(i => `<rect x="${396 - i * 3}" y="${140 + i * 60}" width="${8 + i * 6}" height="${22 + i * 10}" fill="${acento}" opacity=".8"/>`).join('')}
    </svg>`,
  estrellas: acento => `
    <svg class="deco" viewBox="0 0 800 400" style="right:0;top:0;width:70%;height:100%">
      ${Array.from({ length: 22 }, (_, i) => {
        const x = 380 + ((i * 97) % 420), y = 20 + ((i * 53) % 360), r = 2 + (i % 4);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.25 + (i % 3) * 0.15}"/>`;
      }).join('')}
      <circle cx="640" cy="200" r="170" fill="${acento}" opacity=".12"/>
    </svg>`,
};

function html(banner, urls, movil) {
  const n = urls.length;
  // Fotos como tarjetas inclinadas en abanico.
  const tarjetas = urls.map((url, i) => {
    const centro = (n - 1) / 2;
    const giro = (i - centro) * (movil ? 9 : 7);
    const dx = (i - centro) * (movil ? 30 : 24);
    const dy = Math.abs(i - centro) * (movil ? 4 : 3);
    return `<div class="foto" style="transform:translate(${dx}%, ${dy}%) rotate(${giro}deg);z-index:${10 - Math.round(Math.abs(i - centro) * 2)}"><img src="${url}"></div>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}
    body{width:${movil ? 900 : 1920}px;height:${movil ? 900 : 640}px;overflow:hidden;background:${banner.fondo};position:relative;font-family:system-ui}
    .deco{position:absolute}
    .grano{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:6px 6px}
    .escena{position:absolute;${movil ? 'left:0;right:0;top:4%;height:62%' : 'right:4%;top:0;bottom:0;width:52%'};display:grid;place-items:center}
    .foto{grid-area:1/1;width:${movil ? 330 : 360}px;aspect-ratio:1;border-radius:28px;overflow:hidden;background:#fff;
      box-shadow:0 30px 60px rgba(0,0,0,.35),0 0 0 6px rgba(255,255,255,.9)}
    .foto img{width:100%;height:100%;object-fit:cover}
    .marca{position:absolute;${movil ? 'top:28px;left:32px' : 'top:40px;right:48px'};display:flex;align-items:center;gap:10px;background:#fff;padding:10px 18px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
    .marca .i{height:40px}.marca .t{height:24px}
  </style></head><body>
    <div class="grano"></div>
    ${decoraciones[banner.figura](banner.acento)}
    <div class="escena">${tarjetas.join('')}</div>
    <div class="marca"><img class="i" src="${icono}"><img class="t" src="${palabra}"></div>
  </body></html>`;
}

// Logo de la marca: ícono de la bolsa y palabra FAStore.
const png = archivo => `data:image/png;base64,${readFileSync(resolve(archivo)).toString('base64')}`;
const icono = png('public/img/marca/icono.png');
const palabra = png('public/img/marca/logo.png');

const navegador = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const pagina = await navegador.newPage();
const manifiesto = [];

for (const banner of BANNERS) {
  const urls = await fotos(banner.productos);
  for (const movil of [false, true]) {
    await pagina.setViewportSize(movil ? { width: 900, height: 900 } : { width: 1920, height: 640 });
    await pagina.setContent(html(banner, urls, movil), { waitUntil: 'networkidle' });
    const archivo = `${banner.archivo}${movil ? '-movil' : ''}.jpg`;
    await pagina.screenshot({ path: resolve(salida, archivo), type: 'jpeg', quality: 90 });
    console.log('✔', archivo);
  }
  manifiesto.push({
    titulo: banner.titulo, subtitulo: banner.subtitulo, boton: banner.boton, enlace: banner.enlace,
    imagen: `${banner.archivo}.jpg`, imagen_movil: `${banner.archivo}-movil.jpg`, tema: 'claro',
  });
}
writeFileSync(resolve(salida, 'banners.json'), JSON.stringify(manifiesto, null, 2));

// Imagen por defecto al compartir la tienda (Open Graph 1200×630) e ícono para iPhone.
const todas = (await fotos(BANNERS.flatMap(b => b.productos.slice(0, 2)))).slice(0, 5);
await pagina.setViewportSize({ width: 1200, height: 630 });
await pagina.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box} body{width:1200px;height:630px;background:radial-gradient(circle at 80% 20%,#4f86f7,#2563eb 45%,#1e40af);font-family:system-ui;color:#fff;position:relative;overflow:hidden}
  .txt{position:absolute;left:70px;top:50%;transform:translateY(-50%);width:560px}
  .marca{display:inline-flex;align-items:center;gap:14px;background:#fff;padding:18px 26px;border-radius:24px;margin-bottom:28px}.marca .i{height:76px}.marca .t{height:46px}
    p{font:500 30px/1.3 system-ui;opacity:.9;margin-top:18px}
  .fotos{position:absolute;right:-40px;top:50%;transform:translateY(-50%);display:grid;grid-template-columns:repeat(2,230px);gap:18px;rotate:-8deg}
  .fotos img{width:230px;height:230px;object-fit:cover;border-radius:24px;border:5px solid #fff;box-shadow:0 20px 40px rgba(0,0,0,.35)}
</style></head><body>
  <div class="txt"><div class="marca"><img class="i" src="${icono}"><img class="t" src="${palabra}"></div>
  <p>Tecnología, NFC y coleccionables. Entrega gratis en el Metro de Lima.</p></div>
  <div class="fotos">${todas.slice(0, 4).map(u => `<img src="${u}">`).join('')}</div>
</body></html>`, { waitUntil: 'networkidle' });
await pagina.screenshot({ path: resolve('public/img/social.jpg'), type: 'jpeg', quality: 88 });
console.log('✔ public/img/social.jpg');

await navegador.close();
