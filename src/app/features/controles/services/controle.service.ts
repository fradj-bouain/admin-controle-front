import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
    AjouterControleSalarieRequest, Controle, ControleSalarie, CreateControleRequest, CreateRapportRequest,
    ModifierControleRequest, ModifierControleSalarieRequest, ModifierRapportRequest, RapportControle
} from '../models/controle.model';

@Injectable({ providedIn: 'root' })
export class ControleService {

    private readonly baseUrl = `${environment.apiUrl}/controles`;

    constructor(private http: HttpClient) { }

    lister(chantierId?: string): Observable<Controle[]> {
        const params: Record<string, string> = {};
        if (chantierId) {
            params['chantierId'] = chantierId;
        }
        return this.http.get<Controle[]>(this.baseUrl, { params });
    }

    obtenir(id: string): Observable<Controle> {
        return this.http.get<Controle>(`${this.baseUrl}/${id}`);
    }

    creer(request: CreateControleRequest): Observable<Controle> {
        return this.http.post<Controle>(this.baseUrl, request);
    }

    modifier(id: string, request: ModifierControleRequest): Observable<Controle> {
        return this.http.put<Controle>(`${this.baseUrl}/${id}`, request);
    }

    supprimer(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    ajouterSalarie(controleId: string, request: AjouterControleSalarieRequest): Observable<ControleSalarie> {
        return this.http.post<ControleSalarie>(`${this.baseUrl}/${controleId}/salaries`, request);
    }

    listerSalaries(controleId: string): Observable<ControleSalarie[]> {
        return this.http.get<ControleSalarie[]>(`${this.baseUrl}/${controleId}/salaries`);
    }

    modifierSalarie(controleId: string, entreeId: string, request: ModifierControleSalarieRequest): Observable<ControleSalarie> {
        return this.http.put<ControleSalarie>(`${this.baseUrl}/${controleId}/salaries/${entreeId}`, request);
    }

    supprimerSalarie(controleId: string, entreeId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${controleId}/salaries/${entreeId}`);
    }

    genererRapport(request: CreateRapportRequest): Observable<RapportControle> {
        return this.http.post<RapportControle>(`${this.baseUrl}/rapports`, request);
    }

    listerRapports(chantierId?: string): Observable<RapportControle[]> {
        const params: Record<string, string> = {};
        if (chantierId) {
            params['chantierId'] = chantierId;
        }
        return this.http.get<RapportControle[]>(`${this.baseUrl}/rapports`, { params });
    }

    obtenirRapport(id: string): Observable<RapportControle> {
        return this.http.get<RapportControle>(`${this.baseUrl}/rapports/${id}`);
    }

    modifierRapport(id: string, request: ModifierRapportRequest): Observable<RapportControle> {
        return this.http.put<RapportControle>(`${this.baseUrl}/rapports/${id}`, request);
    }

    supprimerRapport(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/rapports/${id}`);
    }

    envoyerRapport(id: string): Observable<RapportControle> {
        return this.http.post<RapportControle>(`${this.baseUrl}/rapports/${id}/envoyer`, {});
    }

    renvoyerRapportParEmail(id: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/rapports/${id}/renvoyer-email`, {});
    }
}
