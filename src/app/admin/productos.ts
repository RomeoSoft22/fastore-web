import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pagina } from '../core/modelos';
import { HacePipe, SolesPipe, mensajeError } from '../shared/util';
import { Icono } from '../shared/icono';
import { AdminApi, Conteos, ProductoAdmin } from './admin-api';

/** Colores de las etiquetas de categoría (identidad, en orden fijo). */
const COLORES_CATEGORIA = ['#2B6CB0', '#D97206', '#7C3AED', '#0F766E', '#BE185D', '#4D7C0F', '#475569'];

interface Vista {
  clave: string;
  texto: string;
  icono: string;
  conteo: keyof Omit<Conteos, 'categorias'>;
  filtros: Record<string, string>;
}

const VISTAS: Vista[] = [
  { clave: 'todos', texto: 'Todos', icono: 'caja', conteo: 'todos', filtros: {} },
  { clave: 'visibles', texto: 'Visibles en tienda', icono: 'ojo', conteo: 'visibles', filtros: { activo: '1' } },
  { clave: 'ocultos', texto: 'Ocultos', icono: 'cerrar', conteo: 'ocultos', filtros: { activo: '0' } },
  { clave: 'disponibles', texto: 'Disponibles', icono: 'check', conteo: 'disponibles', filtros: { estado: '1' } },
  { clave: 'a_pedido', texto: 'A pedido', icono: 'reloj', conteo: 'a_pedido', filtros: { estado: '2' } },
  { clave: 'agotados', texto: 'Agotados', icono: 'menos', conteo: 'agotados', filtros: { estado: '0' } },
  { clave: 'destacados', texto: 'Destacados', icono: 'estrella', conteo: 'destacados', filtros: { vista: 'destacados' } },
];

const PENDIENTES: Vista[] = [
  { clave: 'sin_costo', texto: 'Sin costo', icono: 'etiqueta', conteo: 'sin_costo', filtros: { vista: 'sin_costo' } },
  { clave: 'sin_fotos', texto: 'Sin fotos', icono: 'imagen', conteo: 'sin_fotos', filtros: { vista: 'sin_fotos' } },
  { clave: 'stock_bajo', texto: 'Stock bajo (≤ 3)', icono: 'caja', conteo: 'stock_bajo', filtros: { vista: 'stock_bajo' } },
];

const ORDENES = [
  { valor: 'recientes', texto: 'Más recientes' },
  { valor: 'actualizados', texto: 'Última edición' },
  { valor: 'nombre', texto: 'Nombre' },
  { valor: 'precio_desc', texto: 'Mayor precio' },
  { valor: 'precio_asc', texto: 'Menor precio' },
  { valor: 'stock', texto: 'Menos stock' },
];

@Component({
  selector: 'app-productos',
  imports: [FormsModule, RouterLink, Icono, SolesPipe, HacePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './productos.html',
})
export class ProductosPagina {
  private api = inject(AdminApi);
  catalogos = toSignal(this.api.catalogos());
  lista = signal<(Pagina<ProductoAdmin> & { conteos: Conteos }) | null>(null);
  conteos = computed(() => this.lista()?.conteos);

  vistas = VISTAS;
  pendientes = PENDIENTES;
  ordenes = ORDENES;
  vista = signal('todos');
  categoria = signal<number | null>(null);
  q = signal('');
  orden = signal('recientes');
  pagina = signal(1);
  menu = signal(false);
  error = signal('');
  avisos = signal<string[]>([]);
  private avisosMostrados = false;
  private espera?: ReturnType<typeof setTimeout>;

  categoriasColor = computed(() =>
    (this.catalogos()?.categorias ?? []).map((c, i) => ({ ...c, color: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length] })),
  );
  tituloVista = computed(() => {
    const c = this.categoriasColor().find(x => x.id === this.categoria());
    const v = [...VISTAS, ...PENDIENTES].find(x => x.clave === this.vista());
    return [v?.clave !== 'todos' ? v?.texto : null, c?.etiqueta].filter(Boolean).join(' · ') || 'Todos los productos';
  });

  constructor() {
    effect(() => {
      const vista = [...VISTAS, ...PENDIENTES].find(v => v.clave === this.vista());
      const filtros = { ...vista?.filtros, categoria: this.categoria(), q: this.q(), orden: this.orden(), page: this.pagina() };
      clearTimeout(this.espera);
      this.espera = setTimeout(
        () =>
          this.api.productos(filtros).subscribe({
            next: r => {
              this.lista.set(r);
              this.mostrarAvisos(r.conteos);
            },
            error: e => this.error.set(mensajeError(e)),
          }),
        filtros.q ? 300 : 0,
      );
    });
  }

  elegirVista(clave: string): void {
    this.vista.set(clave);
    this.pagina.set(1);
    this.menu.set(false);
  }

  elegirCategoria(id: number | null): void {
    this.categoria.set(this.categoria() === id ? null : id);
    this.pagina.set(1);
    this.menu.set(false);
  }

  colorDe(id: number | null | undefined): string {
    return this.categoriasColor().find(c => c.id === id)?.color ?? '#94a3b8';
  }

  cambiar(p: ProductoAdmin, cambio: Record<string, unknown>): void {
    this.error.set('');
    this.api.cambiarProducto(p.id, cambio).subscribe({
      next: nuevo => this.lista.update(l => l && { ...l, datos: l.datos.map(x => (x.id === p.id ? { ...x, ...nuevo } : x)) }),
      error: e => this.error.set(mensajeError(e)),
    });
  }

  quitarAviso(i: number): void {
    this.avisos.update(a => a.filter((_, j) => j !== i));
  }

  private mostrarAvisos(c: Conteos): void {
    if (this.avisosMostrados) return;
    this.avisosMostrados = true;
    this.avisos.set(
      [
        c.sin_costo ? `Existen ${c.sin_costo} productos sin costo registrado: no se puede calcular su ganancia.` : '',
        c.sin_fotos ? `Existen ${c.sin_fotos} productos sin fotos.` : '',
        c.stock_bajo ? `Existen ${c.stock_bajo} productos con stock bajo.` : '',
      ].filter(Boolean),
    );
    setTimeout(() => this.avisos.set([]), 12000);
  }
}
