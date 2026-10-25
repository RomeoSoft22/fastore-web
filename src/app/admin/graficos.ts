import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

/**
 * Gráficos del dashboard en SVG propio (sin librerías). Paleta validada para daltonismo y contraste
 * sobre fondo claro: azul = ventas, naranja = ganancia. Un solo eje, barras ≤ 24px con borde
 * redondeado en el extremo de datos, tooltip al pasar el mouse y vista de tabla.
 */
// Colores validados (daltonismo y contraste) para cada tema: ver --serie-* en styles.scss.
export const COLORES = { ventas: 'var(--serie-ventas)', ganancia: 'var(--serie-ganancia)' };

export interface Serie {
  nombre: string;
  color: string;
}

export interface Grupo {
  etiqueta: string;
  detalle?: string;
  valores: number[];
}

export function compacto(valor: number, moneda = true): string {
  const abs = Math.abs(valor);
  const texto = abs >= 1000 ? `${(valor / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : `${Math.round(valor * 100) / 100}`;
  return moneda ? `S/ ${texto}` : texto;
}

function soles(valor: number): string {
  return 'S/ ' + valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Escala "redonda" para los ticks del eje Y. */
function escala(min: number, max: number): number[] {
  const rango = Math.max(1, max - min);
  const paso0 = rango / 4;
  const potencia = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map(m => m * potencia).find(p => p >= paso0) ?? paso0;
  const ticks: number[] = [];
  for (let t = Math.floor(min / paso) * paso; t <= max + paso * 0.999; t += paso) ticks.push(Math.round(t * 100) / 100);
  return ticks.length > 1 ? ticks : [0, paso];
}

@Component({
  selector: 'app-grafico-columnas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Bloque: el ancho del contenedor define el del gráfico (un elemento inline mide 0).
  host: { style: 'display:block' },
  template: `
    <div class="grafico-cabecera">
      @if (series().length > 1) {
        <div class="leyenda">
          @for (s of series(); track s.nombre) { <span><i [style.background]="s.color"></i>{{ s.nombre }}</span> }
        </div>
      }
      <button type="button" class="enlace" (click)="tabla.set(!tabla())">{{ tabla() ? 'Ver gráfico' : 'Ver tabla' }}</button>
    </div>
    @if (tabla()) {
      <div class="tabla-desplazable">
        <table class="tabla">
          <thead><tr><th>{{ ejeX() }}</th>@for (s of series(); track s.nombre) { <th class="num">{{ s.nombre }}</th> }</tr></thead>
          <tbody>
            @for (g of grupos(); track g.etiqueta) {
              <tr><td>{{ g.detalle || g.etiqueta }}</td>@for (v of g.valores; track $index) { <td class="num">{{ soles(v) }}</td> }</tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="grafico" (mouseleave)="activo.set(null)">
        <svg [attr.viewBox]="'0 0 ' + ancho() + ' ' + alto" [attr.height]="alto" width="100%" role="img" [attr.aria-label]="titulo()">
          @for (t of geo().ticks; track t.valor) {
            <line [attr.x1]="izq" [attr.x2]="ancho() - 8" [attr.y1]="t.y" [attr.y2]="t.y" class="rejilla" [class.base]="t.valor === 0" />
            <text [attr.x]="izq - 8" [attr.y]="t.y + 4" text-anchor="end" class="eje">{{ compacto(t.valor) }}</text>
          }
          @for (b of geo().barras; track $index) {
            @if (b.d) { <path [attr.d]="b.d" [style.fill]="b.color" [attr.opacity]="activo() === null || activo() === b.grupo ? 1 : 0.35" /> }
          }
          @for (g of geo().etiquetas; track $index) {
            <text [attr.x]="g.x" [attr.y]="alto - 8" text-anchor="middle" class="eje">{{ g.texto }}</text>
          }
          @for (g of geo().zonas; track $index) {
            <rect [attr.x]="g.x" y="0" [attr.width]="g.ancho" [attr.height]="alto - abajo" fill="transparent"
              (mouseenter)="activo.set($index)" (click)="activo.set($index)" />
          }
        </svg>
        @if (activo() !== null) {
          @let g = grupos()[activo()!];
          <div class="tooltip" [style.left.px]="geo().zonas[activo()!].centro" [class.derecha]="geo().zonas[activo()!].centro > ancho() * 0.6">
            <b>{{ g.detalle || g.etiqueta }}</b>
            @for (s of series(); track s.nombre; let i = $index) {
              <span><i [style.background]="s.color"></i>{{ s.nombre }} <strong>{{ soles(g.valores[i]) }}</strong></span>
            }
          </div>
        }
      </div>
    }
  `,
})
export class GraficoColumnas {
  private host = inject(ElementRef<HTMLElement>);
  titulo = input('');
  ejeX = input('Periodo');
  series = input.required<Serie[]>();
  grupos = input.required<Grupo[]>();
  /** Mostrar una de cada N etiquetas del eje X (días del mes). */
  cadaEtiqueta = input(1);

  ancho = signal(640);
  activo = signal<number | null>(null);
  tabla = signal(false);
  readonly alto = 240;
  readonly izq = 56;
  readonly abajo = 28;
  compacto = compacto;
  soles = soles;

  constructor() {
    afterNextRender(() => {
      const medir = () => this.ancho.set(Math.max(280, this.host.nativeElement.clientWidth));
      medir();
      new ResizeObserver(medir).observe(this.host.nativeElement);
    });
  }

  geo = computed(() => {
    const grupos = this.grupos();
    const nSeries = this.series().length;
    const valores = grupos.flatMap(g => g.valores);
    const ticks = escala(Math.min(0, ...valores), Math.max(0, ...valores));
    const [min, max] = [ticks[0], ticks[ticks.length - 1]];
    const arriba = 10;
    const alto = this.alto - this.abajo - arriba;
    const y = (v: number) => arriba + ((max - v) / (max - min || 1)) * alto;
    const anchoUtil = this.ancho() - this.izq - 8;
    const banda = anchoUtil / Math.max(1, grupos.length);
    const grosor = Math.max(3, Math.min(24, (banda * 0.72 - 2 * (nSeries - 1)) / nSeries));
    const cero = y(0);

    const barras = grupos.flatMap((g, i) => {
      const inicio = this.izq + i * banda + (banda - (grosor * nSeries + 2 * (nSeries - 1))) / 2;
      return g.valores.map((v, s) => {
        const x = inicio + s * (grosor + 2);
        const extremo = y(v);
        const h = Math.abs(cero - extremo);
        const r = Math.min(4, h, grosor / 2);
        // Esquinas redondeadas solo en el extremo de datos; la base queda recta.
        const d = h < 0.5 ? '' : v >= 0
          ? `M${x},${cero}V${extremo + r}Q${x},${extremo} ${x + r},${extremo}H${x + grosor - r}Q${x + grosor},${extremo} ${x + grosor},${extremo + r}V${cero}Z`
          : `M${x},${cero}V${extremo - r}Q${x},${extremo} ${x + r},${extremo}H${x + grosor - r}Q${x + grosor},${extremo} ${x + grosor},${extremo - r}V${cero}Z`;
        return { d, color: this.series()[s].color, grupo: i };
      });
    });

    return {
      ticks: ticks.map(valor => ({ valor, y: y(valor) })),
      barras,
      etiquetas: grupos
        .map((g, i) => ({ texto: g.etiqueta, x: this.izq + i * banda + banda / 2, i }))
        .filter(e => e.i % this.cadaEtiqueta() === 0 || e.i === grupos.length - 1),
      zonas: grupos.map((_, i) => ({ x: this.izq + i * banda, ancho: banda, centro: this.izq + i * banda + banda / 2 })),
    };
  });
}

export interface Barra {
  etiqueta: string;
  valor: number;
  detalle?: string;
}

/** Barras horizontales de una sola serie con el valor en la punta (ventas por categoría, embudo). */
@Component({
  selector: 'app-grafico-barras',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:block' },
  template: `
    <ul class="barras-h">
      @for (b of barras(); track b.etiqueta) {
        <li [title]="b.etiqueta + ': ' + formato(b.valor) + (b.detalle ? ' · ' + b.detalle : '')">
          <span class="barras-h-etiqueta">{{ b.etiqueta }}</span>
          <span class="barras-h-pista">
            <span class="barras-h-barra" [style.width.%]="maximo() ? (Math.max(0, b.valor) / maximo()) * 100 : 0" [style.background]="color()"></span>
            <span class="barras-h-valor">{{ formato(b.valor) }}@if (b.detalle) { <small>{{ b.detalle }}</small> }</span>
          </span>
        </li>
      } @empty {
        <li class="tenue">Sin datos en este periodo.</li>
      }
    </ul>
  `,
})
export class GraficoBarras {
  barras = input.required<Barra[]>();
  color = input(COLORES.ventas);
  moneda = input(true);
  maximo = computed(() => Math.max(0, ...this.barras().map(b => b.valor)));
  protected readonly Math = Math;

  formato(valor: number): string {
    return this.moneda() ? soles(valor) : valor.toLocaleString('es-PE');
  }
}
