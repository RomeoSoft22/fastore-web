import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TiendaApi } from '../core/api';
import { ConsentimientoService } from '../core/consentimiento';
import { SeoService } from '../core/seo';

const TITULOS: Record<string, string> = {
  privacidad: 'Política de privacidad',
  cookies: 'Política de cookies',
  terminos: 'Términos y condiciones',
};

/**
 * Textos legales de la tienda (Perú: Ley 29733 de Protección de Datos Personales y su reglamento
 * D.S. 016-2024-JUS; Ley 29571, Código de Protección y Defensa del Consumidor). Alineados también
 * con los principios del RGPD para visitantes de otros países.
 */
@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legal.html',
})
export class LegalPagina {
  private seo = inject(SeoService);
  consentimiento = inject(ConsentimientoService);
  config = toSignal(inject(TiendaApi).config$);
  pagina = input.required<string>();

  titulo = computed(() => TITULOS[this.pagina()] ?? 'Información legal');
  legal = computed(() => this.config()?.legal);
  tienda = computed(() => this.config()?.nombre ?? 'FAStore');
  actualizado = '25 de octubre de 2026';

  constructor() {
    effect(() => this.seo.aplicar({ titulo: this.titulo(), ruta: `/legal/${this.pagina()}` }));
  }
}
