import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/seo';
import { Icono } from '../shared/icono';

@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor vacio pagina-vacia">
      <app-icono nombre="buscar" [tamano]="56" />
      <h1>No encontramos esta página</h1>
      <p>El enlace puede estar mal escrito o la página ya no existe.</p>
      <a routerLink="/tienda" class="btn primario">Ir al catálogo</a>
    </div>
  `,
})
export class NoEncontradoPagina {
  constructor() {
    inject(SeoService).aplicar({ titulo: 'Página no encontrada', indexar: false });
  }
}
