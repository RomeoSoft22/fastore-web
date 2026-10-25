import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icono } from '../shared/icono';
import { mensajeError } from '../shared/util';
import { AdminApi, Catalogos } from './admin-api';

interface Edicion {
  tipo: 'categoria' | 'marca';
  id: number | null;
  nombre: string;
  descripcion: string;
  orden: number;
  activo: boolean;
}

@Component({
  selector: 'app-catalogos',
  imports: [FormsModule, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Categorías y marcas</h1>
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    <div class="dos-paneles">
      <section class="panel">
        <div class="panel-titulo">
          <h2>Categorías</h2>
          <button type="button" class="btn" (click)="nuevo('categoria')"><app-icono nombre="mas" [tamano]="16" /> Nueva</button>
        </div>
        <ul class="lista-simple">
          @for (c of datos()?.categorias ?? []; track c.id) {
            <li [class.oculto]="!c.activo">
              <span><b>{{ c.nombre }}</b><small class="tenue">/categoria/{{ c.slug }} · {{ c.productos }} producto(s) · orden {{ c.orden }}</small></span>
              <button type="button" class="btn-icono" (click)="editar('categoria', c)" aria-label="Editar"><app-icono nombre="editar" [tamano]="18" /></button>
              <button type="button" class="btn-icono peligro" (click)="eliminar('categoria', c.id, c.nombre, c.productos)" aria-label="Eliminar"><app-icono nombre="basura" [tamano]="18" /></button>
            </li>
          }
        </ul>
        @if (datos()?.sin_categoria) { <p class="tenue">{{ datos()?.sin_categoria }} producto(s) sin categoría.</p> }
      </section>

      <section class="panel">
        <div class="panel-titulo">
          <h2>Marcas</h2>
          <button type="button" class="btn" (click)="nuevo('marca')"><app-icono nombre="mas" [tamano]="16" /> Nueva</button>
        </div>
        <ul class="lista-simple">
          @for (m of datos()?.marcas ?? []; track m.id) {
            <li [class.oculto]="!m.activo">
              <span><b>{{ m.nombre }}</b><small class="tenue">{{ m.productos }} producto(s)</small></span>
              <button type="button" class="btn-icono" (click)="editar('marca', m)" aria-label="Editar"><app-icono nombre="editar" [tamano]="18" /></button>
              <button type="button" class="btn-icono peligro" (click)="eliminar('marca', m.id, m.nombre, m.productos)" aria-label="Eliminar"><app-icono nombre="basura" [tamano]="18" /></button>
            </li>
          }
        </ul>
      </section>
    </div>

    @if (edicion(); as e) {
      <div class="velo" (click)="edicion.set(null)"></div>
      <form class="modal" (submit)="$event.preventDefault(); guardar()">
        <h2>{{ e.id ? 'Editar' : 'Nueva' }} {{ e.tipo === 'categoria' ? 'categoría' : 'marca' }}</h2>
        <label>Nombre <input name="nombre" required maxlength="50" [(ngModel)]="e.nombre" /></label>
        @if (e.tipo === 'categoria') {
          <label>Descripción <small class="tenue">(aparece en la página de la categoría y en Google)</small>
            <textarea name="descripcion" rows="3" maxlength="255" [(ngModel)]="e.descripcion"></textarea>
          </label>
          <label>Orden en el menú <input name="orden" type="number" min="0" [(ngModel)]="e.orden" /></label>
        }
        <label class="casilla"><input type="checkbox" name="activo" [(ngModel)]="e.activo" /> Activa</label>
        <div class="acciones-form fila">
          <button type="button" class="btn" (click)="edicion.set(null)">Cancelar</button>
          <button type="submit" class="btn primario">Guardar</button>
        </div>
      </form>
    }
  `,
})
export class CatalogosPagina {
  private api = inject(AdminApi);
  datos = signal<Catalogos | null>(null);
  edicion = signal<Edicion | null>(null);
  error = signal('');

  constructor() {
    this.cargar();
  }

  nuevo(tipo: Edicion['tipo']): void {
    this.edicion.set({ tipo, id: null, nombre: '', descripcion: '', orden: (this.datos()?.categorias.length ?? 0) + 1, activo: true });
  }

  editar(tipo: Edicion['tipo'], item: { id: number; nombre: string; activo: boolean; descripcion?: string | null; orden?: number }): void {
    this.edicion.set({ tipo, id: item.id, nombre: item.nombre, descripcion: item.descripcion ?? '', orden: item.orden ?? 0, activo: item.activo });
  }

  guardar(): void {
    const e = this.edicion();
    if (!e) return;
    const body = { nombre: e.nombre, descripcion: e.descripcion, orden: e.orden, activo: e.activo };
    const peticion = e.tipo === 'categoria' ? this.api.guardarCategoria(e.id, body) : this.api.guardarMarca(e.id, body);
    peticion.subscribe({
      next: () => {
        this.edicion.set(null);
        this.cargar();
      },
      error: err => this.error.set(mensajeError(err)),
    });
  }

  eliminar(tipo: Edicion['tipo'], id: number, nombre: string, productos: number): void {
    const aviso = tipo === 'categoria' && productos ? `\n\nSus ${productos} producto(s) quedarán sin categoría.` : '';
    if (!confirm(`¿Eliminar "${nombre}"?${aviso}`)) return;
    const peticion = tipo === 'categoria' ? this.api.eliminarCategoria(id) : this.api.eliminarMarca(id);
    peticion.subscribe({ next: () => this.cargar(), error: err => this.error.set(mensajeError(err)) });
  }

  private cargar(): void {
    this.error.set('');
    this.api.catalogos().subscribe(d => this.datos.set(d));
  }
}
