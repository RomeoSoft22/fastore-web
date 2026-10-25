import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface DatosSeo {
  titulo: string;
  descripcion?: string;
  imagen?: string | null;
  ruta?: string;
  tipo?: 'website' | 'product';
  jsonld?: object[];
  indexar?: boolean;
  /** Etiquetas del producto (meta keywords). */
  keywords?: string;
}

const NOMBRE = 'FAStore';
const DESCRIPCION = 'Tecnología, tarjetas NFC, figuras de acción y más. Entrega gratis en estaciones del tren de Lima.';

/**
 * Metadatos al navegar dentro de la app. La primera carga ya llega con ellos desde seo.php
 * (lo que leen WhatsApp, Facebook y Google); aquí se mantienen al día al cambiar de página.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  aplicar(datos: DatosSeo): void {
    const url = location.origin + (datos.ruta ?? location.pathname);
    const descripcion = datos.descripcion || DESCRIPCION;
    const imagen = datos.imagen || `${location.origin}/img/social.jpg`;

    this.title.setTitle(datos.titulo.includes(NOMBRE) ? datos.titulo : `${datos.titulo} | ${NOMBRE}`);
    const etiquetas: [string, string, string][] = [
      ['name', 'description', descripcion],
      ['name', 'robots', datos.indexar === false ? 'noindex, nofollow' : 'index, follow'],
      ['name', 'keywords', datos.keywords ?? ''],
      ['property', 'og:title', datos.titulo],
      ['property', 'og:description', descripcion],
      ['property', 'og:image', imagen],
      ['property', 'og:url', url],
      ['property', 'og:type', datos.tipo ?? 'website'],
      ['name', 'twitter:title', datos.titulo],
      ['name', 'twitter:description', descripcion],
      ['name', 'twitter:image', imagen],
    ];
    for (const [atributo, nombre, contenido] of etiquetas) {
      this.meta.updateTag({ [atributo]: nombre, content: contenido } as Record<string, string>, `${atributo}="${nombre}"`);
    }

    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = url;

    this.document.querySelectorAll('script[data-seo="jsonld"]').forEach(s => s.remove());
    for (const dato of datos.jsonld ?? []) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset['seo'] = 'jsonld';
      script.textContent = JSON.stringify(dato);
      this.document.head.appendChild(script);
    }
  }
}
