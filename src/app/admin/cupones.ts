import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icono } from '../shared/icono';
import { SolesPipe, mensajeError } from '../shared/util';
import { AdminApi, Cupon } from './admin-api';

interface FormCupon {
  id: number | null;
  codigo: string;
  descripcion: string;
  tipo: 'porcentaje' | 'monto';
  valor: number | null;
  minimo: number | null;
  max_usos: number | null;
  inicio: string;
  fin: string;
  activo: boolean;
}

/** Códigos de descuento: el administrador los genera y el cliente los ingresa en el carrito. */
@Component({
  selector: 'app-cupones',
  imports: [FormsModule, Icono, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-titulo">
      <div>
        <h1>Códigos de descuento</h1>
        <p class="tenue sin-margen">El cliente escribe el código en el carrito antes de enviar su pedido.</p>
      </div>
      <button type="button" class="btn primario" (click)="nuevo()"><app-icono nombre="mas" [tamano]="18" /> Generar código</button>
    </div>
    @if (error() && !form()) { <p class="error" role="alert">{{ error() }}</p> }
    @if (copiado()) { <p class="exito-texto" role="status">Código {{ copiado() }} copiado.</p> }

    <div class="lista-cupones">
      @for (c of cupones(); track c.id) {
        <article class="cupon" [class.inactivo]="!c.activo || !c.vigente">
          <div class="cupon-codigo">
            <button type="button" class="codigo" (click)="copiar(c.codigo)" [attr.aria-label]="'Copiar ' + c.codigo"><code>{{ c.codigo }}</code><app-icono nombre="enlace" [tamano]="14" /></button>
            <b>{{ c.etiqueta }}</b>
            <small class="tenue">{{ c.descripcion }}</small>
          </div>
          <dl class="cupon-datos">
            <div><dt>Compra mínima</dt><dd>{{ c.minimo ? (c.minimo | soles) : 'Sin mínimo' }}</dd></div>
            <div><dt>Usos</dt><dd>{{ c.usos }}{{ c.max_usos ? ' / ' + c.max_usos : '' }}</dd></div>
            <div><dt>Vigencia</dt><dd>{{ c.inicio || 'Hoy' }} → {{ c.fin || 'Sin fin' }}</dd></div>
            <div><dt>Vendido con él</dt><dd>{{ c.ventas ?? 0 | soles }}</dd></div>
          </dl>
          <div class="fila-acciones">
            <span class="etiqueta-estado" [class.vendido]="c.activo && c.vigente">{{ !c.activo ? 'Desactivado' : c.vigente ? 'Vigente' : 'No vigente' }}</span>
            <button type="button" class="btn-icono" (click)="editar(c)" aria-label="Editar"><app-icono nombre="editar" [tamano]="18" /></button>
            <button type="button" class="btn-icono peligro" (click)="eliminar(c)" aria-label="Eliminar"><app-icono nombre="basura" [tamano]="18" /></button>
          </div>
        </article>
      } @empty {
        <div class="vacio panel"><app-icono nombre="etiqueta" [tamano]="40" /><p>Aún no hay códigos. Genera uno para tus campañas en redes.</p></div>
      }
    </div>

    @if (form(); as f) {
      <div class="velo" (click)="form.set(null)"></div>
      <form class="modal" (submit)="$event.preventDefault(); guardar()">
        <h2>{{ f.id ? 'Editar código' : 'Nuevo código' }}</h2>
        <label>Código
          <span class="campo-boton">
            <input name="codigo" required maxlength="30" [(ngModel)]="f.codigo" (ngModelChange)="f.codigo = $event.toUpperCase()" />
            <button type="button" class="btn" (click)="generar()">Generar</button>
          </span>
        </label>
        <label>Descripción <small class="tenue">(interna: campaña, influencer…)</small><input name="descripcion" maxlength="150" [(ngModel)]="f.descripcion" /></label>
        <div class="dos-columnas">
          <label>Tipo
            <select name="tipo" [(ngModel)]="f.tipo"><option value="porcentaje">Porcentaje (%)</option><option value="monto">Monto fijo (S/)</option></select>
          </label>
          <label>{{ f.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto S/' }}<input name="valor" type="number" min="0.01" step="0.01" required [(ngModel)]="f.valor" /></label>
          <label>Compra mínima S/ <input name="minimo" type="number" min="0" step="0.01" [(ngModel)]="f.minimo" /></label>
          <label>Máximo de usos <small class="tenue">(vacío = sin límite)</small><input name="max_usos" type="number" min="1" [(ngModel)]="f.max_usos" /></label>
          <label>Desde <input name="inicio" type="date" [(ngModel)]="f.inicio" /></label>
          <label>Hasta <input name="fin" type="date" [(ngModel)]="f.fin" /></label>
        </div>
        <label class="casilla"><input type="checkbox" name="activo" [(ngModel)]="f.activo" /> Activo</label>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        <div class="acciones-form fila">
          <button type="button" class="btn" (click)="form.set(null)">Cancelar</button>
          <button type="submit" class="btn primario">Guardar</button>
        </div>
      </form>
    }
  `,
})
export class CuponesPagina {
  private api = inject(AdminApi);
  cupones = signal<Cupon[]>([]);
  form = signal<FormCupon | null>(null);
  error = signal('');
  copiado = signal('');

  constructor() {
    this.cargar();
  }

  nuevo(): void {
    this.error.set('');
    this.form.set({ id: null, codigo: '', descripcion: '', tipo: 'porcentaje', valor: 10, minimo: 0, max_usos: null, inicio: '', fin: '', activo: true });
    this.generar();
  }

  editar(c: Cupon): void {
    this.error.set('');
    this.form.set({ id: c.id, codigo: c.codigo, descripcion: c.descripcion ?? '', tipo: c.tipo, valor: c.valor, minimo: c.minimo, max_usos: c.max_usos, inicio: c.inicio ?? '', fin: c.fin ?? '', activo: c.activo });
  }

  generar(): void {
    this.api.generarCodigo().subscribe(r => {
      const f = this.form();
      if (f) this.form.set({ ...f, codigo: r.codigo });
    });
  }

  guardar(): void {
    const f = this.form();
    if (!f) return;
    this.api.guardarCupon(f.id, { ...f, inicio: f.inicio || null, fin: f.fin || null }).subscribe({
      next: () => {
        this.form.set(null);
        this.cargar();
      },
      error: e => this.error.set(mensajeError(e)),
    });
  }

  eliminar(c: Cupon): void {
    if (!confirm(c.usos ? `"${c.codigo}" ya se usó ${c.usos} vez/veces: se desactivará para conservar el historial. ¿Continuar?` : `¿Eliminar el código "${c.codigo}"?`)) return;
    this.api.eliminarCupon(c.id).subscribe({ next: () => this.cargar(), error: e => this.error.set(mensajeError(e)) });
  }

  async copiar(codigo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
      this.copiado.set(codigo);
      setTimeout(() => this.copiado.set(''), 2000);
    } catch {
      /* portapapeles no disponible */
    }
  }

  private cargar(): void {
    this.api.cupones().subscribe({ next: c => this.cupones.set(c), error: e => this.error.set(mensajeError(e)) });
  }
}
