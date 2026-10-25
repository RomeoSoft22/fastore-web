export interface Imagen {
  id: number;
  url: string;
  miniatura: string;
  alt: string | null;
  ancho: number;
  alto: number;
}

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string;
  total?: number;
}

export interface Marca {
  id: number;
  nombre: string;
  slug: string;
  total?: number;
}

export type EstadoProducto = 'disponible' | 'agotado' | 'a_pedido';

export interface Producto {
  id: number;
  slug: string;
  nombre: string;
  resumen: string;
  precio: number;
  descuento: number;
  precio_final: number;
  estado: EstadoProducto;
  condicion: 'nuevo' | 'usado';
  stock: number;
  destacado: boolean;
  marca: Marca | null;
  categoria: Categoria | null;
  imagen: Imagen | null;
  /** HTML filtrado por fastore-api (solo formato, enlaces e imágenes). */
  descripcion?: string;
  descripcion_texto?: string;
  etiquetas?: string[];
  imagenes?: Imagen[];
}

export interface Banner {
  id: number;
  titulo: string;
  subtitulo: string | null;
  boton: string | null;
  enlace: string | null;
  imagen: string;
  imagen_movil: string | null;
  tema: 'claro' | 'oscuro';
  orden?: number;
  activo?: boolean;
  inicio?: string | null;
  fin?: string | null;
}

export interface Inicio {
  banners: Banner[];
  categorias: Categoria[];
  destacados: Producto[];
  novedades: Producto[];
}

export interface Pagina<T> {
  datos: T[];
  pagina: number;
  paginas: number;
  total: number;
}

export interface Busqueda extends Pagina<Producto> {
  categoria: Categoria | null;
  facetas: { categorias: Categoria[]; marcas: Marca[]; precio: { min: number; max: number } };
}

export interface ConfigTienda {
  nombre: string;
  descripcion: string;
  url: string;
  whatsapp: string;
  moneda: string;
  estaciones: string[];
  pagos: string[];
  entregas: { clave: TipoEntrega; nombre: string; detalle: string }[];
  cotizacion_dias: number;
  legal: { titular: string; documento: string; domicilio: string; correo: string; plazo_reclamo_dias: number };
}

export type TipoEntrega = 'estacion' | 'tienda' | 'local' | 'nacional';

export interface Contacto {
  nombre: string;
  celular: string;
  correo?: string;
  entrega: TipoEntrega | '';
  /** Estación del tren (entrega "estacion"). */
  estacion?: string;
  /** Dirección (envío local) o agencia Shalom (envío nacional). */
  direccion?: string;
  /** Distrito (local) o ciudad (nacional). */
  ciudad?: string;
  /** DNI de quien recoge en Shalom. */
  dni?: string;
  pago: string;
}

export interface Cotizacion {
  codigo: string;
  fecha: string;
  vence: string;
  vencida: boolean;
  estado: string;
  cliente: string;
  entrega: { tipo: TipoEntrega; nombre: string; detalle: string; lugar: string | null };
  pago: string | null;
  items: { nombre: string; slug: string | null; imagen: string | null; cantidad: number; precio: number; importe: number }[];
  subtotal: number;
  cupon: string | null;
  descuento: number;
  total: number;
  whatsapp_url: string;
}
