import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateRegleAutomatisationRequest, RegleAutomatisation } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class RegleAutomatisationService {

    private readonly baseUrl = `${environment.apiUrl}/regles-automatisation`;

    constructor(private http: HttpClient) { }

    creer(request: CreateRegleAutomatisationRequest): Observable<RegleAutomatisation> {
        return this.http.post<RegleAutomatisation>(this.baseUrl, request);
    }

    modifier(id: string, request: CreateRegleAutomatisationRequest): Observable<RegleAutomatisation> {
        return this.http.put<RegleAutomatisation>(`${this.baseUrl}/${id}`, request);
    }

    lister(): Observable<RegleAutomatisation[]> {
        return this.http.get<RegleAutomatisation[]>(this.baseUrl);
    }

    obtenir(id: string): Observable<RegleAutomatisation> {
        return this.http.get<RegleAutomatisation>(`${this.baseUrl}/${id}`);
    }

    activer(id: string): Observable<RegleAutomatisation> {
        return this.http.patch<RegleAutomatisation>(`${this.baseUrl}/${id}/activer`, {});
    }

    desactiver(id: string): Observable<RegleAutomatisation> {
        return this.http.patch<RegleAutomatisation>(`${this.baseUrl}/${id}/desactiver`, {});
    }

    supprimer(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    envoyerMaintenant(id: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/envoyer-maintenant`, {});
    }
}
