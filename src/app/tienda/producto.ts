import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { TiendaApi } from '../core/api';
import { CarritoService } from '../core/carrito';
import { Producto } from '../core/modelos';
import { SeoService } from '../core/seo';
import { Icono } from '../shared/icono';
import { TarjetaProducto } from '../shared/tarjeta-producto';
import { ESTADOS, SolesPipe } from '../shared/util';

@Component({
  selector: 'app-producto',
  imports: [RouterLink, Icono, TarjetaProducto, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './producto.html',
})
export class ProductoPagina {
  private api = inject(TiendaApi);
  private seo = inject(SeoService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  carrito = inject(CarritoService);

  slug = input.required<string>();
  producto = signal<Producto | null>(null);
  relacionados = signal<Producto[]>([]);
  noExiste = signal(false);
  foto = signal(0);
  cantidad = signal(1);
  copiado = signal(false);
  estados = ESTADOS;
  protected readonly Math = Math;
  protected readonly encodeURIComponent = encodeURIComponent;
  private toque = 0;

  imagenes = computed(() => this.producto()?.imagenes ?? []);
  maximo = computed(() => {
    const p = this.producto();
    return !p ? 1 : p.estado === 'a_pedido' ? 99 : Math.max(1, Math.min(99, p.stock || 99));
  });
  url = computed(() => `${location.origin}/producto/${this.producto()?.slug ?? ''}`);
  puedeCompartir = typeof navigator !== 'undefined' && 'share' in navigator;

  constructor() {
    effect(() => {
      const slug = this.slug();
      this.noExiste.set(false);
      this.api.producto(slug).subscribe({
        next: r => {
          this.producto.set(r.producto);
          this.relacionados.set(r.relacionados);
          this.foto.set(0);
          this.cantidad.set(1);
          // Enlaces del sitio anterior (/producto/3) pasan a la URL con nombre.
          if (slug !== r.producto.slug) this.router.navigate(['/producto', r.producto.slug], { replaceUrl: true });
          this.aplicarSeo(r.producto);
        },
        error: () => {
          this.noExiste.set(true);
          this.seo.aplicar({ titulo: 'Producto no encontrado', indexar: false });
        },
      });
    });
  }

  mover(paso: number): void {
    const total = this.imagenes().length;
    if (total > 1) this.foto.set((this.foto() + paso + total) % total);
  }

  inicioToque(e: TouchEvent): void {
    this.toque = e.touches[0].clientX;
  }

  finToque(e: TouchEvent): void {
    const distancia = e.changedTouches[0].clientX - this.toque;
    if (Math.abs(distancia) > 40) this.mover(distancia < 0 ? 1 : -1);
  }

  agregar(): void {
    const p = this.producto();
    if (p) this.carrito.agregar(p, this.cantidad());
  }

  comprar(): void {
    const p = this.producto();
    if (!p) return;
    this.carrito.agregar(p, this.cantidad());
    this.carrito.agregado.set(null);
    this.router.navigate(['/carrito']);
  }

  enlaceWhatsapp(): string {
    const p = this.producto();
    return `https://wa.me/?text=${encodeURIComponent(`${p?.nombre} a S/ ${p?.precio_final.toFixed(2)} en FAStore 👉 ${this.url()}`)}`;
  }

  enlaceFacebook(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url())}`;
  }

  async compartir(): Promise<void> {
    const p = this.producto();
    try {
      await navigator.share({ title: p?.nombre, text: `${p?.nombre} – S/ ${p?.precio_final.toFixed(2)}`, url: this.url() });
    } catch {
      /* el usuario canceló */
    }
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      /* portapapeles no disponible */
    }
  }

  /**
   * La descripción ya viene filtrada por fastore-api con una lista blanca de etiquetas y atributos
   * (sin scripts ni eventos), así que se conserva tal cual, incluida la alineación del texto.
   */
  html(descripcion: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(descripcion ?? '');
  }

  parrafos(texto: string | undefined): string[] {
    return (texto ?? '').split(/\n{2,}/).map(t => t.trim()).filter(Boolean);
  }

  private aplicarSeo(p: Producto): void {
    const disponibilidad = { disponible: 'InStock', a_pedido: 'PreOrder', agotado: 'OutOfStock' }[p.estado];
    const url = `${location.origin}/producto/${p.slug}`;
    this.seo.aplicar({
      titulo: `${p.nombre} | S/ ${p.precio_final.toFixed(2)}`,
      descripcion: p.resumen,
      imagen: p.imagenes?.[0]?.url,
      ruta: `/producto/${p.slug}`,
      tipo: 'product',
      keywords: (p.etiquetas ?? []).join(', '),
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.nombre,
          description: p.descripcion_texto,
          keywords: (p.etiquetas ?? []).join(', ') || undefined,
          image: (p.imagenes ?? []).map(i => i.url),
          sku: `FAS-${p.id}`,
          brand: { '@type': 'Brand', name: p.marca?.nombre ?? 'FAStore' },
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'PEN',
            price: p.precio_final.toFixed(2),
            availability: `https://schema.org/${disponibilidad}`,
          },
        },
      ],
    });
  }
}
