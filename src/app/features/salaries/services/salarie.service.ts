import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateSalarieRequest, Salarie } from '../models/salarie.model';

@Injectable({ providedIn: 'root' })
export class SalarieService {

    private readonly baseUrl = `${environment.apiUrl}/salaries`;

    constructor(private http: HttpClient) { }

    // chantierId optionnel : filtre au contexte "Entreprise + Chantier" (règle validée) —
    // sans lui, entrepriseId seul renvoie tous les salariés de l'entreprise, tous chantiers
    // confondus (comportement historique, toujours utilisé là où aucun chantier n'est en
    // contexte : tableau de bord, formulaires de rapport...).
    lister(entrepriseId?: string, chantierId?: string): Observable<Salarie[]> {
        const params: Record<string, string> = {};
        if (entrepriseId) {
            params['entrepriseId'] = entrepriseId;
        }
        if (chantierId) {
            params['chantierId'] = chantierId;
        }
        return this.http.get<Salarie[]>(this.baseUrl, { params });
    }

    obtenir(id: string): Observable<Salarie> {
        return this.http.get<Salarie>(`${this.baseUrl}/${id}`);
    }

    creer(request: CreateSalarieRequest): Observable<Salarie> {
        return this.http.post<Salarie>(this.baseUrl, request);
    }

    modifier(id: string, request: CreateSalarieRequest): Observable<Salarie> {
        return this.http.put<Salarie>(`${this.baseUrl}/${id}`, request);
    }

    activer(id: string): Observable<Salarie> {
        return this.http.post<Salarie>(`${this.baseUrl}/${id}/activer`, {});
    }

    desactiver(id: string): Observable<Salarie> {
        return this.http.post<Salarie>(`${this.baseUrl}/${id}/desactiver`, {});
    }

    supprimer(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
