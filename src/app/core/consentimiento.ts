import { Injectable, signal } from '@angular/core';

export interface Preferencias {
  /** Siempre activas: carrito, sesión del admin, tema y esta misma elección. */
  necesarias: true;
  /** Google Analytics (medición de visitas). */
  analiticas: boolean;
  fecha: string;
  version: number;
}

const CLAVE = 'fastore_consentimiento';
/** Subir la versión vuelve a pedir el consentimiento (por ejemplo, al agregar un nuevo tipo de cookie). */
const VERSION = 1;

declare global {
  interface Window {
    fastoreCargarAnaliticas?: () => void;
  }
}

/**
 * Consentimiento de cookies (Ley 29733 de Perú, RGPD y directiva ePrivacy): nada opcional se carga
 * hasta que la persona lo acepte, y puede cambiar su elección cuando quiera desde el pie de página.
 */
@Injectable({ providedIn: 'root' })
export class ConsentimientoService {
  readonly preferencias = signal<Preferencias | null>(this.leer());
  /** Banner visible: primera visita o versión de la política cambiada. */
  readonly pendiente = signal(this.preferencias() === null);
  readonly configurando = signal(false);

  aceptarTodo(): void {
    this.guardar(true);
  }

  soloNecesarias(): void {
    this.guardar(false);
  }

  guardar(analiticas: boolean): void {
    const anterior = this.preferencias();
    const preferencias: Preferencias = { necesarias: true, analiticas, fecha: new Date().toISOString(), version: VERSION };
    try {
      localStorage.setItem(CLAVE, JSON.stringify(preferencias));
    } catch {
      /* sin almacenamiento: la elección dura esta visita */
    }
    this.preferencias.set(preferencias);
    this.pendiente.set(false);
    this.configurando.set(false);

    if (analiticas) {
      window.fastoreCargarAnaliticas?.();
    } else if (anterior?.analiticas) {
      // Retiró el consentimiento: se borran las cookies de Google Analytics y se recarga sin ellas.
      for (const c of document.cookie.split(';').map(x => x.split('=')[0].trim()).filter(n => n.startsWith('_ga'))) {
        document.cookie = `${c}=; Max-Age=0; path=/; domain=${location.hostname.replace(/^www\./, '.')}`;
        document.cookie = `${c}=; Max-Age=0; path=/`;
      }
      location.reload();
    }
  }

  abrirConfiguracion(): void {
    this.configurando.set(true);
    this.pendiente.set(true);
  }

  private leer(): Preferencias | null {
    try {
      const p = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Preferencias | null;
      return p && p.version === VERSION ? p : null;
    } catch {
      return null;
    }
  }
}
