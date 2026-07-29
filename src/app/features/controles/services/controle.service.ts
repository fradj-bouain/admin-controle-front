import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Controle, CreateControleRequest, CreateRapportRequest, RapportControle } from '../models/controle.model';

@Injectable({ providedIn: 'root' })
export class ControleService {

    private readonly baseUrl = `${environment.apiUrl}/controles`;

    constructor(private http: HttpClient) { }

    lister(chantierId: string): Observable<Controle[]> {
        return this.http.get<Controle[]>(this.baseUrl, { params: { chantierId } });
    }

    creer(request: CreateControleRequest): Observable<Controle> {
        return this.http.post<Controle>(this.baseUrl, request);
    }

    genererRapport(request: CreateRapportRequest): Observable<RapportControle> {
        return this.http.post<RapportControle>(`${this.baseUrl}/rapports`, request);
    }

    listerRapports(): Observable<RapportControle[]> {
        return this.http.get<RapportControle[]>(`${this.baseUrl}/rapports`);
    }

    envoyerRapport(id: string): Observable<RapportControle> {
        return this.http.post<RapportControle>(`${this.baseUrl}/rapports/${id}/envoyer`, {});
    }
}
