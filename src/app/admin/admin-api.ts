import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API, parametros } from '../core/api';
import { Banner, Imagen, Pagina, Producto } from '../core/modelos';

export interface ProductoAdmin extends Producto {
  activo: boolean;
  costo: number | null;
  costo_extra: number;
  costo_unitario: number | null;
  precio_sugerido: number | null;
  ganancia_unidad: number | null;
  margen: number | null;
  marca_id: number;
  categoria_id: number | null;
  resumen_propio: string | null;
  imagenes_total: number | null;
  creado: string | null;
  actualizado: string | null;
}

export interface CategoriaAdmin {
  id: number;
  nombre: string;
  /** Nombre para mostrar ("Figuras de acción"); `nombre` es el guardado en mayúsculas. */
  etiqueta: string;
  slug: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  productos: number;
}

export interface MarcaAdmin {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
  productos: number;
}

export interface Catalogos {
  categorias: CategoriaAdmin[];
  marcas: MarcaAdmin[];
  sin_categoria: number;
}

export interface CarritoAdmin {
  id: number;
  cotizacion: string | null;
  cotizacion_url: string | null;
  vence: string | null;
  entrega: string | null;
  entrega_texto: string | null;
  direccion: string | null;
  ciudad: string | null;
  dni: string | null;
  acepto_terminos: string | null;
  historial: { fecha: string; texto: string; tipo: string }[];
  mensajes: { titulo: string; texto: string; url: string }[];
  canal: 'web' | 'manual';
  subtotal: number;
  cupon: string | null;
  descuento: number;
  ganancia: number | null;
  venta: string | null;
  estado: 'activo' | 'pedido' | 'vendido' | 'descartado' | 'vacio';
  abandonado: boolean;
  nombre: string | null;
  celular: string | null;
  correo: string | null;
  estacion: string | null;
  pago: string | null;
  items: number;
  total: number;
  productos: { id: number; nombre: string; slug: string | null; imagen: string | null; stock: number | null; cantidad: number; precio: number; costo: number | null; agregado: string }[];
  dispositivo: string | null;
  origen: string | null;
  nota: string | null;
  contactos: number;
  contactado: string | null;
  pedido: string | null;
  actividad: string | null;
  creado: string | null;
}

export interface Reclamo {
  id: number;
  codigo: string;
  tipo: 'reclamo' | 'queja';
  nombre: string;
  documento: string;
  domicilio: string;
  correo: string;
  telefono: string;
  apoderado: string | null;
  bien: string;
  monto: number | null;
  pedido_ref: string | null;
  descripcion_bien: string;
  detalle: string;
  pedido_consumidor: string;
  estado: 'pendiente' | 'atendido';
  respuesta: string | null;
  respondido: string | null;
  creado: string;
  vence: string;
}

export interface Conteos {
  todos: number; visibles: number; ocultos: number; disponibles: number; a_pedido: number; agotados: number;
  destacados: number; sin_costo: number; stock_bajo: number; sin_fotos: number;
  categorias: Record<string, number>;
}

export interface Kpis {
  ventas: number; pedidos: number; unidades: number; ticket: number; costo: number; ganancia: number; margen: number; descuentos: number;
}

export interface Dashboard {
  mes: string;
  kpis: Kpis;
  anterior: Kpis;
  por_dia: { dia: number; ventas: number; ganancia: number; pedidos: number }[];
  por_categoria: { categoria: string; ventas: number; ganancia: number; unidades: number }[];
  top_productos: { id: number; nombre: string; unidades: number; ventas: number; ganancia: number; margen: number }[];
  por_canal: { canal: string; ventas: number; pedidos: number }[];
  tendencia: { mes: string; ventas: number; ganancia: number; pedidos: number }[];
  embudo: { etapa: string; total: number }[];
  cupones: { codigo: string; usos: number; descuento: number; ventas: number }[];
  inventario: { unidades: number; valor_venta: number; valor_costo: number; sin_costo: number };
  abandonados: { total: number; con_contacto: number; valor: number };
  pedidos_por_confirmar: number;
  sin_costo: { productos: number; ventas: number };
  parametros: Parametros;
}

export type Parametros = Record<'costo_flete_pct' | 'costo_aduana_pct' | 'costo_empaque' | 'costo_entrega_pedido' | 'comision_pct' | 'margen_objetivo_pct', number>;

export interface Cupon {
  id: number;
  codigo: string;
  descripcion: string | null;
  tipo: 'porcentaje' | 'monto';
  valor: number;
  minimo: number;
  max_usos: number | null;
  usos: number;
  inicio: string | null;
  fin: string | null;
  activo: boolean;
  etiqueta: string;
  vigente: boolean;
  pedidos?: number;
  ventas?: number;
  descuento_total?: number;
}

const A = `${API}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);

  dashboard(mes: string) { return this.http.get<Dashboard>(`${A}/dashboard`, { params: parametros({ mes }) }); }
  parametros() { return this.http.get<{ valores: Parametros; etiquetas: Record<string, string> }>(`${A}/parametros`); }
  guardarParametros(body: Parametros) { return this.http.put<{ valores: Parametros; etiquetas: Record<string, string> }>(`${A}/parametros`, body); }
  registrarVenta(body: unknown) { return this.http.post<{ id: number; message: string }>(`${A}/ventas`, body); }

  cupones() { return this.http.get<Cupon[]>(`${A}/cupones`); }
  generarCodigo(prefijo = 'FAS') { return this.http.get<{ codigo: string }>(`${A}/cupones/generar`, { params: parametros({ prefijo }) }); }
  guardarCupon(id: number | null, body: unknown) {
    return id ? this.http.put<Cupon>(`${A}/cupones/${id}`, body) : this.http.post<Cupon>(`${A}/cupones`, body);
  }
  eliminarCupon(id: number) { return this.http.delete<{ message: string }>(`${A}/cupones/${id}`); }

  productos(filtros: Record<string, unknown>) { return this.http.get<Pagina<ProductoAdmin> & { conteos: Conteos }>(`${A}/productos`, { params: parametros(filtros) }); }
  producto(id: number) { return this.http.get<ProductoAdmin>(`${A}/productos/${id}`); }
  crearProducto(body: unknown) { return this.http.post<ProductoAdmin>(`${A}/productos`, body); }
  guardarProducto(id: number, body: unknown) { return this.http.put<ProductoAdmin>(`${A}/productos/${id}`, body); }
  cambiarProducto(id: number, body: Record<string, unknown>) { return this.http.patch<ProductoAdmin>(`${A}/productos/${id}`, body); }
  eliminarProducto(id: number) { return this.http.delete(`${A}/productos/${id}`); }
  subirImagenes(id: number, archivos: File[]) {
    const body = new FormData();
    archivos.forEach(a => body.append('imagenes[]', a));
    return this.http.post<Imagen[]>(`${A}/productos/${id}/imagenes`, body);
  }
  ordenarImagenes(id: number, orden: number[]) { return this.http.put<Imagen[]>(`${A}/productos/${id}/imagenes/orden`, { orden }); }
  eliminarImagen(id: number, imagen: number) { return this.http.delete<Imagen[]>(`${A}/productos/${id}/imagenes/${imagen}`); }

  catalogos() { return this.http.get<Catalogos>(`${A}/catalogos`); }
  guardarCategoria(id: number | null, body: unknown) {
    return id ? this.http.put(`${A}/categorias/${id}`, body) : this.http.post(`${A}/categorias`, body);
  }
  eliminarCategoria(id: number) { return this.http.delete(`${A}/categorias/${id}`); }
  guardarMarca(id: number | null, body: unknown) {
    return id ? this.http.put(`${A}/marcas/${id}`, body) : this.http.post(`${A}/marcas`, body);
  }
  eliminarMarca(id: number) { return this.http.delete(`${A}/marcas/${id}`); }

  banners() { return this.http.get<Banner[]>(`${A}/banners`); }
  guardarBanner(id: number | null, body: FormData) { return this.http.post<Banner>(id ? `${A}/banners/${id}` : `${A}/banners`, body); }
  ordenarBanners(orden: number[]) { return this.http.put<Banner[]>(`${A}/banners/orden`, { orden }); }
  eliminarBanner(id: number) { return this.http.delete(`${A}/banners/${id}`); }

  reclamos(estado = '') { return this.http.get<{ datos: Reclamo[]; pendientes: number }>(`${A}/reclamos`, { params: parametros({ estado }) }); }
  responderReclamo(id: number, respuesta: string) { return this.http.put<Reclamo>(`${A}/reclamos/${id}`, { respuesta }); }
  imagenDescripcion(id: number, archivo: File) {
    const body = new FormData();
    body.append('imagen', archivo);
    return this.http.post<{ url: string; ancho: number; alto: number }>(`${A}/productos/${id}/imagen-descripcion`, body);
  }

  carritos(filtros: Record<string, unknown>) {
    return this.http.get<Pagina<CarritoAdmin> & { conteos: Record<string, number> }>(`${A}/carritos`, { params: parametros(filtros) });
  }
  actualizarCarrito(id: number, body: Record<string, unknown>) { return this.http.patch<CarritoAdmin>(`${A}/carritos/${id}`, body); }
}
