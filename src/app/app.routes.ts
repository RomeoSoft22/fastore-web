import { Routes } from '@angular/router';
import { accesoGuard } from './core/acceso';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./tienda/inicio').then(m => m.InicioPagina) },
  { path: 'tienda', loadComponent: () => import('./tienda/catalogo').then(m => m.CatalogoPagina) },
  { path: 'categoria/:slug', loadComponent: () => import('./tienda/catalogo').then(m => m.CatalogoPagina) },
  { path: 'producto/:slug', loadComponent: () => import('./tienda/producto').then(m => m.ProductoPagina) },
  { path: 'carrito', loadComponent: () => import('./tienda/carrito').then(m => m.CarritoPagina) },
  { path: 'cotizacion/:codigo', loadComponent: () => import('./tienda/cotizacion').then(m => m.CotizacionPagina) },
  { path: 'legal/:pagina', loadComponent: () => import('./tienda/legal').then(m => m.LegalPagina) },
  { path: 'libro-de-reclamaciones', loadComponent: () => import('./tienda/reclamaciones').then(m => m.ReclamacionesPagina) },
  { path: 'callback', loadComponent: () => import('./admin/callback').then(m => m.CallbackPagina) },
  // Rutas del sitio anterior.
  { path: 'login', redirectTo: 'admin' },
  { path: 'dashboard', redirectTo: 'admin' },
  {
    path: 'admin',
    canActivate: [accesoGuard],
    loadComponent: () => import('./admin/admin-shell').then(m => m.AdminShell),
    children: [
      { path: '', loadComponent: () => import('./admin/dashboard').then(m => m.DashboardPagina) },
      { path: 'productos', loadComponent: () => import('./admin/productos').then(m => m.ProductosPagina) },
      { path: 'productos/nuevo', loadComponent: () => import('./admin/producto-form').then(m => m.ProductoForm) },
      { path: 'productos/:id', loadComponent: () => import('./admin/producto-form').then(m => m.ProductoForm) },
      { path: 'categorias', loadComponent: () => import('./admin/catalogos').then(m => m.CatalogosPagina) },
      { path: 'banners', loadComponent: () => import('./admin/banners').then(m => m.BannersPagina) },
      { path: 'carritos', loadComponent: () => import('./admin/carritos').then(m => m.CarritosPagina) },
      { path: 'cupones', loadComponent: () => import('./admin/cupones').then(m => m.CuponesPagina) },
      { path: 'costos', loadComponent: () => import('./admin/costos').then(m => m.CostosPagina) },
      { path: 'reclamos', loadComponent: () => import('./admin/reclamos').then(m => m.ReclamosPagina) },
    ],
  },
  { path: '**', loadComponent: () => import('./tienda/no-encontrado').then(m => m.NoEncontradoPagina) },
];
