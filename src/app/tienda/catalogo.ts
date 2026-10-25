import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TiendaApi } from '../core/api';
import { Busqueda } from '../core/modelos';
import { SeoService } from '../core/seo';
import { Icono } from '../shared/icono';
import { TarjetaProducto } from '../shared/tarjeta-producto';

type Filtros = Record<string, string>;

const ORDENES = [
  { valor: 'relevancia', texto: 'Más relevantes' },
  { valor: 'nuevos', texto: 'Más nuevos' },
  { valor: 'precio_asc', texto: 'Menor precio' },
  { valor: 'precio_desc', texto: 'Mayor precio' },
  { valor: 'nombre', texto: 'Nombre (A-Z)' },
];

@Component({
  selector: 'app-catalogo',
  imports: [FormsModule, RouterLink, Icono, TarjetaProducto],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo.html',
})
export class CatalogoPagina {
  private api = inject(TiendaApi);
  private router = inject(Router);
  private seo = inject(SeoService);

  /** Slug de /categoria/:slug (vacío en /tienda). */
  slug = input<string>('');
  filtros = toSignal(inject(ActivatedRoute).queryParams, { initialValue: {} as Filtros });

  resultado = signal<Busqueda | null>(null);
  cargando = signal(true);
  panel = signal(false);
  ordenes = ORDENES;

  // Campos de precio editables antes de aplicar.
  min = signal('');
  max = signal('');

  marcasElegidas = computed<string[]>(() => (this.filtros()['marca'] ?? '').split(',').filter(Boolean));
  activos = computed(() => {
    const f = this.filtros();
    const chips: { clave: string; texto: string; valor?: string }[] = [];
    if (f['q']) chips.push({ clave: 'q', texto: `“${f['q']}”` });
    for (const m of this.marcasElegidas()) {
      chips.push({ clave: 'marca', valor: m, texto: this.resultado()?.facetas.marcas.find(x => x.slug === m)?.nombre ?? m });
    }
    if (f['min'] || f['max']) chips.push({ clave: 'precio', texto: `S/ ${f['min'] || 0} – ${f['max'] || '∞'}` });
    if (f['disponible']) chips.push({ clave: 'disponible', texto: 'Disponibles' });
    if (f['condicion']) chips.push({ clave: 'condicion', texto: f['condicion'] === 'usado' ? 'Usados' : 'Nuevos' });
    return chips;
  });
  titulo = computed(() => this.resultado()?.categoria?.nombre ?? (this.filtros()['q'] ? 'Resultados de búsqueda' : 'Todo el catálogo'));

  constructor() {
    effect(() => {
      const f = this.filtros();
      const slug = this.slug();
      this.min.set(f['min'] ?? '');
      this.max.set(f['max'] ?? '');
      this.cargando.set(true);
      this.api.buscar({ ...f, categoria: slug, page: f['pagina'], pagina: undefined, por_pagina: 12 }).subscribe({
        next: r => {
          this.resultado.set(r);
          this.cargando.set(false);
          const categoria = r.categoria;
          this.seo.aplicar({
            titulo: categoria ? categoria.nombre : f['q'] ? `Buscar “${f['q']}”` : 'Catálogo',
            descripcion: categoria?.descripcion,
            ruta: slug ? `/categoria/${slug}` : '/tienda',
            indexar: !f['q'],
          });
        },
        error: () => this.cargando.set(false),
      });
    });
  }

  aplicar(cambios: Filtros | Record<string, string | null>): void {
    this.router.navigate([], { queryParams: { ...cambios, pagina: null }, queryParamsHandling: 'merge' });
  }

  alternarMarca(slug: string): void {
    const actuales = this.marcasElegidas();
    const marcas = actuales.includes(slug) ? actuales.filter(m => m !== slug) : [...actuales, slug];
    this.aplicar({ marca: marcas.join(',') || null });
  }

  aplicarPrecio(): void {
    this.aplicar({ min: this.min() || null, max: this.max() || null });
    this.panel.set(false);
  }

  quitar(chip: { clave: string; valor?: string }): void {
    if (chip.clave === 'marca' && chip.valor) return this.alternarMarca(chip.valor);
    if (chip.clave === 'precio') return this.aplicar({ min: null, max: null });
    this.aplicar({ [chip.clave]: null });
  }

  limpiar(): void {
    this.router.navigate([], { queryParams: {} });
  }

  irA(pagina: number): void {
    this.router.navigate([], { queryParams: { pagina: pagina > 1 ? pagina : null }, queryParamsHandling: 'merge' });
  }

  paginas(): number[] {
    const total = this.resultado()?.paginas ?? 1;
    return Array.from({ length: total }, (_, i) => i + 1);
  }
}
