import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { API } from './api';

export interface Usuario {
  nombre: string | null;
  correo: string | null;
  roles: string[];
}

interface Sesion {
  access_token: string;
  expires_in: number;
  usuario: Usuario;
}

const LOGIN_KEY = 'fastore_login';

/**
 * Sesión de administración con identidad.juarezcampos.net (OAuth 2.0 Authorization Code + PKCE).
 * El access token (JWT) vive solo en memoria; el refresh token lo guarda fastore-api en una cookie HttpOnly.
 */
@Injectable({ providedIn: 'root' })
export class AccesoService {
  private http = inject(HttpClient);
  private renovacion?: ReturnType<typeof setTimeout>;
  private renovando$: Observable<boolean> | null = null;

  readonly token = signal<string | null>(null);
  readonly usuario = signal<Usuario | null>(null);

  private redirigiendo = false;

  /** Redirige a la pantalla de ingreso de identidad (una sola vez aunque lo pidan varias partes a la vez). */
  async ingresar(volverA = '/admin'): Promise<void> {
    if (this.redirigiendo) return;
    this.redirigiendo = true;
    const config = await firstValueFrom(
      this.http.get<{ authorize_endpoint: string; client_id: string; redirect_uri: string }>(`${API}/acceso/config`),
    );
    const state = aleatorio(32);
    const verifier = aleatorio(64);
    // Cada intento se guarda con su propio state: si hubo dos redirecciones seguidas, la que vuelva sigue siendo válida.
    sessionStorage.setItem(`${LOGIN_KEY}:${state}`, JSON.stringify({ state, verifier, volverA }));

    const params = new URLSearchParams({
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      response_type: 'code',
      scope: '',
      state,
      code_challenge: await sha256Base64Url(verifier),
      code_challenge_method: 'S256',
    });
    location.assign(`${config.authorize_endpoint}?${params}`);
  }

  /** Paso final del ingreso: valida el state y canjea el código. Devuelve la URL a la que volver. */
  completar(code: string, state: string): Observable<string> {
    const guardado = JSON.parse(sessionStorage.getItem(`${LOGIN_KEY}:${state}`) ?? 'null');
    // Se descartan todos los intentos pendientes: el state solo sirve una vez.
    Object.keys(sessionStorage).filter(k => k.startsWith(`${LOGIN_KEY}:`)).forEach(k => sessionStorage.removeItem(k));
    if (!guardado || guardado.state !== state) {
      return throwError(() => new Error('La respuesta de identidad no corresponde a este navegador. Vuelve a ingresar.'));
    }
    return this.http.post<Sesion>(`${API}/acceso/canjear`, { code, code_verifier: guardado.verifier }).pipe(
      tap(sesion => this.iniciar(sesion)),
      map(() => guardado.volverA || '/admin'),
    );
  }

  /** Pide un access token nuevo con la cookie de refresh. Varias peticiones a la vez comparten una sola llamada. */
  renovar(): Observable<boolean> {
    this.renovando$ ??= this.http.post<Sesion>(`${API}/acceso/renovar`, {}).pipe(
      tap(sesion => this.iniciar(sesion)),
      map(() => true),
      catchError(() => {
        this.limpiar();
        return of(false);
      }),
      finalize(() => (this.renovando$ = null)),
      shareReplay(1),
    );
    return this.renovando$;
  }

  asegurar(): Observable<boolean> {
    return this.token() ? of(true) : this.renovar();
  }

  /** Cierra la sesión aquí y en identidad (y con ello en todos los sistemas). */
  salir(): void {
    this.http.post<{ logout_url: string }>(`${API}/acceso/salir`, {}).subscribe({
      next: r => {
        this.limpiar();
        location.assign(r.logout_url);
      },
      error: () => {
        this.limpiar();
        location.assign('/');
      },
    });
  }

  private iniciar(sesion: Sesion): void {
    this.token.set(sesion.access_token);
    this.usuario.set(sesion.usuario);
    clearTimeout(this.renovacion);
    // Renueva un minuto antes de que venza el JWT (15 min por defecto).
    this.renovacion = setTimeout(() => this.renovar().subscribe(), Math.max(30, sesion.expires_in - 60) * 1000);
  }

  private limpiar(): void {
    clearTimeout(this.renovacion);
    this.token.set(null);
    this.usuario.set(null);
  }
}

/** Protege /admin: sin sesión (ni forma de renovarla) lleva al ingreso de identidad. */
export const accesoGuard: CanActivateFn = (_ruta, estado) => {
  const acceso = inject(AccesoService);
  return acceso.asegurar().pipe(
    map(ok => {
      if (!ok) acceso.ingresar(estado.url);
      return ok;
    }),
  );
};

const PUBLICAS = ['/acceso/config', '/acceso/canjear', '/acceso/renovar', '/acceso/salir'];

/** Agrega el JWT a las peticiones del admin y, ante un 401, intenta renovarlo una vez. */
export const accesoInterceptor: HttpInterceptorFn = (req, next) => {
  const acceso = inject(AccesoService);
  const privada = req.url.includes('/api/admin/') || req.url.endsWith('/acceso/yo');
  if (!privada || PUBLICAS.some(ruta => req.url.endsWith(ruta))) return next(req);

  const conToken = (r: HttpRequest<unknown>) => {
    const token = acceso.token();
    return token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;
  };

  return next(conToken(req)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);
      return acceso.renovar().pipe(
        switchMap(ok => {
          if (!ok) {
            acceso.ingresar(location.pathname);
            return throwError(() => error);
          }
          return next(conToken(req));
        }),
      );
    }),
  );
};

function aleatorio(bytes: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256Base64Url(texto: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
