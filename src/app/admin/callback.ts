import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccesoService } from '../core/acceso';
import { mensajeError } from '../shared/util';

/** Destino de la redirección de identidad: canjea el código y vuelve a la página que se quería abrir. */
@Component({
  selector: 'app-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="callback">
      <img src="img/marca/icono.png" alt="FAStore" width="56" height="56" />
      @if (error()) {
        <h1>No se pudo iniciar sesión</h1>
        <p class="error">{{ error() }}</p>
        <button type="button" class="btn primario" (click)="reintentar()">Volver a ingresar</button>
        <a href="/" class="enlace">Ir a la tienda</a>
      } @else {
        <p>Validando tu sesión…</p>
      }
    </main>
  `,
})
export class CallbackPagina implements OnInit {
  private acceso = inject(AccesoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  error = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const code = params.get('code');
    const state = params.get('state');

    if (params.get('error')) {
      this.error.set(params.get('error_description') || 'Identidad rechazó el ingreso.');
      return;
    }
    if (!code || !state) {
      this.error.set('Falta el código de autorización.');
      return;
    }
    this.acceso.completar(code, state).subscribe({
      next: volverA => this.router.navigateByUrl(volverA, { replaceUrl: true }),
      error: e => this.error.set(mensajeError(e, 'No se pudo validar la sesión.')),
    });
  }

  reintentar(): void {
    this.acceso.ingresar();
  }
}
