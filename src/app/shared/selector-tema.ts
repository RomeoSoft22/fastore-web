import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { Tema, TemaService } from '../core/tema';
import { Icono } from './icono';

/** Botón con menú Luz / Oscuro / Sistema (tienda y administración). */
@Component({
  selector: 'app-selector-tema',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'selector-tema', '(document:click)': 'cerrarFuera($event)', '(keydown.escape)': 'abierto.set(false)' },
  template: `
    <button type="button" class="btn-icono" (click)="abierto.set(!abierto())" [attr.aria-expanded]="abierto()" aria-haspopup="menu"
      [attr.aria-label]="'Tema: ' + actual()">
      <app-icono [nombre]="t.icono()" [tamano]="20" />
    </button>
    @if (abierto()) {
      <div class="menu-tema" role="menu" aria-label="Tema de la página">
        @for (o of t.opciones; track o.valor) {
          <button type="button" role="menuitemradio" [attr.aria-checked]="t.tema() === o.valor" [class.activo]="t.tema() === o.valor" (click)="elegir(o.valor)">
            <app-icono [nombre]="o.icono" [tamano]="18" /> {{ o.texto }}
            @if (t.tema() === o.valor) { <app-icono nombre="check" [tamano]="16" /> }
          </button>
        }
      </div>
    }
  `,
})
export class SelectorTema {
  t = inject(TemaService);
  private host = inject(ElementRef<HTMLElement>);
  abierto = signal(false);

  actual(): string {
    return this.t.opciones.find(o => o.valor === this.t.tema())?.texto ?? 'Sistema';
  }

  elegir(tema: Tema): void {
    this.t.elegir(tema);
    this.abierto.set(false);
  }

  cerrarFuera(evento: MouseEvent): void {
    if (this.abierto() && !this.host.nativeElement.contains(evento.target as Node)) this.abierto.set(false);
  }
}
