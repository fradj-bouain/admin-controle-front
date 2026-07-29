import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Entreprise, CreateEntrepriseRequest } from '../models/entreprise.model';

@Injectable({ providedIn: 'root' })
export class EntrepriseService {

    private readonly baseUrl = `${environment.apiUrl}/entreprises`;

    constructor(private http: HttpClient) { }

    lister(): Observable<Entreprise[]> {
        return this.http.get<Entreprise[]>(this.baseUrl);
    }

    obtenir(id: string): Observable<Entreprise> {
        return this.http.get<Entreprise>(`${this.baseUrl}/${id}`);
    }

    creer(request: CreateEntrepriseRequest): Observable<Entreprise> {
        return this.http.post<Entreprise>(this.baseUrl, request);
    }

    modifier(id: string, request: CreateEntrepriseRequest): Observable<Entreprise> {
        return this.http.put<Entreprise>(`${this.baseUrl}/${id}`, request);
    }

    activer(id: string): Observable<Entreprise> {
        return this.http.post<Entreprise>(`${this.baseUrl}/${id}/activer`, {});
    }

    desactiver(id: string): Observable<Entreprise> {
        return this.http.post<Entreprise>(`${this.baseUrl}/${id}/desactiver`, {});
    }
}
