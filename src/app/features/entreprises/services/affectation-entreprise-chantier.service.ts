import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AffectationEntrepriseChantier, AffecterEntrepriseRequest } from '../models/entreprise.model';

@Injectable({ providedIn: 'root' })
export class AffectationEntrepriseChantierService {

    constructor(private http: HttpClient) { }

    lister(chantierId: string): Observable<AffectationEntrepriseChantier[]> {
        return this.http.get<AffectationEntrepriseChantier[]>(
            `${environment.apiUrl}/chantiers/${chantierId}/entreprises`);
    }

    listerParEntreprise(entrepriseId: string): Observable<AffectationEntrepriseChantier[]> {
        return this.http.get<AffectationEntrepriseChantier[]>(
            `${environment.apiUrl}/entreprises/${entrepriseId}/chantiers`);
    }

    affecter(chantierId: string, request: AffecterEntrepriseRequest): Observable<AffectationEntrepriseChantier> {
        return this.http.post<AffectationEntrepriseChantier>(
            `${environment.apiUrl}/chantiers/${chantierId}/entreprises`, request);
    }

    desactiver(chantierId: string, affectationId: string): Observable<void> {
        return this.http.post<void>(
            `${environment.apiUrl}/chantiers/${chantierId}/entreprises/${affectationId}/desactiver`, {});
    }
}
