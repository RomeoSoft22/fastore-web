import { Page, expect, test } from '@playwright/test';

const captura = (page: Page, nombre: string) =>
  page.screenshot({ path: `test-results/capturas/${test.info().project.name}-${nombre}.png`, fullPage: true });

/** Falla si la página tiene desplazamiento horizontal (diseño roto en celular). */
async function sinDesbordeHorizontal(page: Page) {
  const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(ancho[0], 'la página no debe tener scroll horizontal').toBeLessThanOrEqual(ancho[1] + 1);
}

/** Elección de cookies ya hecha (solo necesarias), para que el aviso no tape los botones. */
const CONSENTIMIENTO = JSON.stringify({ necesarias: true, analiticas: false, fecha: '2026-10-25T00:00:00Z', version: 1 });

test.beforeEach(async ({ page }, info) => {
  // Nada de abrir WhatsApp ni cargar Google Analytics de verdad durante las pruebas.
  await page.context().route(/wa\.me|api\.whatsapp\.com/, r => r.fulfill({ body: 'whatsapp' }));
  await page.context().route(/googletagmanager\.com|google-analytics\.com/, r => r.fulfill({ body: '' }));
  if (!info.title.startsWith('cookies')) {
    await page.addInitScript(c => localStorage.setItem('fastore_consentimiento', c), CONSENTIMIENTO);
  }
  page.on('pageerror', e => {
    throw e;
  });
});

test('portada: banners, categorías y productos', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/FAStore/);
  await expect(page.locator('.diapositiva.visible h2')).toBeVisible();
  await expect(page.locator('.categoria-tile')).toHaveCount(5);
  await expect(page.locator('.grilla-productos .tarjeta').first()).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /FAStore/);
  await sinDesbordeHorizontal(page);

  if (!isMobile) {
    const primero = await page.locator('.diapositiva.visible h2').textContent();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.locator('.diapositiva.visible h2')).not.toHaveText(primero!);
  } else {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(page.locator('.menu-movil')).toContainText('Tecnología');
    await page.locator('.menu-movil').getByText('Tecnología').click();
    await expect(page).toHaveURL(/categoria\/tecnologia/);
    await page.goto('/');
  }
  await captura(page, 'portada');
});

test('catálogo: búsqueda, categoría, marca, precio y orden', async ({ page, isMobile }) => {
  await page.goto('/tienda');
  const total = page.locator('.resultados > p');
  await expect(total).toContainText('19 productos');

  // Búsqueda desde la cabecera
  await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('nfc');
  await page.getByRole('searchbox', { name: 'Buscar productos' }).press('Enter');
  await expect(page).toHaveURL(/q=nfc/);
  await expect(page.locator('.chip')).toContainText('nfc');
  await expect(total).not.toContainText('19 productos');

  // Categoría + marca + precio
  await page.goto('/categoria/nfc');
  await expect(page.locator('h1')).toHaveText('NFC');
  if (isMobile) await page.getByRole('button', { name: /Filtros/ }).click();
  await page.locator('.filtros').getByLabel(/RFID/).check();
  await expect(page).toHaveURL(/marca=rfid/);
  await expect(total).toContainText('2 productos');
  await page.locator('.filtros').getByLabel(/RFID/).uncheck();
  await page.locator('.filtros').getByLabel('Precio máximo').fill('20');
  await page.locator('.filtros').getByRole('button', { name: 'Aplicar' }).click();
  await expect(page).toHaveURL(/max=20/);
  // Se espera a que lleguen los resultados nuevos (mientras tanto se ven los anteriores atenuados).
  const precios = () => page.locator('.tarjeta .precio strong').allTextContents().then(t => t.map(p => Number(p.replace(/[^\d.]/g, ''))));
  await expect.poll(async () => (await precios()).length > 0 && (await precios()).every(p => p <= 20)).toBe(true);

  // Orden por precio
  await page.goto('/tienda?orden=precio_desc');
  await expect(total).toContainText('19 productos');
  const ordenados = await precios();
  expect(ordenados).toEqual([...ordenados].sort((a, b) => b - a));
  await sinDesbordeHorizontal(page);
  await captura(page, 'catalogo');
});

test('producto: galería, SEO, compartir y agregar al carrito', async ({ page, isMobile }) => {
  await page.goto('/producto/tarjetas-nfc-215');
  await expect(page.locator('h1')).toHaveText('Tarjetas NFC 215');
  await expect(page).toHaveTitle(/Tarjetas NFC 215 \| S\/ 40\.00/);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'product');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/api\/media\/productos\/3\//);
  const jsonld = JSON.parse((await page.locator('script[data-seo="jsonld"]').first().textContent())!);
  expect(jsonld['@type']).toBe('Product');
  expect(jsonld.offers.price).toBe('40.00');

  await expect(page.locator('.galeria-miniaturas button')).toHaveCount(5);
  await page.locator('.galeria-miniaturas button').nth(2).click();
  await expect(page.locator('.galeria-contador')).toHaveText('3 / 5');
  await expect(page.getByRole('link', { name: 'Compartir por WhatsApp' })).toHaveAttribute('href', /wa\.me.*tarjetas-nfc-215/);

  // Enlace del sitio anterior con id numérico → URL con nombre
  await page.goto('/producto/3');
  await expect(page).toHaveURL(/\/producto\/tarjetas-nfc-215$/);

  await page.getByRole('button', { name: 'Más', exact: true }).click();
  await page.locator('.ficha-compra').getByRole('button', { name: 'Agregar' }).click();
  await expect(page.locator('.aviso')).toContainText('Agregado al carrito');
  await expect(page.locator('.btn-carrito .contador')).toHaveText('2');
  await sinDesbordeHorizontal(page);
  if (isMobile) await expect(page.locator('.barra-compra')).toBeVisible();
  await captura(page, 'producto');

  // Agotado: sin botón de compra
  await page.goto('/producto/proyector-hy300');
  await expect(page.locator('.agotado-aviso')).toBeVisible();
  await expect(page.locator('.ficha-compra')).toHaveCount(0);
});

test('carrito: cupón inválido, validaciones y pedido por WhatsApp', async ({ page }) => {
  await page.goto('/producto/tarjetas-nfc-215');
  await page.locator('.ficha-compra').getByRole('button', { name: 'Comprar ahora' }).click();
  await expect(page).toHaveURL(/\/carrito$/);
  await expect(page.locator('.lista-carrito li')).toHaveCount(1);

  await page.getByPlaceholder('Ej. FAS-AB12C').fill('NOEXISTE');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('.cupon-cliente')).toContainText('Este código no existe');

  const enviar = page.getByRole('button', { name: /Generar cotización/ });
  await enviar.click();
  await expect(page.locator('p.error')).toContainText('Completa tu nombre');

  await page.getByLabel('Nombre completo').fill('Cliente E2E Playwright');
  await page.getByLabel('Celular (WhatsApp)').fill('912345678');
  await page.getByLabel('Forma de pago').selectOption('Yape');

  // Lugar de entrega: cada opción pide sus datos; la hora aproximada ya no existe.
  await expect(page.locator('.opcion-entrega')).toHaveCount(4);
  await expect(page.getByLabel('Hora aproximada')).toHaveCount(0);
  await page.getByLabel(/Envío a nivel local/).check();
  await expect(page.locator('.nota-entrega')).toContainText('se paga al momento de la entrega');
  await page.getByLabel(/Envío a nivel nacional/).check();
  await expect(page.locator('.nota-entrega')).toContainText('Shalom');
  await page.getByLabel('Ciudad').fill('Arequipa');
  await page.getByLabel('Agencia Shalom').fill('Av. Ejército 101');
  await page.getByLabel('DNI de quien recoge').fill('123');
  await enviar.click();
  await expect(page.locator('p.error')).toContainText('DNI');
  await page.getByLabel(/Estación del Tren/).check();
  const estacion = page.locator('select[name="estacion"]');
  await expect(estacion.locator('option')).toHaveText(['Elige una estación', 'Estación Villa El Salvador', 'Estación La Cultura', 'Estación Grau']);
  await estacion.selectOption('Grau');
  await enviar.click();
  await expect(page.locator('p.error')).toContainText('términos');
  await page.getByLabel(/Acepto los/).check();
  await sinDesbordeHorizontal(page);
  await captura(page, 'carrito');

  // Se genera la cotización y se envía su código por WhatsApp.
  const [ventana] = await Promise.all([page.waitForEvent('popup'), enviar.click()]);
  await expect(page.locator('.exito h1')).toHaveText('¡Cotización generada!');
  const codigo = (await page.locator('.codigo-cotizacion').textContent())!.trim();
  expect(codigo).toMatch(/^COT-\d{5}-[A-Z0-9]{4}$/);
  await expect.poll(() => decodeURIComponent(ventana.url().replace(/\+/g, ' '))).toContain(codigo);
  await expect(page.locator('.btn-carrito .contador')).toHaveCount(0);

  // La cotización se puede ver e imprimir.
  await page.getByRole('link', { name: 'Ver cotización' }).click();
  await expect(page.locator('.cotizacion-codigo strong')).toHaveText(codigo);
  await expect(page.locator('.cotizacion-datos')).toContainText('Estación Grau');
  await expect(page.locator('.cotizacion-total .total')).toContainText('S/ 40.00');
  await captura(page, 'cotizacion');
});

test('cookies: aviso en la primera visita y Analytics solo con consentimiento', async ({ page }) => {
  const analiticas: string[] = [];
  page.on('request', r => r.url().includes('googletagmanager.com') && analiticas.push(r.url()));
  await page.goto('/');
  const aviso = page.locator('.aviso-cookies');
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText('cookies');
  await captura(page, 'cookies');
  expect(analiticas, 'Google Analytics no debe cargarse antes de aceptar').toHaveLength(0);

  await aviso.getByRole('button', { name: 'Configurar' }).click();
  await expect(aviso.getByRole('checkbox').first()).toBeDisabled(); // necesarias, siempre activas
  await aviso.getByRole('button', { name: 'Rechazar opcionales' }).click();
  await expect(aviso).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.aviso-cookies')).toHaveCount(0);
  expect(analiticas).toHaveLength(0);

  // Reabrir desde el pie y aceptar: recién ahí se carga Analytics.
  await page.getByRole('button', { name: 'Preferencias de cookies' }).click();
  await page.locator('.aviso-cookies').getByRole('button', { name: 'Rechazar opcionales' }).waitFor();
  await page.locator('.aviso-cookies .cookie-tipo').nth(1).locator('input').check();
  await page.locator('.aviso-cookies').getByRole('button', { name: 'Guardar preferencias' }).click();
  await expect.poll(() => analiticas.length).toBeGreaterThan(0);
});

test('tema Luz, Oscuro y Sistema', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const fondo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const claro = await fondo();

  await page.locator('.cabecera .selector-tema button').first().click();
  await page.getByRole('menuitemradio', { name: 'Oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
  expect(await fondo()).not.toBe(claro);
  await captura(page, 'tema-oscuro');

  // Se recuerda al volver.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');

  // Sistema: sigue al dispositivo.
  await page.locator('.cabecera .selector-tema button').first().click();
  await page.getByRole('menuitemradio', { name: 'Sistema' }).click();
  expect(await fondo()).toBe(claro);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await fondo()).not.toBe(claro);
});

test('páginas legales y Libro de Reclamaciones', async ({ page }) => {
  await page.goto('/');
  await page.locator('.pie').getByRole('link', { name: 'Política de privacidad' }).click();
  await expect(page.locator('h1')).toHaveText('Política de privacidad');
  await expect(page.locator('.texto-legal')).toContainText('ARCO');
  await page.goto('/legal/cookies');
  await expect(page.locator('.texto-legal table')).toContainText('fastore_carrito');
  await page.goto('/legal/terminos');
  await expect(page.locator('.texto-legal')).toContainText('Shalom');

  await page.goto('/libro-de-reclamaciones');
  await expect(page.locator('h1')).toHaveText('Libro de Reclamaciones');
  await page.getByLabel('Nombre completo').fill('Consumidor E2E');
  await page.getByLabel('N° de documento').fill('12345678');
  await page.getByLabel('Teléfono').fill('987654321');
  await page.getByLabel('Correo electrónico').fill('e2e@juarezcampos.test');
  await page.getByLabel('Domicilio', { exact: true }).fill('Av. Prueba 123, Lima');
  await page.getByLabel('Descripción del producto o servicio').fill('Tarjetas NFC 215');
  await page.getByLabel('Detalle', { exact: true }).fill('Prueba automática del libro de reclamaciones.');
  await page.getByLabel(/Pedido del consumidor/).fill('Ninguno, es una prueba.');
  await page.getByRole('button', { name: 'Registrar hoja de reclamación' }).click();
  await expect(page.locator('p.error')).toContainText('aceptar');
  await page.getByLabel(/Declaro que los datos/).check();
  await page.getByRole('button', { name: 'Registrar hoja de reclamación' }).click();
  await expect(page.locator('.codigo-cotizacion')).toHaveText(/^LR-\d{4}-\d{5}$/);
  await captura(page, 'reclamo');
});

test('página inexistente', async ({ page }) => {
  await page.goto('/esto-no-existe');
  await expect(page.locator('h1')).toHaveText('No encontramos esta página');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});
