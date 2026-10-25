import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Banner } from '../core/modelos';
import { Icono } from '../shared/icono';
import { mensajeError } from '../shared/util';
import { AdminApi } from './admin-api';

interface FormBanner {
  id: number | null;
  titulo: string;
  subtitulo: string;
  boton: string;
  enlace: string;
  tema: 'claro' | 'oscuro';
  activo: boolean;
  inicio: string;
  fin: string;
  imagen: File | null;
  imagen_movil: File | null;
  vista: string | null;
  vista_movil: string | null;
  quitar_movil: boolean;
}

@Component({
  selector: 'app-banners',
  imports: [FormsModule, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './banners.html',
})
export class BannersPagina {
  private api = inject(AdminApi);
  banners = signal<Banner[]>([]);
  form = signal<FormBanner | null>(null);
  guardando = signal(false);
  error = signal('');

  constructor() {
    this.api.banners().subscribe(b => this.banners.set(b));
  }

  nuevo(): void {
    this.form.set({
      id: null, titulo: '', subtitulo: '', boton: 'Ver más', enlace: '/tienda', tema: 'claro', activo: true,
      inicio: '', fin: '', imagen: null, imagen_movil: null, vista: null, vista_movil: null, quitar_movil: false,
    });
  }

  editar(b: Banner): void {
    this.form.set({
      id: b.id, titulo: b.titulo, subtitulo: b.subtitulo ?? '', boton: b.boton ?? '', enlace: b.enlace ?? '',
      tema: b.tema, activo: b.activo ?? true, inicio: b.inicio ?? '', fin: b.fin ?? '',
      imagen: null, imagen_movil: null, vista: b.imagen, vista_movil: b.imagen_movil, quitar_movil: false,
    });
  }

  archivo(evento: Event, campo: 'imagen' | 'imagen_movil'): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const f = this.form();
    if (!f || !archivo) return;
    const vista = URL.createObjectURL(archivo);
    this.form.set(campo === 'imagen' ? { ...f, imagen: archivo, vista } : { ...f, imagen_movil: archivo, vista_movil: vista, quitar_movil: false });
  }

  quitarMovil(): void {
    const f = this.form();
    if (f) this.form.set({ ...f, imagen_movil: null, vista_movil: null, quitar_movil: true });
  }

  guardar(): void {
    const f = this.form();
    if (!f) return;
    if (!f.id && !f.imagen) {
      this.error.set('Elige la imagen del banner.');
      return;
    }
    const body = new FormData();
    for (const campo of ['titulo', 'subtitulo', 'boton', 'enlace', 'tema', 'inicio', 'fin'] as const) body.append(campo, f[campo] ?? '');
    body.append('activo', f.activo ? '1' : '0');
    if (f.imagen) body.append('imagen', f.imagen);
    if (f.imagen_movil) body.append('imagen_movil', f.imagen_movil);
    if (f.quitar_movil) body.append('quitar_movil', '1');

    this.error.set('');
    this.guardando.set(true);
    this.api.guardarBanner(f.id, body).subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.set(null);
        this.api.banners().subscribe(b => this.banners.set(b));
      },
      error: e => {
        this.guardando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }

  alternar(b: Banner): void {
    const body = new FormData();
    for (const [campo, valor] of Object.entries({ titulo: b.titulo, subtitulo: b.subtitulo, boton: b.boton, enlace: b.enlace, tema: b.tema, inicio: b.inicio, fin: b.fin })) {
      body.append(campo, valor ?? '');
    }
    body.append('activo', b.activo ? '0' : '1');
    this.api.guardarBanner(b.id, body).subscribe({
      next: nuevo => this.banners.update(lista => lista.map(x => (x.id === b.id ? nuevo : x))),
      error: e => this.error.set(mensajeError(e)),
    });
  }

  mover(indice: number, paso: number): void {
    const lista = [...this.banners()];
    const destino = indice + paso;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    this.banners.set(lista);
    this.api.ordenarBanners(lista.map(b => b.id)).subscribe(b => this.banners.set(b));
  }

  eliminar(b: Banner): void {
    if (!confirm(`¿Eliminar el banner "${b.titulo}"?`)) return;
    this.api.eliminarBanner(b.id).subscribe({
      next: () => this.banners.update(lista => lista.filter(x => x.id !== b.id)),
      error: e => this.error.set(mensajeError(e)),
    });
  }
}
