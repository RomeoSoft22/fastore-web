import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SolesPipe, mensajeError } from '../shared/util';
import { AdminApi, Parametros } from './admin-api';

/** Parámetros de la fórmula de costos, con un simulador para ver su efecto sobre un producto. */
@Component({
  selector: 'app-costos',
  imports: [FormsModule, SolesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Fórmula de costos</h1>
    <p class="tenue">Tú ingresas en cada producto su <b>costo de manufactura o compra</b>. El sistema le suma estos costos para calcular la ganancia real y sugerirte un precio. El precio final siempre lo decides tú.</p>

    @if (valores(); as v) {
      <div class="dos-paneles">
        <form class="panel" (submit)="$event.preventDefault(); guardar()">
          <h2>Parámetros</h2>
          @for (c of claves; track c) {
            <label>{{ etiquetas()[c] }}
              <input type="number" min="0" step="0.01" [name]="c" [ngModel]="v[c]" (ngModelChange)="cambiar(c, $event)" />
            </label>
          }
          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          @if (mensaje()) { <p class="exito-texto" role="status">{{ mensaje() }}</p> }
          <button type="submit" class="btn primario ancho" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar parámetros' }}</button>
        </form>

        <section class="panel">
          <h2>Simulador</h2>
          <div class="dos-columnas">
            <label>Costo de manufactura S/ <input type="number" min="0" step="0.01" name="sc" [ngModel]="simCosto()" (ngModelChange)="simCosto.set(+$event || 0)" /></label>
            <label>Precio de venta S/ <input type="number" min="0" step="0.01" name="sp" [ngModel]="simPrecio()" (ngModelChange)="simPrecio.set(+$event || 0)" /></label>
          </div>
          <div class="formula">
            <div><span>Costo de manufactura</span><span>{{ simCosto() | soles }}</span></div>
            <div><span>+ Flete e importación ({{ v.costo_flete_pct }}%)</span><span>{{ simCosto() * v.costo_flete_pct / 100 | soles }}</span></div>
            <div><span>+ Aduana e impuestos ({{ v.costo_aduana_pct }}%)</span><span>{{ simCosto() * v.costo_aduana_pct / 100 | soles }}</span></div>
            <div><span>+ Empaque</span><span>{{ v.costo_empaque | soles }}</span></div>
            <div class="total"><span>Costo unitario</span><strong>{{ sim().unitario | soles }}</strong></div>
            <div><span>Precio sugerido (margen {{ v.margen_objetivo_pct }}%)</span><strong class="sugerido">{{ sim().sugerido | soles }}</strong></div>
            <div><span>− Comisión de cobro ({{ v.comision_pct }}%)</span><span>{{ sim().comision | soles }}</span></div>
            <div class="total"><span>Ganancia por unidad</span><strong [class.negativo]="sim().ganancia < 0">{{ sim().ganancia | soles }} · {{ sim().margen }}%</strong></div>
            <div><span>− Entrega por pedido</span><span>{{ v.costo_entrega_pedido | soles }}</span></div>
          </div>
          <p class="tenue pequeno">La entrega se descuenta una vez por pedido, no por unidad.</p>
        </section>
      </div>
    }
  `,
})
export class CostosPagina {
  private api = inject(AdminApi);
  claves: (keyof Parametros)[] = ['costo_flete_pct', 'costo_aduana_pct', 'costo_empaque', 'costo_entrega_pedido', 'comision_pct', 'margen_objetivo_pct'];
  valores = signal<Parametros | null>(null);
  etiquetas = signal<Record<string, string>>({});
  guardando = signal(false);
  mensaje = signal('');
  error = signal('');
  simCosto = signal(20);
  simPrecio = signal(45);

  sim = computed(() => {
    const v = this.valores();
    if (!v) return { unitario: 0, sugerido: 0, comision: 0, ganancia: 0, margen: 0 };
    const unitario = this.simCosto() * (1 + (v.costo_flete_pct + v.costo_aduana_pct) / 100) + v.costo_empaque;
    const divisor = 1 - (v.margen_objetivo_pct + v.comision_pct) / 100;
    const comision = (this.simPrecio() * v.comision_pct) / 100;
    const ganancia = this.simPrecio() - comision - unitario;
    return {
      unitario,
      sugerido: divisor > 0 ? unitario / divisor : 0,
      comision,
      ganancia,
      margen: this.simPrecio() ? Math.round((ganancia * 1000) / this.simPrecio()) / 10 : 0,
    };
  });

  constructor() {
    this.api.parametros().subscribe(r => {
      this.valores.set(r.valores);
      this.etiquetas.set(r.etiquetas);
    });
  }

  cambiar(clave: keyof Parametros, valor: number): void {
    const v = this.valores();
    if (v) this.valores.set({ ...v, [clave]: Number(valor) || 0 });
  }

  guardar(): void {
    const v = this.valores();
    if (!v) return;
    this.error.set('');
    this.mensaje.set('');
    this.guardando.set(true);
    this.api.guardarParametros(v).subscribe({
      next: r => {
        this.valores.set(r.valores);
        this.guardando.set(false);
        this.mensaje.set('Parámetros guardados. Las ventas nuevas usarán estos costos.');
      },
      error: e => {
        this.guardando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
