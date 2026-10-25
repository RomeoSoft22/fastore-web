import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../shared/icono';
import { SolesPipe, mensajeError } from '../shared/util';
import { AdminApi, Reclamo } from './admin-api';

/** Reclamos y quejas del Libro de Reclamaciones, con su plazo legal de respuesta. */
@Component({
  selector: 'app-reclamos',
  imports: [FormsModule, DatePipe, Icono, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Libro de Reclamaciones</h1>
    <p class="tenue">Debes responder cada reclamo al correo del consumidor en un plazo máximo de 15 días hábiles. Registra aquí la respuesta enviada.</p>
    <div class="pestanas" role="tablist">
      @for (v of vistas; track v.valor) {
        <button type="button" role="tab" [class.activo]="estado() === v.valor" (click)="estado.set(v.valor)">{{ v.texto }}</button>
      }
    </div>
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    <div class="lista-carritos">
      @for (r of lista(); track r.id) {
        <article class="panel reclamo" [class.vencido]="r.estado === 'pendiente' && r.vence < hoy">
          <header class="panel-titulo">
            <div>
              <b>{{ r.codigo }}</b> · {{ r.tipo === 'reclamo' ? 'Reclamo' : 'Queja' }}
              <small class="tenue"> · {{ r.creado | date: 'dd/MM/yyyy HH:mm' }}</small>
            </div>
            <span class="etiqueta-estado" [class.vendido]="r.estado === 'atendido'" [class.abandonado]="r.estado === 'pendiente' && r.vence < hoy">
              {{ r.estado === 'atendido' ? 'Atendido' : 'Responder antes del ' + (r.vence | date: 'dd/MM') }}
            </span>
          </header>
          <dl class="datos-carrito">
            <div><dt>Consumidor</dt><dd>{{ r.nombre }} · {{ r.documento }}</dd></div>
            <div><dt>Contacto</dt><dd><a [href]="'mailto:' + r.correo">{{ r.correo }}</a> · {{ r.telefono }}</dd></div>
            <div><dt>Domicilio</dt><dd>{{ r.domicilio }}</dd></div>
            <div><dt>Bien</dt><dd>{{ r.bien }} @if (r.monto) { · {{ r.monto | soles }} } @if (r.pedido_ref) { · {{ r.pedido_ref }} }</dd></div>
          </dl>
          <p><b>Producto/servicio:</b> {{ r.descripcion_bien }}</p>
          <p><b>Detalle:</b> {{ r.detalle }}</p>
          <p><b>Pedido del consumidor:</b> {{ r.pedido_consumidor }}</p>
          @if (r.estado === 'atendido') {
            <p class="exito-texto"><b>Respuesta ({{ r.respondido | date: 'dd/MM/yyyy' }}):</b> {{ r.respuesta }}</p>
          } @else {
            <label>Respuesta enviada al consumidor
              <textarea rows="3" [(ngModel)]="respuestas[r.id]" [name]="'r' + r.id"></textarea>
            </label>
            <div class="acciones-carrito">
              <a class="btn" [href]="'mailto:' + r.correo + '?subject=' + encodeURIComponent('Respuesta a su ' + r.tipo + ' ' + r.codigo) + '&body=' + encodeURIComponent(respuestas[r.id] || '')">
                <app-icono nombre="documento" [tamano]="18" /> Redactar correo</a>
              <button type="button" class="btn primario" [disabled]="!respuestas[r.id]?.trim()" (click)="responder(r)">Marcar como atendido</button>
            </div>
          }
        </article>
      } @empty {
        <div class="vacio panel"><app-icono nombre="libro" [tamano]="40" /><p>No hay reclamos en esta vista.</p></div>
      }
    </div>
  `,
})
export class ReclamosPagina {
  private api = inject(AdminApi);
  vistas = [{ valor: 'pendiente', texto: 'Pendientes' }, { valor: 'atendido', texto: 'Atendidos' }, { valor: '', texto: 'Todos' }];
  estado = signal('pendiente');
  lista = signal<Reclamo[]>([]);
  error = signal('');
  respuestas: Record<number, string> = {};
  hoy = new Date().toLocaleDateString('en-CA');
  protected readonly encodeURIComponent = encodeURIComponent;

  constructor() {
    effect(() => this.api.reclamos(this.estado()).subscribe({ next: r => this.lista.set(r.datos), error: e => this.error.set(mensajeError(e)) }));
  }

  responder(r: Reclamo): void {
    this.api.responderReclamo(r.id, this.respuestas[r.id]).subscribe({
      next: nuevo => this.lista.update(l => l.map(x => (x.id === r.id ? nuevo : x))),
      error: e => this.error.set(mensajeError(e)),
    });
  }
}
