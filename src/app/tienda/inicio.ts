import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TiendaApi } from '../core/api';
import { Banner } from '../core/modelos';
import { SeoService } from '../core/seo';
import { Icono } from '../shared/icono';
import { TarjetaProducto } from '../shared/tarjeta-producto';

const ICONOS: Record<string, string> = { nfc: 'tarjeta', tecnologia: 'caja', 'figuras-de-accion': 'estrella', casa: 'inicio', accesorios: 'etiqueta' };

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Icono, TarjetaProducto],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio.html',
})
export class InicioPagina {
  private api = inject(TiendaApi);
  datos = toSignal(this.api.inicio());
  banners = computed(() => this.datos()?.banners ?? []);
  actual = signal(0);
  iconos = ICONOS;
  private toque = 0;

  constructor() {
    inject(SeoService).aplicar({ titulo: 'FAStore | Tecnología, NFC y coleccionables en Lima', ruta: '/' });
    const intervalo = setInterval(() => this.banners().length > 1 && this.mover(1), 6000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));
  }

  mover(paso: number): void {
    const total = this.banners().length;
    if (total) this.actual.set((this.actual() + paso + total) % total);
  }

  inicioToque(e: TouchEvent): void {
    this.toque = e.touches[0].clientX;
  }

  finToque(e: TouchEvent): void {
    const distancia = e.changedTouches[0].clientX - this.toque;
    if (Math.abs(distancia) > 40) this.mover(distancia < 0 ? 1 : -1);
  }

  externo(b: Banner): boolean {
    return !!b.enlace?.startsWith('http');
  }
}
