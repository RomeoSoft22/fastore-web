import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { TiendaApi } from './core/api';
import { CarritoService } from './core/carrito';
import { ConsentimientoService } from './core/consentimiento';
import { AvisoCookies } from './shared/aviso-cookies';
import { Icono } from './shared/icono';
import { SelectorTema } from './shared/selector-tema';
import { SolesPipe } from './shared/util';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Icono, SolesPipe, AvisoCookies, SelectorTema],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private router = inject(Router);
  private api = inject(TiendaApi);
  carrito = inject(CarritoService);
  consentimiento = inject(ConsentimientoService);

  categorias = toSignal(this.api.categorias$, { initialValue: [] });
  config = toSignal(this.api.config$);
  ruta = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: location.pathname },
  );

  menu = signal(false);
  texto = signal('');
  anio = new Date().getFullYear();

  constructor() {
    // Al navegar se cierran el menú y el carrito lateral, y se vuelve arriba.
    effect(() => {
      this.ruta();
      this.menu.set(false);
      this.carrito.abierto.set(false);
    });
    // El aviso de "agregado" se oculta solo.
    let aviso: ReturnType<typeof setTimeout>;
    effect(() => {
      if (this.carrito.agregado()) {
        clearTimeout(aviso);
        aviso = setTimeout(() => this.carrito.agregado.set(null), 3500);
      }
    });
  }

  esAdmin(): boolean {
    return this.ruta().startsWith('/admin') || this.ruta().startsWith('/callback');
  }

  buscar(): void {
    const q = this.texto().trim();
    this.router.navigate(['/tienda'], { queryParams: q ? { q } : {} });
  }

  whatsapp(): string {
    return `https://wa.me/${this.config()?.whatsapp ?? '51966422599'}?text=${encodeURIComponent('¡Hola FAStore! Tengo una consulta.')}`;
  }
}
