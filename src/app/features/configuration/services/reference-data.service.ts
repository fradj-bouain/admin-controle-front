import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
    ControleTiers, CorpsDeMetier, CreateControleTiersRequest, CreateCorpsDeMetierRequest,
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

    listerCorpsDeMetier(): Observable<CorpsDeMetier[]> {
        return this.http.get<CorpsDeMetier[]>(`${this.baseUrl}/corps-de-metier`);
    }

    creerCorpsDeMetier(request: CreateCorpsDeMetierRequest): Observable<CorpsDeMetier> {
        return this.http.post<CorpsDeMetier>(`${this.baseUrl}/corps-de-metier`, request);
    }

    listerTypeSalarie(): Observable<TypeSalarie[]> {
        return this.http.get<TypeSalarie[]>(`${this.baseUrl}/types-salarie`);
    }

    creerTypeSalarie(request: CreateTypeSalarieRequest): Observable<TypeSalarie> {
        return this.http.post<TypeSalarie>(`${this.baseUrl}/types-salarie`, request);
    }

    listerTypeContratSalarie(): Observable<TypeContratSalarie[]> {
        return this.http.get<TypeContratSalarie[]>(`${this.baseUrl}/types-contrat-salarie`);
    }

    creerTypeContratSalarie(request: CreateTypeContratSalarieRequest): Observable<TypeContratSalarie> {
        return this.http.post<TypeContratSalarie>(`${this.baseUrl}/types-contrat-salarie`, request);
    }

    listerSalarieFonction(): Observable<SalarieFonction[]> {
        return this.http.get<SalarieFonction[]>(`${this.baseUrl}/salarie-fonctions`);
    }

    creerSalarieFonction(request: CreateSalarieFonctionRequest): Observable<SalarieFonction> {
        return this.http.post<SalarieFonction>(`${this.baseUrl}/salarie-fonctions`, request);
    }

    listerControleTiers(): Observable<ControleTiers[]> {
        return this.http.get<ControleTiers[]>(`${this.baseUrl}/controle-tiers`);
    }

    creerControleTiers(request: CreateControleTiersRequest): Observable<ControleTiers> {
        return this.http.post<ControleTiers>(`${this.baseUrl}/controle-tiers`, request);
    }
}
