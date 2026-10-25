import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { inject } from '@angular/core';

// Trazos de 24×24 (estilo lineal). Las marcas (WhatsApp, Facebook) van rellenas.
const TRAZOS: Record<string, string> = {
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  carrito: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2.6l2.4 12.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 7H6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
  izquierda: '<path d="m15 18-6-6 6-6"/>',
  derecha: '<path d="m9 18 6-6-6-6"/>',
  abajo: '<path d="m6 9 6 6 6-6"/>',
  filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  camion: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
  escudo: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  etiqueta: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  imagen: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  subir: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  salir: '<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>',
  inicio: '<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>',
  caja: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
  capas: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  panel: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  compartir: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  telefono: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  arriba: '<path d="m18 15-6-6-6 6"/>',
  estrella: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  tren: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14M8 20l-2 2M16 20l2 2M8 16l-1 3h10l-1-3"/><circle cx="9" cy="13" r=".6"/><circle cx="15" cy="13" r=".6"/>',
  tarjeta: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  libro: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  documento: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
  negrita: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  cursiva: '<path d="M10 5h8M6 19h8M14 5l-4 14"/>',
  subrayado: '<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>',
  tachado: '<path d="M5 12h14M16 6.5A4 3.5 0 0 0 12 5c-2.5 0-4 1.3-4 3 0 1.2.8 2.2 2.3 2.8M8 17.5A4 3.5 0 0 0 12 19c2.5 0 4-1.3 4-3"/>',
  titulo: '<path d="M5 5v14M15 5v14M5 12h10M19 10l2-1v10"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  'lista-num': '<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1V9M3.5 15.5a1.5 1.5 0 0 1 3 0c0 1-3 2.5-3 3.5h3"/>',
  cita: '<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/>',
  'alinear-izq': '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  'alinear-centro': '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
  'alinear-der': '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  deshacer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  rehacer: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  limpiar: '<path d="M4 7h11M9.5 7 7 19M14 13l6 6M20 13l-6 6"/>',
  linea: '<path d="M3 12h18"/>',
  imprimir: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>',
};

const RELLENOS: Record<string, string> = {
  whatsapp:
    '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2m4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3"/>',
  facebook:
    '<path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.3A22 22 0 0 0 14.6 2C12.2 2 10.6 3.5 10.6 6.2v2.3H8v3.6h2.6V22H14v-9.9h2.7l.4-3.6z"/>',
};

@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'icono', '[attr.aria-hidden]': 'true' },
  template: `<svg [attr.width]="tamano()" [attr.height]="tamano()" viewBox="0 0 24 24" [innerHTML]="svg()"
    [attr.fill]="relleno() ? 'currentColor' : 'none'" [attr.stroke]="relleno() ? 'none' : 'currentColor'"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></svg>`,
})
export class Icono {
  private sanitizer = inject(DomSanitizer);
  nombre = input.required<string>();
  tamano = input(20);
  relleno = computed(() => this.nombre() in RELLENOS);
  svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(RELLENOS[this.nombre()] ?? TRAZOS[this.nombre()] ?? ''));
}
