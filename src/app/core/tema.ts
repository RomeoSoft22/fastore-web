import { Injectable, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro' | 'sistema';

const CLAVE = 'fastore_tema';

/**
 * Tema Luz, Oscuro o Sistema. Se guarda en el navegador y se aplica con data-tema en <html>
 * (js/inicio.js lo aplica antes de que cargue Angular, para evitar el parpadeo).
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly opciones: { valor: Tema; texto: string; icono: string }[] = [
    { valor: 'claro', texto: 'Luz', icono: 'sol' },
    { valor: 'oscuro', texto: 'Oscuro', icono: 'luna' },
    { valor: 'sistema', texto: 'Sistema', icono: 'monitor' },
  ];
  readonly tema = signal<Tema>(this.leer());

  elegir(tema: Tema): void {
    this.tema.set(tema);
    document.documentElement.setAttribute('data-tema', tema);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(tema));
    } catch {
      /* sin almacenamiento: dura esta visita */
    }
  }

  icono(): string {
    return this.opciones.find(o => o.valor === this.tema())?.icono ?? 'monitor';
  }

  private leer(): Tema {
    try {
      const t = JSON.parse(localStorage.getItem(CLAVE) ?? '"sistema"');
      return ['claro', 'oscuro', 'sistema'].includes(t) ? t : 'sistema';
    } catch {
      return 'sistema';
    }
  }
}
