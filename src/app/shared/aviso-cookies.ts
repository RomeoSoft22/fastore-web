import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentimientoService } from '../core/consentimiento';

/** Banner de cookies de la primera visita, con opción de configurar por categoría. */
@Component({
  selector: 'app-aviso-cookies',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (c.pendiente()) {
      <section class="aviso-cookies" role="dialog" aria-modal="false" aria-labelledby="cookies-titulo" aria-describedby="cookies-texto">
        @if (!c.configurando()) {
          <div class="aviso-cookies-texto">
            <h2 id="cookies-titulo">Tu privacidad importa</h2>
            <p id="cookies-texto">
              Usamos cookies <b>necesarias</b> para que la tienda funcione (carrito, preferencias y seguridad) y, solo si lo aceptas,
              cookies <b>analíticas</b> para saber cómo se usa la web. No vendemos tus datos.
              <a routerLink="/legal/cookies">Política de cookies</a> · <a routerLink="/legal/privacidad">Privacidad</a>
            </p>
          </div>
          <div class="aviso-cookies-botones">
            <button type="button" class="btn" (click)="c.abrirConfiguracion()">Configurar</button>
            <button type="button" class="btn" (click)="c.soloNecesarias()">Rechazar opcionales</button>
            <button type="button" class="btn primario" (click)="c.aceptarTodo()">Aceptar todas</button>
          </div>
        } @else {
          <div class="aviso-cookies-texto">
            <h2 id="cookies-titulo">Preferencias de cookies</h2>
            <label class="cookie-tipo">
              <input type="checkbox" checked disabled />
              <span><b>Necesarias</b> · siempre activas<small>Carrito de compras, tema de la página, sesión de administración y esta elección. Sin ellas la tienda no funciona.</small></span>
            </label>
            <label class="cookie-tipo">
              <input type="checkbox" [checked]="analiticas()" (change)="analiticas.set(!analiticas())" />
              <span><b>Analíticas</b> · Google Analytics<small>Cuentan visitas y páginas vistas de forma agregada (IP anonimizada) para mejorar la tienda. Las instala Google.</small></span>
            </label>
          </div>
          <div class="aviso-cookies-botones">
            <button type="button" class="btn" (click)="c.soloNecesarias()">Rechazar opcionales</button>
            <button type="button" class="btn primario" (click)="c.guardar(analiticas())">Guardar preferencias</button>
          </div>
        }
      </section>
    }
  `,
})
export class AvisoCookies {
  c = inject(ConsentimientoService);
  analiticas = signal(this.c.preferencias()?.analiticas ?? false);
}
