import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TiendaApi } from '../core/api';
import { Cotizacion } from '../core/modelos';
import { SeoService } from '../core/seo';
import { Icono } from '../shared/icono';
import { SolesPipe } from '../shared/util';

/** Cotización pública por su código: se puede ver, imprimir o guardar como PDF y enviar por WhatsApp. */
@Component({
  selector: 'app-cotizacion',
  imports: [RouterLink, DatePipe, Icono, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor pagina-cotizacion">
      @if (noExiste()) {
        <div class="vacio pagina-vacia">
          <app-icono nombre="buscar" [tamano]="56" />
          <h1>No encontramos esa cotización</h1>
          <p>Revisa el código (por ejemplo COT-00012-K7QM) o escríbenos por WhatsApp.</p>
          <a routerLink="/tienda" class="btn primario">Ir a la tienda</a>
        </div>
      } @else if (c(); as c) {
        <article class="cotizacion panel">
          <header class="cotizacion-cabecera">
            <div class="logo">
              <img class="logo-icono" src="img/marca/icono.png" alt="" width="46" height="40" />
              <img class="logo-texto" src="img/marca/logo.png" alt="FAStore" width="116" height="24" />
            </div>
            <div class="cotizacion-codigo">
              <span>Cotización</span>
              <strong>{{ c.codigo }}</strong>
              <small>Emitida el {{ c.fecha | date: 'dd/MM/yyyy' }} · vence el {{ c.vence | date: 'dd/MM/yyyy' }}</small>
              @if (c.vencida) { <span class="etiqueta-estado abandonado">Vencida</span> }
              @else if (c.estado === 'vendido') { <span class="etiqueta-estado vendido">Pagada</span> }
              @else { <span class="etiqueta-estado pedido">Vigente</span> }
            </div>
          </header>

          <section class="cotizacion-datos">
            <div><dt>Cliente</dt><dd>{{ c.cliente }}</dd></div>
            <div><dt>Entrega</dt><dd>{{ c.entrega.nombre }}@if (c.entrega.lugar) { · {{ c.entrega.lugar }} }</dd></div>
            <div><dt>Pago</dt><dd>{{ c.pago || 'Por coordinar' }}</dd></div>
          </section>

          <table class="tabla cotizacion-items">
            <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Importe</th></tr></thead>
            <tbody>
              @for (i of c.items; track $index) {
                <tr>
                  <td class="cot-producto">
                    @if (i.imagen) { <img [src]="i.imagen" alt="" width="44" height="44" /> }
                    @if (i.slug) { <a [routerLink]="['/producto', i.slug]">{{ i.nombre }}</a> } @else { {{ i.nombre }} }
                  </td>
                  <td class="num">{{ i.cantidad }}</td>
                  <td class="num">{{ i.precio | soles }}</td>
                  <td class="num">{{ i.importe | soles }}</td>
                </tr>
              }
            </tbody>
          </table>

          <div class="resumen-total cotizacion-total">
            <div><span>Subtotal</span><span>{{ c.subtotal | soles }}</span></div>
            @if (c.descuento) { <div><span>Descuento ({{ c.cupon }})</span><span class="verde">− {{ c.descuento | soles }}</span></div> }
            <div><span>Entrega</span><span>{{ c.entrega.tipo === 'estacion' || c.entrega.tipo === 'tienda' ? 'Gratis' : 'Se coordina aparte' }}</span></div>
            <div class="total"><span>Total</span><strong>{{ c.total | soles }}</strong></div>
          </div>
          <p class="tenue pequeno">{{ c.entrega.detalle }} Precios en soles (PEN). La cotización reserva los precios hasta su vencimiento, sujeta a stock.</p>

          <div class="cotizacion-acciones no-imprimir">
            <a class="btn whatsapp grande" [href]="c.whatsapp_url" target="_blank" rel="noopener"><app-icono nombre="whatsapp" [tamano]="18" /> Enviar código por WhatsApp</a>
            <button type="button" class="btn grande" (click)="imprimir()"><app-icono nombre="subir" [tamano]="18" /> Imprimir o guardar PDF</button>
          </div>
        </article>
      } @else {
        <div class="panel esqueleto alto"></div>
      }
    </div>
  `,
})
export class CotizacionPagina {
  private api = inject(TiendaApi);
  private seo = inject(SeoService);
  config = toSignal(this.api.config$);
  codigo = input.required<string>();
  c = signal<Cotizacion | null>(null);
  noExiste = signal(false);

  constructor() {
    effect(() => {
      const codigo = this.codigo();
      this.seo.aplicar({ titulo: `Cotización ${codigo}`, indexar: false });
      this.api.cotizacion(codigo).subscribe({ next: c => this.c.set(c), error: () => this.noExiste.set(true) });
    });
  }

  imprimir(): void {
    window.print();
  }
}
