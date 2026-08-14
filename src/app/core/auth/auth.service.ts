import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

const TOKEN_STORAGE_KEY = 'admincontrol_access_token';

interface LoginResponse {
    accessToken: string;
    expiresIn: number;
}

interface JwtClaims {
    sub: string;
    username: string;
    roles: string[];
    entreprise_id?: string;
    client_id?: string;
    // Uniquement présent aux côtés de client_id (voir AuthenticationService) : profil
    // "accès total" vs "responsable de chantier" d'un compte Client.
    acces_tous_chantiers?: boolean;
    controle_tiers_id?: string;
    exp: number;
}

/**
 * Authentification JWT auto-hébergée : le backend émet et valide ses propres
 * tokens (voir AuthController/JwtConfig côté API), pas de redirection vers un
 * fournisseur d'identité externe.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

    private readonly tokenSubject = new BehaviorSubject<string | null>(this.readStoredToken());

    constructor(private http: HttpClient) { }

    login(username: string, password: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password }).pipe(
            tap((response) => {
                localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
                this.tokenSubject.next(response.accessToken);
            })
        );
    }

    logout(): void {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        this.tokenSubject.next(null);
    }

    getToken(): string | null {
        return this.tokenSubject.value;
    }

    isAuthenticated(): boolean {
        const claims = this.claims();
        return !!claims && claims.exp * 1000 > Date.now();
    }

    hasRole(role: string): boolean {
        return this.claims()?.roles?.includes(role) ?? false;
    }

    get username(): string {
        return this.claims()?.username ?? '';
    }

    get roles(): string[] {
        return this.claims()?.roles ?? [];
    }

    get userId(): string {
        return this.claims()?.sub ?? '';
    }

    get entrepriseId(): string | undefined {
        return this.claims()?.entreprise_id;
    }

    get clientId(): string | undefined {
        return this.claims()?.client_id;
    }

    /** Uniquement pertinent pour un compte Client — false pour tout le reste. */
    get accesTousChantiers(): boolean {
        return this.claims()?.acces_tous_chantiers ?? false;
    }

    get controleTiersId(): string | undefined {
        return this.claims()?.controle_tiers_id;
    }

    private claims(): JwtClaims | null {
        const token = this.tokenSubject.value;
        if (!token) {
            return null;
        }
        try {
            const payload = token.split('.')[1];
            const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(json) as JwtClaims;
        } catch {
            return null;
        }
    }

    private readStoredToken(): string | null {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
    }
}
