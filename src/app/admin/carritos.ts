import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Pagina } from '../core/modelos';
import { Icono } from '../shared/icono';
import { HacePipe, SolesPipe, mensajeError } from '../shared/util';
import { AdminApi, CarritoAdmin } from './admin-api';
import { RegistrarVenta } from './registrar-venta';

const VISTAS = [
  { valor: 'abandonados', texto: 'Abandonados' },
  { valor: 'activos', texto: 'En curso' },
  { valor: 'pedidos', texto: 'Cotizaciones' },
  { valor: 'vendidos', texto: 'Vendidos' },
  { valor: 'descartados', texto: 'Descartados' },
  { valor: 'todos', texto: 'Todos' },
];

const ESTADOS: Record<string, string> = { activo: 'En curso', pedido: 'Cotización enviada', vendido: 'Vendido', descartado: 'Descartado' };
const ICONOS_HISTORIAL: Record<string, string> = {
  inicio: 'carrito', producto: 'mas', pedido: 'documento', contacto: 'whatsapp', venta: 'check', actividad: 'reloj',
};

/**
 * Seguimiento de pedidos y carritos: quién agregó productos y no concluyó, las cotizaciones enviadas
 * y las ventas. El detalle muestra cliente, entrega, cotización, productos, totales, historial y
 * mensajes de WhatsApp listos según el momento del cliente.
 */
@Component({
  selector: 'app-carritos',
  imports: [FormsModule, RouterLink, DatePipe, Icono, SolesPipe, HacePipe, RegistrarVenta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carritos.html',
})
export class CarritosPagina {
  private api = inject(AdminApi);
  private router = inject(Router);
  params = toSignal(inject(ActivatedRoute).queryParams, { initialValue: {} as Record<string, string> });

  vistas = VISTAS;
  estados = ESTADOS;
  iconos = ICONOS_HISTORIAL;
  lista = signal<(Pagina<CarritoAdmin> & { conteos: Record<string, number> }) | null>(null);
  abierto = signal<number | null>(null);
  q = signal('');
  conContacto = signal(false);
  pagina = signal(1);
  error = signal('');
  venta = signal(false);
  recarga = signal(0);
  notas: Record<number, string> = {};

  constructor() {
    effect(() => {
      this.recarga();
      const filtros = { vista: this.params()['vista'] || 'abandonados', q: this.q(), contacto: this.conContacto() ? 1 : '', page: this.pagina() };
      this.api.carritos(filtros).subscribe({
        next: r => {
          this.lista.set(r);
          r.datos.forEach(c => (this.notas[c.id] = c.nota ?? ''));
        },
        error: e => this.error.set(mensajeError(e)),
      });
    });
  }

  vista(): string {
    return this.params()['vista'] || 'abandonados';
  }

  elegirVista(valor: string): void {
    this.pagina.set(1);
    this.abierto.set(null);
    this.router.navigate([], { queryParams: { vista: valor === 'abandonados' ? null : valor } });
  }

  /** Abre WhatsApp con el mensaje elegido y registra el contacto. */
  contactar(c: CarritoAdmin, url: string): void {
    window.open(url, '_blank', 'noopener');
    this.actualizar(c, { contactado: true });
  }

  actualizar(c: CarritoAdmin, cambios: Record<string, unknown>): void {
    this.error.set('');
    this.api.actualizarCarrito(c.id, cambios).subscribe({
      next: nuevo => this.lista.update(l => l && { ...l, datos: l.datos.map(x => (x.id === c.id ? nuevo : x)) }),
      error: e => this.error.set(mensajeError(e)),
    });
  }

  costoTotal(c: CarritoAdmin): number | null {
    if (c.productos.some(p => p.costo === null)) return null;
    return c.productos.reduce((t, p) => t + (p.costo ?? 0) * p.cantidad, 0);
  }

  ventaRegistrada(): void {
    this.venta.set(false);
    this.elegirVista('vendidos');
    this.recarga.update(v => v + 1);
  }

  celularWhatsapp(c: CarritoAdmin): string {
    const n = (c.celular ?? '').replace(/\D/g, '');
    return 'https://wa.me/' + (n.length === 9 ? '51' + n : n);
  }
}
