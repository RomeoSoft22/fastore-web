import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../core/carrito';
import { Producto } from '../core/modelos';
import { Icono } from './icono';
import { ESTADOS, SolesPipe } from './util';

@Component({
  selector: 'app-tarjeta-producto',
  imports: [RouterLink, Icono, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = producto();
    <article class="tarjeta" [class.agotado]="p.estado === 'agotado'">
      <a class="tarjeta-foto" [routerLink]="['/producto', p.slug]" [attr.aria-label]="p.nombre">
        @if (p.imagen) {
          <img [src]="p.imagen.miniatura" [alt]="p.nombre" loading="lazy" width="480" height="480" />
        } @else {
          <span class="sin-foto"><app-icono nombre="imagen" [tamano]="40" /></span>
        }
        <span class="insignias">
          @if (p.descuento > 0) { <span class="insignia oferta">-{{ p.descuento }}%</span> }
          @if (p.estado !== 'disponible') { <span class="insignia" [class]="p.estado">{{ estados[p.estado] }}</span> }
          @if (p.condicion === 'usado') { <span class="insignia usado">Usado</span> }
        </span>
      </a>
      <div class="tarjeta-cuerpo">
        @if (p.categoria) { <a class="tarjeta-cat" [routerLink]="['/categoria', p.categoria.slug]">{{ p.categoria.nombre }}</a> }
        <h3><a [routerLink]="['/producto', p.slug]">{{ p.nombre }}</a></h3>
        <div class="tarjeta-pie">
          <div class="precio">
            <strong>{{ p.precio_final | soles }}</strong>
            @if (p.descuento > 0) { <s>{{ p.precio | soles }}</s> }
          </div>
          <button type="button" class="btn-icono primario" [disabled]="p.estado === 'agotado'"
            (click)="carrito.agregar(p)" [attr.aria-label]="'Agregar ' + p.nombre + ' al carrito'">
            <app-icono nombre="carrito" [tamano]="18" />
          </button>
        </div>
      </div>
    </article>
  `,
})
export class TarjetaProducto {
  carrito = inject(CarritoService);
  producto = input.required<Producto>();
  estados = ESTADOS;
}
