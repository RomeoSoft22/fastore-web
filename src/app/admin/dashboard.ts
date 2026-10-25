import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icono } from '../shared/icono';
import { SolesPipe, mensajeError } from '../shared/util';
import { AdminApi, Dashboard, Kpis } from './admin-api';
import { COLORES, GraficoBarras, GraficoColumnas } from './graficos';
import { RegistrarVenta } from './registrar-venta';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

/** Ventas, costos y ganancia del mes, con comparación, gráficos e indicadores de carritos e inventario. */
@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink, Icono, SolesPipe, GraficoColumnas, GraficoBarras, RegistrarVenta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
})
export class DashboardPagina {
  private api = inject(AdminApi);
  mes = signal(mesActual());
  datos = signal<Dashboard | null>(null);
  error = signal('');
  venta = signal(false);
  avisos = signal<string[]>([]);
  colores = COLORES;
  protected readonly Math = Math;
  /** invertido: subir es malo (costos, descuentos). */
  tiles: { etiqueta: string; campo: keyof Kpis; moneda: boolean; invertido?: boolean }[] = [
    { etiqueta: 'Ventas', campo: 'ventas', moneda: true },
    { etiqueta: 'Costo de ventas', campo: 'costo', moneda: true, invertido: true },
    { etiqueta: 'Ventas confirmadas', campo: 'pedidos', moneda: false },
    { etiqueta: 'Ticket promedio', campo: 'ticket', moneda: true },
    { etiqueta: 'Unidades vendidas', campo: 'unidades', moneda: false },
    { etiqueta: 'Descuentos otorgados', campo: 'descuentos', moneda: true, invertido: true },
  ];
  seriesVG = [
    { nombre: 'Ventas', color: COLORES.ventas },
    { nombre: 'Ganancia', color: COLORES.ganancia },
  ];

  nombreMes = computed(() => {
    const [a, m] = this.mes().split('-').map(Number);
    return `${MESES_LARGOS[m - 1]} ${a}`;
  });
  porDia = computed(() => {
    const [, m] = this.mes().split('-').map(Number);
    return (this.datos()?.por_dia ?? []).map(d => ({ etiqueta: String(d.dia), detalle: `${d.dia} de ${MESES_LARGOS[m - 1]} · ${d.pedidos} venta(s)`, valores: [d.ventas, d.ganancia] }));
  });
  tendencia = computed(() =>
    (this.datos()?.tendencia ?? []).map(t => {
      const [a, m] = t.mes.split('-').map(Number);
      return { etiqueta: `${MESES[m - 1]} ${String(a).slice(2)}`, detalle: `${MESES_LARGOS[m - 1]} ${a} · ${t.pedidos} venta(s)`, valores: [t.ventas, t.ganancia] };
    }),
  );
  categorias = computed(() => (this.datos()?.por_categoria ?? []).map(c => ({ etiqueta: c.categoria, valor: c.ventas, detalle: `ganancia S/ ${c.ganancia.toFixed(2)}` })));
  embudo = computed(() => {
    const etapas = this.datos()?.embudo ?? [];
    const base = etapas[0]?.total || 0;
    return etapas.map(e => ({ etiqueta: e.etapa, valor: e.total, detalle: base ? `${Math.round((e.total * 100) / base)}%` : '' }));
  });
  sinVentas = computed(() => (this.datos()?.kpis.pedidos ?? 0) === 0);

  constructor() {
    effect(() => this.cargar(this.mes()));
  }

  cargar(mes: string): void {
    this.error.set('');
    this.api.dashboard(mes).subscribe({
      next: d => {
        this.datos.set(d);
        this.avisos.set(
          [
            d.pedidos_por_confirmar ? `Tienes ${d.pedidos_por_confirmar} pedido(s) por confirmar como venta.` : '',
            d.sin_costo.productos ? `Hay ${d.sin_costo.productos} producto(s) activos sin costo: su ganancia no se puede calcular.` : '',
            d.abandonados.con_contacto ? `${d.abandonados.con_contacto} carrito(s) abandonados tienen celular para seguimiento.` : '',
          ].filter(Boolean),
        );
      },
      error: e => this.error.set(mensajeError(e)),
    });
  }

  cambiarMes(paso: number): void {
    const [a, m] = this.mes().split('-').map(Number);
    const fecha = new Date(a, m - 1 + paso, 1);
    this.mes.set(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`);
  }

  esMesActual(): boolean {
    return this.mes() >= mesActual();
  }

  /** Variación porcentual frente al mes anterior; null si no hay base. */
  variacion(campo: keyof Kpis): number | null {
    const d = this.datos();
    if (!d || !d.anterior[campo]) return null;
    return Math.round(((d.kpis[campo] - d.anterior[campo]) * 100) / Math.abs(d.anterior[campo]));
  }

  quitarAviso(i: number): void {
    this.avisos.update(a => a.filter((_, j) => j !== i));
  }

  ventaRegistrada(): void {
    this.venta.set(false);
    this.cargar(this.mes());
  }
}
