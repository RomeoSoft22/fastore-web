import { Browser, Page, expect, test } from '@playwright/test';

/**
 * Administración con ingreso real por identidad (local). Las credenciales vienen del entorno:
 *   FASTORE_E2E_CORREO, FASTORE_E2E_CLAVE  (cuenta de identidad con rol ADMIN en FASTORE)
 * Crea datos de prueba: un cupón E2E-*, una venta manual de "Cliente E2E" y el costo del producto 3.
 */
const correo = process.env['FASTORE_E2E_CORREO'];
const clave = process.env['FASTORE_E2E_CLAVE'];
test.skip(!correo || !clave, 'Define FASTORE_E2E_CORREO y FASTORE_E2E_CLAVE para probar el admin.');
test.describe.configure({ mode: 'serial' });

let page: Page;
const captura = (nombre: string) => page.screenshot({ path: `test-results/capturas/admin-${nombre}.png`, fullPage: true });
let cotizacion = '';
const codigo = `E2E-${Date.now().toString(36).toUpperCase().slice(-5)}`;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // Para todo el contexto (también las ventanas emergentes): nunca se abre WhatsApp de verdad.
  await page.context().route(/wa\.me|whatsapp\.com/, r => r.fulfill({ body: 'whatsapp' }));
  // Cookies ya elegidas: el aviso no tapa los botones.
  await page.addInitScript(() => localStorage.setItem('fastore_consentimiento', JSON.stringify({ necesarias: true, analiticas: false, fecha: '2026-10-25T00:00:00Z', version: 1 })));
});

test('ingreso con identidad', async () => {
  await page.goto('/admin');
  // Sin sesión, la app redirige a identidad; con sesión SSO abierta vuelve sola al dashboard.
  await expect(page.locator('#email').or(page.getByRole('heading', { name: 'Dashboard' }))).toBeVisible({ timeout: 60_000 });
  if (await page.locator('#email').isVisible()) {
    await page.locator('#email').fill(correo!);
    await page.locator('#password').fill(clave!);
    await page.locator('#password').press('Enter');
  }
  await page.waitForURL(/localhost:4700\/admin/, { timeout: 60_000 });
  await expect(page.locator('h1')).toHaveText('Dashboard');
  await expect(page.locator('.admin-usuario')).not.toBeEmpty();
});

test('fórmula de costos y costo de un producto', async () => {
  await page.goto('/admin/costos');
  await expect(page.locator('.formula')).toContainText('Costo unitario');

  await page.goto('/admin/productos/3');
  await page.getByLabel('Costo manufactura (S/)').fill('12');
  await expect(page.locator('.formula.compacta')).toContainText('S/ 15.30'); // 12 × 1.15 + 1.50
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('.exito-texto')).toContainText('Cambios guardados');
  await captura('producto-editar');
});

test('descripción con editor tipo Word y etiquetas', async () => {
  await page.goto('/admin/productos/3');
  const hoja = page.locator('.editor-contenido');
  await expect(hoja).toContainText('Tarjetas NFC 215');
  // Se reescribe la descripción completa: la prueba se puede repetir sin acumular texto.
  await hoja.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('Tarjetas NFC 215 de 504 bytes, 10 unidades. ');
  await page.getByRole('button', { name: 'Negrita (Ctrl+B)' }).click();
  await page.keyboard.type('Compatible con iPhone y Android');
  await page.getByRole('button', { name: 'Negrita (Ctrl+B)' }).click();
  await expect(hoja.locator('strong')).toHaveText('Compatible con iPhone y Android');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Viñetas' }).click();
  await page.keyboard.type('Programables con la app NFC Tools');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Tarjeta de presentación digital');
  await expect(hoja.locator('ul li')).toHaveCount(2);

  const etiquetas = page.locator('#etiqueta');
  await etiquetas.fill('tarjeta nfc, ntag215');
  await etiquetas.press('Enter');
  await etiquetas.fill('tarjeta de presentación digital');
  await etiquetas.press('Enter');
  await expect(page.locator('.campo-chips .chip-etiqueta')).toHaveCount(3);
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('.exito-texto')).toContainText('Cambios guardados');
  await captura('editor');

  // En la tienda: negrita, viñetas y etiquetas que llevan a la búsqueda.
  await page.goto('/producto/tarjetas-nfc-215');
  await expect(page.locator('.contenido-html strong')).toContainText('Compatible con iPhone y Android');
  await expect(page.locator('.contenido-html ul li')).toHaveText(['Programables con la app NFC Tools', 'Tarjeta de presentación digital']);
  await expect(page.locator('meta[name="keywords"]')).toHaveAttribute('content', /ntag215/);
  await page.locator('.etiquetas-producto a', { hasText: 'ntag215' }).click();
  await expect(page).toHaveURL(/q=ntag215/);
  await expect(page.locator('.tarjeta h3', { hasText: 'Tarjetas NFC 215' }).first()).toBeVisible();
});

test('listado de productos con contadores, etiquetas y avisos', async () => {
  await page.goto('/admin/productos');
  await expect(page.locator('.tarjeta-admin').first()).toBeVisible();
  await expect(page.locator('.bandeja-grupo button', { hasText: 'Todos' })).toContainText('19');
  await expect(page.locator('.aviso-admin').first()).toContainText('sin costo');
  await captura('productos');

  await page.locator('.bandeja-grupo button', { hasText: 'Sin costo' }).click();
  await expect(page.locator('.bandeja-titulo h1')).toContainText('Sin costo');
  await expect(page.locator('.tarjeta-admin', { hasText: 'Tarjetas NFC 215' }).filter({ hasNotText: 'Negro' }).filter({ hasNotText: 'Metal' })).toHaveCount(0);

  await page.locator('.etiqueta-cat', { hasText: 'NFC' }).click();
  await page.locator('.bandeja-grupo button', { hasText: 'Todos' }).click();
  await expect(page.locator('.tarjeta-admin')).toHaveCount(8);
});

test('código de descuento', async () => {
  await page.goto('/admin/cupones');
  await page.getByRole('button', { name: 'Generar código' }).click();
  await expect(page.locator('.modal input[name="codigo"]')).toHaveValue(/^FAS-/);
  await page.locator('.modal input[name="codigo"]').fill(codigo);
  await page.locator('.modal input[name="descripcion"]').fill('Prueba automática');
  await page.locator('.modal input[name="valor"]').fill('10');
  await page.locator('.modal input[name="minimo"]').fill('50');
  await page.locator('.modal').getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('.cupon', { hasText: codigo })).toContainText('10% de descuento');
  await captura('cupones');
});

test('el cliente usa el código en el carrito', async () => {
  await page.goto('/producto/tarjetas-nfc-215');
  await page.getByRole('button', { name: 'Más', exact: true }).click();
  await page.locator('.ficha-compra').getByRole('button', { name: 'Comprar ahora' }).click();
  await page.getByPlaceholder('Ej. FAS-AB12C').fill(codigo.toLowerCase());
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('.cupon-aplicado')).toContainText(codigo);
  await expect(page.locator('.resumen-total .total')).toContainText('S/ 72.00'); // 80 − 10%
  await page.getByLabel('Nombre completo').fill('Cliente E2E Cupón');
  await page.getByLabel('Celular (WhatsApp)').fill('987654321');
  await page.getByLabel(/Envío a nivel local/).check();
  await page.getByLabel('Dirección de entrega').fill('Av. Central 456, Mz B Lt 3');
  await page.getByRole('textbox', { name: 'Distrito' }).fill('Villa El Salvador');
  await page.getByLabel('Forma de pago').selectOption('Plin');
  await page.getByLabel(/Acepto los/).check();
  const [ventana] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: /Generar cotización/ }).click()]);
  await expect(page.locator('.exito h1')).toHaveText('¡Cotización generada!');
  cotizacion = (await page.locator('.codigo-cotizacion').textContent())!.trim();
  await expect.poll(() => decodeURIComponent(ventana.url().replace(/\+/g, ' '))).toContain(cotizacion);
  await ventana.close();
});

test('pedido confirmado como venta y venta manual', async () => {
  await page.goto('/admin/carritos?vista=pedidos');
  const fila = page.locator('.carrito-fila', { hasText: cotizacion }).first();
  await fila.locator('.carrito-resumen').click();
  // Detalle completo: cliente, entrega, cotización, productos, totales, historial y mensajes.
  await expect(fila.locator('.bloque-cotizacion')).toContainText(cotizacion);
  await expect(fila.locator('.ficha-carrito')).toContainText('Av. Central 456');
  await expect(fila.locator('.ficha-carrito')).toContainText('Villa El Salvador');
  await expect(fila.locator('.totales-carrito')).toContainText(`Cupón ${codigo}`);
  await expect(fila.locator('.historial li')).not.toHaveCount(0);
  await expect(fila.locator('.historial')).toContainText('Envió el pedido');
  await expect(fila.locator('.mensaje-wa', { hasText: 'Confirmar pedido' })).toBeVisible();
  await captura('carrito-detalle');
  await fila.getByRole('button', { name: 'Marcar vendido' }).click();
  await expect(fila.locator('.etiqueta-estado')).toHaveText('Vendido');
  await expect(fila.locator('.historial')).toContainText('Venta confirmada');

  // "Registrar venta" también está en Pedidos y carritos.
  await page.getByRole('button', { name: 'Registrar venta' }).first().click();
  await page.getByPlaceholder('Busca por nombre o código').fill('lector');
  await page.locator('.sugerencias button').first().click();
  await page.locator('.modal input[name="nombre"]').fill('Cliente E2E Manual');
  await page.locator('.modal').getByRole('button', { name: 'Registrar venta' }).click();
  await expect(page.locator('.modal')).toHaveCount(0);
});

test('dashboard con ventas, ganancia y gráficos', async () => {
  await page.goto('/admin');
  await expect(page.locator('.hero-principal strong')).not.toHaveText('S/ 0.00');
  await expect(page.locator('.kpi', { hasText: 'Ventas confirmadas' }).locator('strong')).not.toHaveText('0');
  await expect(page.locator('app-grafico-columnas svg path').first()).toBeVisible();
  await expect(page.locator('.barras-h').first()).toContainText('NFC');
  await expect(page.locator('.tabla', { hasText: 'Tarjetas NFC 215' }).first()).toBeVisible();

  // Tooltip al pasar por la columna de hoy
  const hoy = new Date().getDate();
  await page.locator('app-grafico-columnas').first().locator('rect').nth(hoy - 1).hover();
  await expect(page.locator('.tooltip')).toContainText('Ganancia');
  await captura('dashboard');

  await page.locator('app-grafico-columnas').first().getByRole('button', { name: 'Ver tabla' }).click();
  await expect(page.locator('.tabla-desplazable')).toContainText('Ventas');
});

test('Libro de Reclamaciones en el admin', async () => {
  await page.goto('/admin/reclamos');
  const reclamo = page.locator('.reclamo').first();
  await expect(reclamo).toContainText('LR-');
  await reclamo.locator('textarea').fill('Respuesta de prueba enviada por correo.');
  await reclamo.getByRole('button', { name: 'Marcar como atendido' }).click();
  await page.getByRole('tab', { name: 'Atendidos' }).click();
  await expect(page.locator('.reclamo').first()).toContainText('Respuesta de prueba');
});

test('banners de la portada', async () => {
  await page.goto('/admin/banners');
  await expect(page.locator('.fila-banner')).toHaveCount(3);
  await captura('banners');
});
