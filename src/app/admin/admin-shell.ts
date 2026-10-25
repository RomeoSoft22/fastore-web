import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccesoService } from '../core/acceso';
import { SeoService } from '../core/seo';
import { Icono } from '../shared/icono';
import { SelectorTema } from '../shared/selector-tema';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono, SelectorTema],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin">
      <header class="admin-barra">
        <button type="button" class="btn-icono solo-movil" (click)="menu.set(!menu())" aria-label="Menú"><app-icono nombre="menu" /></button>
        <a routerLink="/admin" class="logo"><img class="logo-icono" src="img/marca/icono.png" alt="" width="39" height="34" /><img class="logo-texto" src="img/marca/logo.png" alt="FAStore" width="96" height="20" /><small>admin</small></a>
        <span class="espacio"></span>
        <app-selector-tema />
        <a routerLink="/" class="btn-texto" target="_blank"><app-icono nombre="ojo" [tamano]="18" /> <span class="solo-escritorio">Ver tienda</span></a>
        <span class="admin-usuario solo-escritorio"><app-icono nombre="usuario" [tamano]="18" /> {{ acceso.usuario()?.nombre }}</span>
        <button type="button" class="btn-texto" (click)="acceso.salir()"><app-icono nombre="salir" [tamano]="18" /> <span class="solo-escritorio">Salir</span></button>
      </header>
      <nav class="admin-menu" [class.abierto]="menu()" (click)="menu.set(false)" aria-label="Administración">
        <a routerLink="/admin" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }"><app-icono nombre="panel" /> Dashboard</a>
        <a routerLink="/admin/productos" routerLinkActive="activo"><app-icono nombre="caja" /> Productos</a>
        <a routerLink="/admin/categorias" routerLinkActive="activo"><app-icono nombre="capas" /> Categorías y marcas</a>
        <a routerLink="/admin/banners" routerLinkActive="activo"><app-icono nombre="imagen" /> Banners</a>
        <a routerLink="/admin/carritos" routerLinkActive="activo"><app-icono nombre="carrito" /> Pedidos y carritos</a>
        <a routerLink="/admin/cupones" routerLinkActive="activo"><app-icono nombre="etiqueta" /> Códigos de descuento</a>
        <a routerLink="/admin/costos" routerLinkActive="activo"><app-icono nombre="tarjeta" /> Fórmula de costos</a>
        <a routerLink="/admin/reclamos" routerLinkActive="activo"><app-icono nombre="libro" /> Libro de Reclamaciones</a>
      </nav>
      <main class="admin-contenido"><router-outlet /></main>
    </div>
  `,
})
export class AdminShell {
  acceso = inject(AccesoService);
  menu = signal(false);

  constructor() {
    inject(SeoService).aplicar({ titulo: 'Administración', indexar: false });
  }
}
