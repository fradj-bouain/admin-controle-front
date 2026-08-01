import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
    ActionCorrective, ControleTiers, CorpsDeMetier, CreateActionCorrectiveRequest, CreateControleTiersRequest, CreateCorpsDeMetierRequest,
    CreatePaysRequest, CreateSalarieFonctionRequest, CreateTypeContratSalarieRequest,
    CreateTypeSalarieRequest, Pays, SalarieFonction, TypeContratSalarie, TypeSalarie
} from '../models/configuration.model';

@Injectable({ providedIn: 'root' })
export class ReferenceDataService {

    private readonly baseUrl = `${environment.apiUrl}/configuration`;

    constructor(private http: HttpClient) { }

    listerPays(): Observable<Pays[]> {
        return this.http.get<Pays[]>(`${this.baseUrl}/pays`);
    }

    creerPays(request: CreatePaysRequest): Observable<Pays> {
        return this.http.post<Pays>(`${this.baseUrl}/pays`, request);
    }

    modifierPays(id: string, request: CreatePaysRequest): Observable<Pays> {
        return this.http.put<Pays>(`${this.baseUrl}/pays/${id}`, request);
    }

    supprimerPays(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/pays/${id}`);
    }

    listerCorpsDeMetier(): Observable<CorpsDeMetier[]> {
        return this.http.get<CorpsDeMetier[]>(`${this.baseUrl}/corps-de-metier`);
    }

    creerCorpsDeMetier(request: CreateCorpsDeMetierRequest): Observable<CorpsDeMetier> {
        return this.http.post<CorpsDeMetier>(`${this.baseUrl}/corps-de-metier`, request);
    }

    modifierCorpsDeMetier(id: string, request: CreateCorpsDeMetierRequest): Observable<CorpsDeMetier> {
        return this.http.put<CorpsDeMetier>(`${this.baseUrl}/corps-de-metier/${id}`, request);
    }

    supprimerCorpsDeMetier(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/corps-de-metier/${id}`);
    }

    listerTypeSalarie(): Observable<TypeSalarie[]> {
        return this.http.get<TypeSalarie[]>(`${this.baseUrl}/types-salarie`);
    }

    creerTypeSalarie(request: CreateTypeSalarieRequest): Observable<TypeSalarie> {
        return this.http.post<TypeSalarie>(`${this.baseUrl}/types-salarie`, request);
    }

    modifierTypeSalarie(id: string, request: CreateTypeSalarieRequest): Observable<TypeSalarie> {
        return this.http.put<TypeSalarie>(`${this.baseUrl}/types-salarie/${id}`, request);
    }

    supprimerTypeSalarie(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/types-salarie/${id}`);
    }

    listerTypeContratSalarie(): Observable<TypeContratSalarie[]> {
        return this.http.get<TypeContratSalarie[]>(`${this.baseUrl}/types-contrat-salarie`);
    }

    creerTypeContratSalarie(request: CreateTypeContratSalarieRequest): Observable<TypeContratSalarie> {
        return this.http.post<TypeContratSalarie>(`${this.baseUrl}/types-contrat-salarie`, request);
    }

    modifierTypeContratSalarie(id: string, request: CreateTypeContratSalarieRequest): Observable<TypeContratSalarie> {
        return this.http.put<TypeContratSalarie>(`${this.baseUrl}/types-contrat-salarie/${id}`, request);
    }

    supprimerTypeContratSalarie(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/types-contrat-salarie/${id}`);
    }

    listerSalarieFonction(): Observable<SalarieFonction[]> {
        return this.http.get<SalarieFonction[]>(`${this.baseUrl}/salarie-fonctions`);
    }

    creerSalarieFonction(request: CreateSalarieFonctionRequest): Observable<SalarieFonction> {
        return this.http.post<SalarieFonction>(`${this.baseUrl}/salarie-fonctions`, request);
    }

    modifierSalarieFonction(id: string, request: CreateSalarieFonctionRequest): Observable<SalarieFonction> {
        return this.http.put<SalarieFonction>(`${this.baseUrl}/salarie-fonctions/${id}`, request);
    }

    supprimerSalarieFonction(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/salarie-fonctions/${id}`);
    }

    listerControleTiers(): Observable<ControleTiers[]> {
        return this.http.get<ControleTiers[]>(`${this.baseUrl}/controle-tiers`);
    }

    creerControleTiers(request: CreateControleTiersRequest): Observable<ControleTiers> {
        return this.http.post<ControleTiers>(`${this.baseUrl}/controle-tiers`, request);
    }

    modifierControleTiers(id: string, request: CreateControleTiersRequest): Observable<ControleTiers> {
        return this.http.put<ControleTiers>(`${this.baseUrl}/controle-tiers/${id}`, request);
    }

    supprimerControleTiers(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/controle-tiers/${id}`);
    }

    listerActionsCorrectives(): Observable<ActionCorrective[]> {
        return this.http.get<ActionCorrective[]>(`${this.baseUrl}/actions-correctives`);
    }

    creerActionCorrective(request: CreateActionCorrectiveRequest): Observable<ActionCorrective> {
        return this.http.post<ActionCorrective>(`${this.baseUrl}/actions-correctives`, request);
    }

    modifierActionCorrective(id: string, request: CreateActionCorrectiveRequest): Observable<ActionCorrective> {
        return this.http.put<ActionCorrective>(`${this.baseUrl}/actions-correctives/${id}`, request);
    }

    supprimerActionCorrective(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/actions-correctives/${id}`);
    }
}
