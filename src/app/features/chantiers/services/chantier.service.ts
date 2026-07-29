import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Chantier, CreateChantierRequest, DefinirControlesRequest } from '../models/chantier.model';

@Injectable({ providedIn: 'root' })
export class ChantierService {

    private readonly baseUrl = `${environment.apiUrl}/chantiers`;

    constructor(private http: HttpClient) { }

    lister(clientId?: string): Observable<Chantier[]> {
        const params: Record<string, string> = {};
        if (clientId) {
            params['clientId'] = clientId;
        }
        return this.http.get<Chantier[]>(this.baseUrl, { params });
    }

    obtenir(id: string): Observable<Chantier> {
        return this.http.get<Chantier>(`${this.baseUrl}/${id}`);
    }

    creer(request: CreateChantierRequest): Observable<Chantier> {
        return this.http.post<Chantier>(this.baseUrl, request);
    }

    modifier(id: string, request: CreateChantierRequest): Observable<Chantier> {
        return this.http.put<Chantier>(`${this.baseUrl}/${id}`, request);
    }

    definirControles(id: string, request: DefinirControlesRequest): Observable<Chantier> {
        return this.http.put<Chantier>(`${this.baseUrl}/${id}/controles`, request);
    }

    activer(id: string): Observable<Chantier> {
        return this.http.post<Chantier>(`${this.baseUrl}/${id}/activer`, {});
    }

    desactiver(id: string): Observable<Chantier> {
        return this.http.post<Chantier>(`${this.baseUrl}/${id}/desactiver`, {});
    }

    affecterChefChantier(id: string, utilisateurId: string): Observable<Chantier> {
        return this.http.put<Chantier>(`${this.baseUrl}/${id}/chef-chantier/${utilisateurId}`, {});
    }

    affecterSalarieResponsable(id: string, salarieId: string): Observable<Chantier> {
        return this.http.put<Chantier>(`${this.baseUrl}/${id}/salarie-responsable/${salarieId}`, {});
    }
}
