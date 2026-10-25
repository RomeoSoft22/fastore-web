import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TiendaApi } from '../core/api';
import { SeoService } from '../core/seo';
import { Icono } from '../shared/icono';
import { mensajeError } from '../shared/util';

/**
 * Libro de Reclamaciones virtual (Ley 29571; D.S. 011-2011-PCM y modificatorias). Hoja con los campos
 * que exige la norma; al registrarla se entrega un código correlativo y el plazo de respuesta.
 */
@Component({
  selector: 'app-reclamaciones',
  imports: [FormsModule, RouterLink, DatePipe, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reclamaciones.html',
})
export class ReclamacionesPagina {
  private api = inject(TiendaApi);
  config = toSignal(this.api.config$);
  hoy = new Date();
  enviando = signal(false);
  error = signal('');
  registrado = signal<{ codigo: string; vence: string; creado: string } | null>(null);

  form = {
    tipo: 'reclamo',
    nombre: '',
    documento_tipo: 'DNI',
    documento: '',
    domicilio: '',
    correo: '',
    telefono: '',
    apoderado: '',
    bien: 'producto',
    monto: null as number | null,
    pedido_ref: '',
    descripcion_bien: '',
    detalle: '',
    pedido_consumidor: '',
    acepta: false,
  };

  constructor() {
    inject(SeoService).aplicar({ titulo: 'Libro de Reclamaciones', ruta: '/libro-de-reclamaciones' });
  }

  enviar(): void {
    this.error.set('');
    this.enviando.set(true);
    this.api.registrarReclamo(this.form).subscribe({
      next: r => {
        this.registrado.set(r);
        this.enviando.set(false);
        window.scrollTo({ top: 0 });
      },
      error: e => {
        this.error.set(mensajeError(e, 'No pudimos registrar tu hoja de reclamación.'));
        this.enviando.set(false);
      },
    });
  }

  imprimir(): void {
    window.print();
  }
}
