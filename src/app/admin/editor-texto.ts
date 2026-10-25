import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { Icono } from '../shared/icono';

interface Boton {
  icono: string;
  titulo: string;
  accion: (e: Editor) => void;
  activo?: (e: Editor) => boolean;
}

/**
 * Editor de texto enriquecido (tipo Word) para la descripción del producto: negrita, cursiva,
 * subrayado, títulos, listas, cita, alineación, enlaces e imágenes. Entrega HTML; fastore-api lo
 * filtra antes de guardarlo.
 */
@Component({
  selector: 'app-editor-texto',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'editor-texto' },
  template: `
    <div class="editor-barra" role="toolbar" aria-label="Formato del texto">
      @for (grupo of grupos; track $index) {
        <span class="editor-grupo">
          @for (b of grupo; track b.titulo) {
            <button type="button" [title]="b.titulo" [attr.aria-label]="b.titulo" [class.activo]="version() >= 0 && editor && b.activo?.(editor)"
              [attr.aria-pressed]="editor && b.activo ? b.activo(editor) : null" (mousedown)="$event.preventDefault()" (click)="editor && b.accion(editor)">
              <app-icono [nombre]="b.icono" [tamano]="18" />
            </button>
          }
        </span>
      }
      <span class="editor-grupo">
        <button type="button" title="Enlace" aria-label="Insertar enlace" [class.activo]="version() >= 0 && editor?.isActive('link')"
          (mousedown)="$event.preventDefault()" (click)="enlace()"><app-icono nombre="enlace" [tamano]="18" /></button>
        <label class="editor-imagen" title="Insertar imagen" [class.deshabilitado]="!subirImagen()">
          <input type="file" accept="image/jpeg,image/png,image/webp" (change)="imagen($event)" [disabled]="!subirImagen() || subiendo()" aria-label="Insertar imagen" />
          <app-icono [nombre]="subiendo() ? 'reloj' : 'imagen'" [tamano]="18" />
        </label>
      </span>
    </div>
    <div class="editor-hoja" #hoja></div>
    @if (!subirImagen()) { <p class="tenue pequeno">Guarda el producto para poder insertar imágenes en la descripción.</p> }
    @if (error()) { <p class="error-texto pequeno">{{ error() }}</p> }
  `,
})
export class EditorTexto implements OnDestroy {
  contenido = input<string>('');
  placeholder = input('Describe el producto: características, medidas, qué incluye…');
  /** Sube una imagen y devuelve su URL pública. Sin ella, el botón de imagen queda deshabilitado. */
  subirImagen = input<((archivo: File) => Promise<string>) | null>(null);
  cambio = output<string>();

  private hoja = viewChild.required<ElementRef<HTMLElement>>('hoja');
  editor: Editor | null = null;
  /** Se incrementa en cada cambio para refrescar el estado de los botones. */
  version = signal(0);
  subiendo = signal(false);
  error = signal('');

  grupos: Boton[][] = [
    [
      { icono: 'deshacer', titulo: 'Deshacer (Ctrl+Z)', accion: e => e.chain().focus().undo().run() },
      { icono: 'rehacer', titulo: 'Rehacer (Ctrl+Y)', accion: e => e.chain().focus().redo().run() },
    ],
    [
      { icono: 'titulo', titulo: 'Título', accion: e => e.chain().focus().toggleHeading({ level: 2 }).run(), activo: e => e.isActive('heading', { level: 2 }) },
      { icono: 'negrita', titulo: 'Negrita (Ctrl+B)', accion: e => e.chain().focus().toggleBold().run(), activo: e => e.isActive('bold') },
      { icono: 'cursiva', titulo: 'Cursiva (Ctrl+I)', accion: e => e.chain().focus().toggleItalic().run(), activo: e => e.isActive('italic') },
      { icono: 'subrayado', titulo: 'Subrayado (Ctrl+U)', accion: e => e.chain().focus().toggleUnderline().run(), activo: e => e.isActive('underline') },
      { icono: 'tachado', titulo: 'Tachado', accion: e => e.chain().focus().toggleStrike().run(), activo: e => e.isActive('strike') },
    ],
    [
      { icono: 'lista', titulo: 'Viñetas', accion: e => e.chain().focus().toggleBulletList().run(), activo: e => e.isActive('bulletList') },
      { icono: 'lista-num', titulo: 'Lista numerada', accion: e => e.chain().focus().toggleOrderedList().run(), activo: e => e.isActive('orderedList') },
      { icono: 'cita', titulo: 'Cita', accion: e => e.chain().focus().toggleBlockquote().run(), activo: e => e.isActive('blockquote') },
      { icono: 'linea', titulo: 'Línea separadora', accion: e => e.chain().focus().setHorizontalRule().run() },
    ],
    [
      { icono: 'alinear-izq', titulo: 'Alinear a la izquierda', accion: e => e.chain().focus().setTextAlign('left').run(), activo: e => e.isActive({ textAlign: 'left' }) },
      { icono: 'alinear-centro', titulo: 'Centrar', accion: e => e.chain().focus().setTextAlign('center').run(), activo: e => e.isActive({ textAlign: 'center' }) },
      { icono: 'alinear-der', titulo: 'Alinear a la derecha', accion: e => e.chain().focus().setTextAlign('right').run(), activo: e => e.isActive({ textAlign: 'right' }) },
      { icono: 'limpiar', titulo: 'Quitar formato', accion: e => e.chain().focus().unsetAllMarks().clearNodes().run() },
    ],
  ];

  constructor() {
    afterNextRender(() => {
      this.editor = new Editor({
        element: this.hoja().nativeElement,
        content: this.contenido() || '',
        extensions: [
          StarterKit.configure({
            heading: { levels: [2, 3] },
            link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
          }),
          Image.configure({ inline: false }),
          TextAlign.configure({ types: ['heading', 'paragraph'] }),
          Placeholder.configure({ placeholder: this.placeholder() }),
        ],
        editorProps: { attributes: { class: 'editor-contenido', 'aria-label': 'Descripción del producto', role: 'textbox', 'aria-multiline': 'true' } },
        onUpdate: ({ editor }) => this.cambio.emit(editor.isEmpty ? '' : editor.getHTML()),
        onTransaction: () => this.version.update(v => v + 1),
      });
    });
  }

  enlace(): void {
    const e = this.editor;
    if (!e) return;
    const actual = e.getAttributes('link')['href'] ?? '';
    const url = prompt('Dirección del enlace (déjala vacía para quitarlo):', actual);
    if (url === null) return;
    if (!url.trim()) {
      e.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const href = /^(https?:\/\/|mailto:|tel:|\/)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    e.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }

  async imagen(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    const subir = this.subirImagen();
    if (!archivo || !subir || !this.editor) return;
    if (archivo.size > 8 * 1024 * 1024) {
      this.error.set('La imagen debe pesar como máximo 8 MB.');
      return;
    }
    this.error.set('');
    this.subiendo.set(true);
    try {
      const url = await subir(archivo);
      this.editor.chain().focus().setImage({ src: url, alt: archivo.name.replace(/\.[^.]+$/, '') }).run();
    } catch {
      this.error.set('No se pudo subir la imagen.');
    } finally {
      this.subiendo.set(false);
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }
}
