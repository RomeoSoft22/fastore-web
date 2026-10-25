// Capturas de las pantallas principales en tema claro y oscuro (escritorio y celular) para revisar el diseño.
//   node herramientas/capturas-tema.mjs [salida]
// El admin necesita FASTORE_E2E_CORREO y FASTORE_E2E_CLAVE (cuenta de la identidad local).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const salida = resolve(process.argv[2] ?? 'test-results/temas');
const base = process.env.FASTORE_E2E_URL ?? 'http://localhost:4700';
mkdirSync(salida, { recursive: true });

const TIENDA = ['/', '/tienda', '/producto/tarjetas-nfc-215', '/carrito', '/legal/privacidad', '/libro-de-reclamaciones'];
const ADMIN = ['/admin', '/admin/productos', '/admin/productos/3', '/admin/carritos?vista=todos', '/admin/cupones', '/admin/reclamos'];

const navegador = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });

async function contexto(tema, movil) {
  const ctx = await navegador.newContext(movil ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await ctx.route(/googletagmanager|google-analytics|wa\.me/, r => r.fulfill({ body: '' }));
  await ctx.addInitScript(t => {
    localStorage.setItem('fastore_tema', JSON.stringify(t));
    localStorage.setItem('fastore_consentimiento', JSON.stringify({ necesarias: true, analiticas: false, fecha: '2026-10-25T00:00:00Z', version: 1 }));
    localStorage.setItem('fastore_carrito', JSON.stringify({ items: [{ id: 3, slug: 'tarjetas-nfc-215', nombre: 'Tarjetas NFC 215', precio: 40, imagen: null, cantidad: 2, maximo: 99 }], contacto: { entrega: 'local' }, token: null }));
  }, tema);
  return ctx;
}

async function capturar(pagina, ruta, nombre) {
  await pagina.goto(base + ruta, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(800);
  await pagina.screenshot({ path: resolve(salida, nombre + '.png'), fullPage: true });
  console.log('✔', nombre);
}

for (const tema of ['oscuro', 'claro']) {
  for (const movil of [false, true]) {
    const ctx = await contexto(tema, movil);
    const p = await ctx.newPage();
    for (const ruta of TIENDA) {
      await capturar(p, ruta, `${tema}-${movil ? 'movil' : 'escritorio'}-tienda${ruta.replace(/[/?=]+/g, '_')}`);
    }
    if (!movil && process.env.FASTORE_E2E_CORREO) {
      await p.goto(base + '/admin');
      await p.locator('#email').or(p.getByRole('heading', { name: 'Dashboard' })).first().waitFor({ timeout: 60000 });
      if (await p.locator('#email').isVisible()) {
        await p.locator('#email').fill(process.env.FASTORE_E2E_CORREO);
        await p.locator('#password').fill(process.env.FASTORE_E2E_CLAVE);
        await p.locator('#password').press('Enter');
        await p.waitForURL(/\/admin/, { timeout: 60000 });
      }
      for (const ruta of ADMIN) {
        await capturar(p, ruta, `${tema}-admin${ruta.replace(/[/?=]+/g, '_')}`);
      }
      // Detalle de un carrito abierto
      await p.goto(base + '/admin/carritos?vista=todos', { waitUntil: 'networkidle' });
      await p.locator('.carrito-resumen').first().click();
      await p.waitForTimeout(500);
      await p.screenshot({ path: resolve(salida, `${tema}-admin-carrito-detalle.png`), fullPage: true });
    }
    await ctx.close();
  }
}
await navegador.close();
