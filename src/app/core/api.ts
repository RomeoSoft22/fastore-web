import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { shareReplay } from 'rxjs';
import { Busqueda, Categoria, ConfigTienda, Contacto, Cotizacion, Inicio, Producto } from './modelos';

/** En local el proxy de ng serve y en producción el .htaccess publican fastore-api en /fastore-api. */
export const API = '/fastore-api/api';

/** Arma los parámetros omitiendo los vacíos. */
export function parametros(filtros: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== '' && valor !== null && valor !== undefined && valor !== false) params = params.set(clave, String(valor));
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class TiendaApi {
  private http = inject(HttpClient);

  readonly config$ = this.http.get<ConfigTienda>(`${API}/tienda/config`).pipe(shareReplay(1));
  readonly categorias$ = this.http.get<Categoria[]>(`${API}/tienda/categorias`).pipe(shareReplay(1));

  inicio() {
    return this.http.get<Inicio>(`${API}/tienda/inicio`);
  }

  buscar(filtros: Record<string, unknown>) {
    return this.http.get<Busqueda>(`${API}/tienda/productos`, { params: parametros(filtros) });
  }

  producto(slug: string) {
    return this.http.get<{ producto: Producto; relacionados: Producto[] }>(`${API}/tienda/productos/${encodeURIComponent(slug)}`);
  }

  sincronizarCarrito(body: { token: string | null; items: { id: number; cantidad: number }[]; contacto?: Partial<Contacto>; origen?: string }) {
    return this.http.post<{ token: string; estado: string }>(`${API}/tienda/carrito`, body);
  }

  validarCupon(codigo: string, subtotal: number) {
    return this.http.post<{ codigo: string; etiqueta: string; descuento: number }>(`${API}/tienda/cupon`, { codigo, subtotal });
  }

  enviarPedido(body: { token: string | null; items: { id: number; cantidad: number }[]; contacto: Contacto; cupon?: string | null; acepta: boolean }) {
    return this.http.post<{ pedido: number; cotizacion: string; vence: string; whatsapp_url: string }>(`${API}/tienda/carrito/pedido`, body);
  }

  cotizacion(codigo: string) {
    return this.http.get<Cotizacion>(`${API}/tienda/cotizaciones/${encodeURIComponent(codigo)}`);
  }

  registrarReclamo(body: unknown) {
    return this.http.post<{ codigo: string; vence: string; creado: string }>(`${API}/tienda/reclamos`, body);
  }
}
