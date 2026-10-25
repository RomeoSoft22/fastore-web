import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Imagen } from '../core/modelos';
import { Icono } from '../shared/icono';
import { SolesPipe, mensajeError } from '../shared/util';
import { firstValueFrom } from 'rxjs';
import { AdminApi } from './admin-api';
import { EditorTexto } from './editor-texto';

interface FormProducto {
  nombre: string;
  slug: string;
  marca_id: number | null;
  categoria_id: number | null;
  resumen: string;
  descripcion: string;
  etiquetas: string[];
  precio: number | null;
  costo: number | null;
  costo_extra: number | null;
  descuento: number | null;
  stock: number | null;
  estado: string;
  condicion: string;
  destacado: boolean;
  activo: boolean;
}

const VACIO: FormProducto = {
  nombre: '', slug: '', marca_id: null, categoria_id: null, resumen: '', descripcion: '', etiquetas: [],
  precio: null, costo: null, costo_extra: 0, descuento: 0, stock: 1, estado: 'disponible', condicion: 'nuevo', destacado: false, activo: true,
};

@Component({
  selector: 'app-producto-form',
  imports: [FormsModule, RouterLink, Icono, SolesPipe, EditorTexto],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './producto-form.html',
})
export class ProductoForm {
  private api = inject(AdminApi);
  private router = inject(Router);

  id = input<string>();
  catalogos = toSignal(this.api.catalogos());
  parametros = toSignal(this.api.parametros());
  form: FormProducto = { ...VACIO };
  imagenes = signal<Imagen[]>([]);
  cargando = signal(false);
  guardando = signal(false);
  subiendo = signal(0);
  arrastrando = signal(false);
  mensaje = signal('');
  error = signal('');
  slugPublico = signal('');
  private arrastrada: number | null = null;

  constructor() {
    effect(() => {
      const id = Number(this.id());
      if (!id) return;
      this.cargando.set(true);
      this.api.producto(id).subscribe({
        next: p => {
          this.form = {
            nombre: p.nombre, slug: p.slug ?? '', marca_id: p.marca_id, categoria_id: p.categoria_id,
            resumen: p.resumen_propio ?? '', descripcion: p.descripcion ?? '', etiquetas: p.etiquetas ?? [], precio: p.precio, costo: p.costo, costo_extra: p.costo_extra,
            descuento: p.descuento, stock: p.stock, estado: p.estado, condicion: p.condicion,
            destacado: p.destacado, activo: p.activo,
          };
          this.slugPublico.set(p.slug);
          this.imagenes.set(p.imagenes ?? []);
          this.cargando.set(false);
        },
        error: e => {
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
    });
  }

  precioFinal(): number {
    const precio = Number(this.form.precio) || 0;
    const descuento = Math.min(99, Number(this.form.descuento) || 0);
    return Math.round(precio * (100 - descuento)) / 100;
  }

  /** Mismo cálculo que fastore-api (App\Support\Costos), para verlo mientras se escribe. */
  analisis() {
    const p = this.parametros()?.valores;
    const costo = this.form.costo;
    if (!p || costo === null || costo === undefined || (costo as unknown) === '') return null;
    const unitario = Number(costo) * (1 + (p.costo_flete_pct + p.costo_aduana_pct) / 100) + p.costo_empaque + (Number(this.form.costo_extra) || 0);
    const divisor = 1 - (p.margen_objetivo_pct + p.comision_pct) / 100;
    const precio = this.precioFinal();
    const ganancia = precio * (1 - p.comision_pct / 100) - unitario;
    return {
      unitario: Math.round(unitario * 100) / 100,
      sugerido: divisor > 0 ? Math.ceil((unitario / divisor) * 10) / 10 : null,
      ganancia: Math.round(ganancia * 100) / 100,
      margen: precio > 0 ? Math.round((ganancia * 1000) / precio) / 10 : null,
      objetivo: p.margen_objetivo_pct,
    };
  }

  usarSugerido(): void {
    const a = this.analisis();
    if (a?.sugerido) {
      this.form.precio = a.sugerido;
      this.form.descuento = 0;
    }
  }

  etiqueta = '';

  /** Sube una imagen insertada en la descripción (solo con el producto ya guardado). */
  subirImagen = (archivo: File) => firstValueFrom(this.api.imagenDescripcion(Number(this.id()), archivo)).then(r => r.url);

  /** Agrega etiquetas al presionar Enter o coma; acepta varias separadas por comas. */
  agregarEtiqueta(evento?: Event): void {
    evento?.preventDefault();
    const nuevas = this.etiqueta.split(',').map(e => e.trim().toLowerCase()).filter(e => e && e.length <= 40);
    this.form.etiquetas = [...new Set([...this.form.etiquetas, ...nuevas])].slice(0, 20);
    this.etiqueta = '';
  }

  quitarEtiqueta(e: string): void {
    this.form.etiquetas = this.form.etiquetas.filter(x => x !== e);
  }

  guardar(): void {
    if (this.etiqueta.trim()) this.agregarEtiqueta();
    this.error.set('');
    this.mensaje.set('');
    this.guardando.set(true);
    const id = Number(this.id());
    const peticion = id ? this.api.guardarProducto(id, this.form) : this.api.crearProducto(this.form);
    peticion.subscribe({
      next: p => {
        this.guardando.set(false);
        this.slugPublico.set(p.slug);
        this.form.slug = p.slug;
        if (!id) {
          // Recién creado: se pasa a modo edición para poder subir fotos.
          this.router.navigate(['/admin/productos', p.id], { replaceUrl: true, state: { creado: true } });
          this.mensaje.set('Producto creado. Ahora agrega sus fotos.');
        } else {
          this.mensaje.set('Cambios guardados.');
        }
      },
      error: e => {
        this.guardando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }

  eliminar(): void {
    const id = Number(this.id());
    if (!id || !confirm(`¿Eliminar "${this.form.nombre}" y sus fotos? Esta acción no se puede deshacer.\n\nSi solo quieres ocultarlo, desmarca "Visible en la tienda".`)) return;
    this.api.eliminarProducto(id).subscribe({
      next: () => this.router.navigate(['/admin/productos']),
      error: e => this.error.set(mensajeError(e)),
    });
  }

  elegir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.subir(Array.from(input.files ?? []));
    input.value = '';
  }

  soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    this.subir(Array.from(evento.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/')));
  }

  quitarImagen(img: Imagen): void {
    if (!confirm('¿Quitar esta foto?')) return;
    this.api.eliminarImagen(Number(this.id()), img.id).subscribe({
      next: lista => this.imagenes.set(lista),
      error: e => this.error.set(mensajeError(e)),
    });
  }

  /** Mueve una foto una posición (la primera es la portada). */
  mover(indice: number, paso: number): void {
    const lista = [...this.imagenes()];
    const destino = indice + paso;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    this.ordenar(lista);
  }

  portada(indice: number): void {
    const lista = [...this.imagenes()];
    lista.unshift(...lista.splice(indice, 1));
    this.ordenar(lista);
  }

  inicioArrastre(indice: number): void {
    this.arrastrada = indice;
  }

  soltarEn(indice: number, evento: DragEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (this.arrastrada === null || this.arrastrada === indice) return;
    const lista = [...this.imagenes()];
    const [movida] = lista.splice(this.arrastrada, 1);
    lista.splice(indice, 0, movida);
    this.arrastrada = null;
    this.ordenar(lista);
  }

  private ordenar(lista: Imagen[]): void {
    this.imagenes.set(lista);
    this.api.ordenarImagenes(Number(this.id()), lista.map(i => i.id)).subscribe({
      next: r => this.imagenes.set(r),
      error: e => this.error.set(mensajeError(e)),
    });
  }

  private subir(archivos: File[]): void {
    const id = Number(this.id());
    if (!archivos.length || !id) return;
    const grandes = archivos.filter(a => a.size > 8 * 1024 * 1024);
    if (grandes.length) {
      this.error.set(`Estas fotos pesan más de 8 MB: ${grandes.map(a => a.name).join(', ')}`);
      return;
    }
    this.error.set('');
    this.subiendo.set(archivos.length);
    this.api.subirImagenes(id, archivos).subscribe({
      next: lista => {
        this.imagenes.set(lista);
        this.subiendo.set(0);
      },
      error: e => {
        this.subiendo.set(0);
        this.error.set(mensajeError(e, 'No se pudieron subir las fotos.'));
      },
    });
  }
}
