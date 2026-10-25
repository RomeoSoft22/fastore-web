import { HttpErrorResponse } from '@angular/common/http';
import { Pipe, PipeTransform } from '@angular/core';

/** S/ 1,234.50 */
@Pipe({ name: 'soles' })
export class SolesPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return 'S/ ' + (valor ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

/** "hace 3 h", "hace 2 d" */
@Pipe({ name: 'hace' })
export class HacePipe implements PipeTransform {
  transform(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
    if (minutos < 1) return 'ahora';
    if (minutos < 60) return `hace ${minutos} min`;
    if (minutos < 1440) return `hace ${Math.round(minutos / 60)} h`;
    return `hace ${Math.round(minutos / 1440)} d`;
  }
}

/** Mensaje legible de un error del API (validación 422 o mensaje genérico con referencia). */
export function mensajeError(e: unknown, porDefecto = 'No se pudo completar la operación.'): string {
  if (e instanceof HttpErrorResponse) {
    const errores = e.error?.errors as Record<string, string[]> | undefined;
    if (errores) return Object.values(errores).flat().join(' ');
    if (e.status === 0) return 'No hay conexión con el servidor. Revisa tu internet.';
    return e.error?.message || porDefecto;
  }
  return (e as Error)?.message || porDefecto;
}

export const ESTADOS: Record<string, string> = { disponible: 'Disponible', a_pedido: 'A pedido', agotado: 'Agotado' };
