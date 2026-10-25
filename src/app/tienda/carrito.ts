import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TiendaApi } from '../core/api';
import { CarritoService } from '../core/carrito';
import { Contacto } from '../core/modelos';
import { SeoService } from '../core/seo';
import { Icono } from '../shared/icono';
import { SolesPipe, mensajeError } from '../shared/util';

/** Carrito y datos de entrega. El pedido se envía por WhatsApp y queda registrado en la tienda. */
@Component({
  selector: 'app-carrito',
  imports: [FormsModule, RouterLink, Icono, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carrito.html',
})
export class CarritoPagina {
  carrito = inject(CarritoService);
  private api = inject(TiendaApi);
  config = toSignal(this.api.config$);

  codigo = signal('');
  cupon = signal<{ codigo: string; etiqueta: string; descuento: number; subtotal: number } | null>(null);
  errorCupon = signal('');
  /** El descuento se recalcula si cambia el carrito: se vuelve a validar al cambiar el subtotal. */
  descuento = computed(() => {
    const c = this.cupon();
    return c && c.subtotal === this.carrito.total() ? c.descuento : 0;
  });
  totalFinal = computed(() => Math.round((this.carrito.total() - this.descuento()) * 100) / 100);

  constructor() {
    inject(SeoService).aplicar({ titulo: 'Tu carrito', indexar: false });
    effect(() => {
      const c = this.cupon();
      const subtotal = this.carrito.total();
      if (c && c.subtotal !== subtotal) this.validar(c.codigo, subtotal);
    });
  }

  aplicarCupon(): void {
    const codigo = this.codigo().trim().toUpperCase();
    if (codigo) this.validar(codigo, this.carrito.total());
  }

  quitarCupon(): void {
    this.cupon.set(null);
    this.codigo.set('');
    this.errorCupon.set('');
  }

  private validar(codigo: string, subtotal: number): void {
    this.errorCupon.set('');
    this.api.validarCupon(codigo, subtotal).subscribe({
      next: r => this.cupon.set({ ...r, subtotal }),
      error: e => {
        this.cupon.set(null);
        this.errorCupon.set(mensajeError(e, 'No pudimos validar el código.'));
      },
    });
  }

  form: Contacto = this.formInicial();
  acepta = false;
  enviando = signal(false);
  error = signal('');
  enviado = signal<{ cotizacion: string; vence: string; whatsapp_url: string } | null>(null);
  /** Detalle del lugar de entrega elegido (gratis, costo adicional, Shalom…). */
  entregaElegida = signal(this.form.entrega);

  cambio(campo: keyof Contacto): void {
    if (campo === 'entrega') this.entregaElegida.set(this.form.entrega);
    this.carrito.actualizarContacto({ [campo]: this.form[campo] });
  }

  detalleEntrega(): string {
    return this.config()?.entregas.find(e => e.clave === this.entregaElegida())?.detalle ?? '';
  }

  async enviar(): Promise<void> {
    this.error.set('');
    const problema = this.validarFormulario();
    if (problema) {
      this.error.set(problema);
      return;
    }
    const f = this.form;
    // Solo se envían los datos del lugar de entrega elegido.
    const contacto: Contacto = {
      nombre: f.nombre.trim(),
      celular: f.celular.trim(),
      correo: f.correo?.trim() || undefined,
      entrega: f.entrega,
      pago: f.pago,
      ...(f.entrega === 'estacion' ? { estacion: f.estacion } : {}),
      ...(f.entrega === 'local' || f.entrega === 'nacional' ? { direccion: f.direccion?.trim(), ciudad: f.ciudad?.trim() } : {}),
      ...(f.entrega === 'nacional' ? { dni: f.dni?.trim() } : {}),
    };
    // Se abre la pestaña antes de esperar al servidor para que el navegador no la bloquee.
    const ventana = window.open('', '_blank');
    this.enviando.set(true);
    try {
      const r = await this.carrito.enviarPedido(contacto, this.cupon()?.codigo ?? null, this.acepta);
      this.enviado.set(r);
      if (ventana) ventana.location.href = r.whatsapp_url;
    } catch (e) {
      ventana?.close();
      this.error.set(mensajeError(e, 'No pudimos registrar tu pedido. Inténtalo de nuevo.'));
    } finally {
      this.enviando.set(false);
    }
  }

  private validarFormulario(): string {
    const f = this.form;
    if (!f.nombre?.trim() || !f.celular?.trim() || !f.entrega || !f.pago) return 'Completa tu nombre, celular, lugar de entrega y forma de pago.';
    if (!/^\+?[0-9 ]{9,15}$/.test(f.celular.trim())) return 'Ingresa un celular válido (9 dígitos).';
    if (f.entrega === 'estacion' && !f.estacion) return 'Elige la estación del tren.';
    if (f.entrega === 'local' && (!f.direccion?.trim() || !f.ciudad?.trim())) return 'Indica la dirección y el distrito de entrega.';
    if (f.entrega === 'nacional') {
      if (!f.ciudad?.trim() || !f.direccion?.trim()) return 'Indica la ciudad y la agencia Shalom donde recogerás.';
      if (!/^[0-9]{8}$|^[A-Za-z0-9]{9,12}$/.test(f.dni?.trim() ?? '')) return 'Shalom pide el DNI (8 dígitos) de quien recoge el envío.';
    }
    if (!this.acepta) return 'Debes aceptar los términos y condiciones y la política de privacidad.';
    return '';
  }

  private formInicial(): Contacto {
    const guardado = { ...this.carrito.contacto() } as Partial<Contacto> & { hora?: string };
    delete guardado.hora; // la hora aproximada ya no se pide
    return { nombre: '', celular: '', entrega: '', estacion: '', direccion: '', ciudad: '', dni: '', pago: '', ...guardado } as Contacto;
  }
}
