import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { TiendaApi } from './api';
import { Contacto, Producto } from './modelos';

export interface ItemCarrito {
  id: number;
  slug: string;
  nombre: string;
  precio: number;
  imagen: string | null;
  cantidad: number;
  maximo: number;
}

const CLAVE = 'fastore_carrito';

/**
 * Carrito en el navegador (localStorage) que se sincroniza con fastore-api con un token anónimo.
 * Así la tienda puede ver quién agregó productos y no envió el pedido, y escribirle por WhatsApp.
 */
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private api = inject(TiendaApi);
  private pendiente?: ReturnType<typeof setTimeout>;
  private token: string | null = null;

  readonly items = signal<ItemCarrito[]>([]);
  readonly contacto = signal<Partial<Contacto>>({});
  readonly abierto = signal(false);
  /** Último producto agregado, para el aviso flotante. */
  readonly agregado = signal<ItemCarrito | null>(null);

  readonly cantidad = computed(() => this.items().reduce((n, i) => n + i.cantidad, 0));
  readonly total = computed(() => Math.round(this.items().reduce((t, i) => t + i.precio * i.cantidad, 0) * 100) / 100);

  constructor() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
      if (guardado) {
        this.items.set(guardado.items ?? []);
        this.contacto.set(guardado.contacto ?? {});
        this.token = guardado.token ?? null;
      }
    } catch {
      /* almacenamiento no disponible */
    }
    effect(() => this.persistir(this.items(), this.contacto()));
  }

  agregar(producto: Producto, cantidad = 1): void {
    if (producto.estado === 'agotado') return;
    const maximo = producto.estado === 'a_pedido' ? 99 : Math.max(1, Math.min(99, producto.stock || 99));
    const existente = this.items().find(i => i.id === producto.id);
    const item: ItemCarrito = existente
      ? { ...existente, cantidad: Math.min(maximo, existente.cantidad + cantidad), precio: producto.precio_final }
      : {
          id: producto.id,
          slug: producto.slug,
          nombre: producto.nombre,
          precio: producto.precio_final,
          imagen: producto.imagen?.miniatura ?? null,
          cantidad: Math.min(maximo, cantidad),
          maximo,
        };
    this.items.update(items => (existente ? items.map(i => (i.id === item.id ? item : i)) : [...items, item]));
    this.agregado.set(item);
    this.sincronizar();
  }

  cambiar(id: number, cantidad: number): void {
    this.items.update(items => items.map(i => (i.id === id ? { ...i, cantidad: Math.max(1, Math.min(i.maximo, cantidad)) } : i)));
    this.sincronizar();
  }

  quitar(id: number): void {
    this.items.update(items => items.filter(i => i.id !== id));
    this.sincronizar();
  }

  /** Guarda el contacto mientras lo escribe: si no termina el pedido, la tienda puede escribirle. */
  actualizarContacto(contacto: Partial<Contacto>): void {
    this.contacto.set({ ...this.contacto(), ...contacto });
    this.sincronizar(1500);
  }

  /** Envía el pedido: la tienda genera la cotización y devuelve su código y el enlace de WhatsApp. */
  async enviarPedido(contacto: Contacto, cupon: string | null, acepta: boolean): Promise<{ cotizacion: string; vence: string; whatsapp_url: string }> {
    clearTimeout(this.pendiente);
    this.contacto.set(contacto);
    const respuesta = await new Promise<{ cotizacion: string; vence: string; whatsapp_url: string }>((resolve, reject) =>
      this.api.enviarPedido({ token: this.token, items: this.lineas(), contacto, cupon, acepta }).subscribe({ next: resolve, error: reject }),
    );
    // El pedido cierra este carrito: el próximo será uno nuevo (se conserva el contacto).
    this.token = null;
    this.items.set([]);
    return respuesta;
  }

  private sincronizar(espera = 600): void {
    clearTimeout(this.pendiente);
    this.pendiente = setTimeout(() => {
      if (!this.token && this.items().length === 0) return;
      // Solo se envía el celular cuando ya está completo (si no, el API rechazaría todo el carrito).
      const contacto: Partial<Contacto> = Object.fromEntries(Object.entries(this.contacto()).filter(([, v]) => v));
      if (contacto.celular && !/^\+?[0-9 ]{9,15}$/.test(contacto.celular)) delete contacto.celular;
      if (contacto.dni && !/^[0-9]{8}$|^[A-Za-z0-9]{9,12}$/.test(contacto.dni)) delete contacto.dni;
      delete (contacto as Record<string, unknown>)['hora']; // dato de la versión anterior
      this.api
        .sincronizarCarrito({
          token: this.token,
          items: this.lineas(),
          contacto,
          origen: this.token ? undefined : document.referrer || undefined,
        })
        .subscribe({
          next: r => {
            this.token = r.token;
            this.persistir(this.items(), this.contacto());
          },
          error: () => {
            /* sin conexión: se reintenta en el próximo cambio */
          },
        });
    }, espera);
  }

  private lineas() {
    return this.items().map(i => ({ id: i.id, cantidad: i.cantidad }));
  }

  private persistir(items: ItemCarrito[], contacto: Partial<Contacto>): void {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ items, contacto, token: this.token }));
    } catch {
      /* almacenamiento no disponible */
    }
  }
}
