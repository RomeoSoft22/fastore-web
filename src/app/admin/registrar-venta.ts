import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icono } from '../shared/icono';
import { SolesPipe, mensajeError } from '../shared/util';
import { AdminApi, ProductoAdmin } from './admin-api';

interface Linea {
  id: number;
  nombre: string;
  imagen: string | null;
  cantidad: number;
  precio: number;
  costo: number | null;
}

/** Venta cerrada fuera de la web (WhatsApp, en persona): queda confirmada con sus costos. */
@Component({
  selector: 'app-registrar-venta',
  imports: [FormsModule, Icono, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="velo" (click)="cerrar.emit()"></div>
    <form class="modal ancho" (submit)="$event.preventDefault(); guardar()">
      <div class="panel-titulo">
        <h2>Registrar venta</h2>
        <button type="button" class="btn-icono" (click)="cerrar.emit()" aria-label="Cerrar"><app-icono nombre="cerrar" /></button>
      </div>

      <label>Agregar producto
        <input type="search" placeholder="Busca por nombre o código" [ngModel]="q()" (ngModelChange)="q.set($event)" name="q" autocomplete="off" />
      </label>
      @if (resultados().length) {
        <ul class="sugerencias">
          @for (p of resultados(); track p.id) {
            <li><button type="button" (click)="agregar(p)">
              @if (p.imagen) { <img [src]="p.imagen.miniatura" alt="" width="36" height="36" /> }
              <span>{{ p.nombre }}<small class="tenue">#{{ p.id }} · stock {{ p.stock }}</small></span>
              <b>{{ p.precio_final | soles }}</b>
            </button></li>
          }
        </ul>
      }

      @if (lineas().length) {
        <table class="tabla lineas-venta">
          <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio c/u</th><th class="num">Subtotal</th><th></th></tr></thead>
          <tbody>
            @for (l of lineas(); track l.id; let i = $index) {
              <tr>
                <td>{{ l.nombre }} @if (l.costo === null) { <small class="error-texto">sin costo</small> }</td>
                <td class="num"><input type="number" min="1" [ngModel]="l.cantidad" (ngModelChange)="cambiar(i, 'cantidad', $event)" [name]="'c' + l.id" aria-label="Cantidad" /></td>
                <td class="num"><input type="number" min="0" step="0.01" [ngModel]="l.precio" (ngModelChange)="cambiar(i, 'precio', $event)" [name]="'p' + l.id" aria-label="Precio" /></td>
                <td class="num">{{ l.cantidad * l.precio | soles }}</td>
                <td><button type="button" class="btn-icono peligro" (click)="quitar(i)" aria-label="Quitar"><app-icono nombre="basura" [tamano]="16" /></button></td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="tenue">Busca y agrega los productos vendidos.</p>
      }

      <div class="dos-columnas">
        <label>Fecha de venta <input type="date" name="fecha" [max]="hoy" [(ngModel)]="fecha" /></label>
        <label>Forma de pago
          <select name="pago" [(ngModel)]="pago"><option value="">—</option><option>Yape</option><option>Plin</option><option>Efectivo</option><option>Transferencia</option></select>
        </label>
        <label>Cliente <small class="tenue">(opcional)</small><input name="nombre" [(ngModel)]="nombre" /></label>
        <label>Celular <small class="tenue">(opcional)</small><input name="celular" type="tel" [(ngModel)]="celular" /></label>
        <label>Cupón <small class="tenue">(opcional)</small><input name="cupon" [(ngModel)]="cupon" placeholder="FAS-XXXXX" /></label>
        <label>Descuento S/ <small class="tenue">(si no usas cupón)</small><input name="descuento" type="number" min="0" step="0.01" [ngModel]="descuento()" (ngModelChange)="descuento.set(+$event || 0)" /></label>
      </div>
      <label>Nota <textarea name="nota" rows="2" [(ngModel)]="nota"></textarea></label>

      <div class="resumen-total">
        <div><span>Subtotal</span><span>{{ subtotal() | soles }}</span></div>
        @if (descuento()) { <div><span>Descuento</span><span>− {{ descuento() | soles }}</span></div> }
        <div class="total"><span>Total cobrado</span><strong>{{ subtotal() - descuento() | soles }}</strong></div>
      </div>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      <div class="acciones-form fila">
        <button type="button" class="btn" (click)="cerrar.emit()">Cancelar</button>
        <button type="submit" class="btn primario" [disabled]="guardando() || !lineas().length">{{ guardando() ? 'Guardando…' : 'Registrar venta' }}</button>
      </div>
    </form>
  `,
})
export class RegistrarVenta {
  private api = inject(AdminApi);
  cerrar = output();
  registrada = output();

  q = signal('');
  resultados = signal<ProductoAdmin[]>([]);
  lineas = signal<Linea[]>([]);
  descuento = signal(0);
  guardando = signal(false);
  error = signal('');
  hoy = new Date().toLocaleDateString('en-CA');
  fecha = this.hoy;
  pago = '';
  nombre = '';
  celular = '';
  cupon = '';
  nota = '';
  subtotal = computed(() => Math.round(this.lineas().reduce((t, l) => t + l.cantidad * l.precio, 0) * 100) / 100);
  private espera?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const q = this.q().trim();
      clearTimeout(this.espera);
      if (q.length < 2) {
        this.resultados.set([]);
        return;
      }
      this.espera = setTimeout(() => this.api.productos({ q, por_pagina: 6, activo: 1 }).subscribe(r => this.resultados.set(r.datos)), 250);
    });
  }

  agregar(p: ProductoAdmin): void {
    const existente = this.lineas().findIndex(l => l.id === p.id);
    if (existente >= 0) this.cambiar(existente, 'cantidad', this.lineas()[existente].cantidad + 1);
    else this.lineas.update(l => [...l, { id: p.id, nombre: p.nombre, imagen: p.imagen?.miniatura ?? null, cantidad: 1, precio: p.precio_final, costo: p.costo }]);
    this.q.set('');
  }

  cambiar(i: number, campo: 'cantidad' | 'precio', valor: number): void {
    this.lineas.update(l => l.map((x, j) => (j === i ? { ...x, [campo]: Math.max(campo === 'cantidad' ? 1 : 0, Number(valor) || 0) } : x)));
  }

  quitar(i: number): void {
    this.lineas.update(l => l.filter((_, j) => j !== i));
  }

  guardar(): void {
    this.error.set('');
    this.guardando.set(true);
    this.api
      .registrarVenta({
        fecha: this.fecha,
        pago: this.pago || null,
        nombre: this.nombre || null,
        celular: this.celular || null,
        cupon: this.cupon.trim() || null,
        descuento: this.cupon.trim() ? null : this.descuento(),
        nota: this.nota || null,
        items: this.lineas().map(l => ({ id: l.id, cantidad: l.cantidad, precio: l.precio })),
      })
      .subscribe({
        next: () => this.registrada.emit(),
        error: e => {
          this.guardando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
}
