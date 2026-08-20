import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AffectationSalarieChantier, AffecterSalarieRequest, MajSuiviAffectationRequest } from '../models/salarie.model';

@Injectable({ providedIn: 'root' })
export class AffectationSalarieChantierService {

    constructor(private http: HttpClient) { }

    lister(chantierId: string): Observable<AffectationSalarieChantier[]> {
        return this.http.get<AffectationSalarieChantier[]>(`${environment.apiUrl}/chantiers/${chantierId}/salaries`);
    }

    listerParSalarie(salarieId: string): Observable<AffectationSalarieChantier[]> {
        return this.http.get<AffectationSalarieChantier[]>(`${environment.apiUrl}/salaries/${salarieId}/chantiers`);
    }

    // Liste transverse, tous chantiers confondus — une ligne par affectation (SUPER_ADMIN uniquement).
    listerToutes(): Observable<AffectationSalarieChantier[]> {
        return this.http.get<AffectationSalarieChantier[]>(`${environment.apiUrl}/salaries/affectations`);
    }

    affecter(chantierId: string, request: AffecterSalarieRequest): Observable<AffectationSalarieChantier> {
        return this.http.post<AffectationSalarieChantier>(`${environment.apiUrl}/chantiers/${chantierId}/salaries`, request);
    }

    accorderAcces(chantierId: string, affectationId: string): Observable<AffectationSalarieChantier> {
        return this.http.post<AffectationSalarieChantier>(
            `${environment.apiUrl}/chantiers/${chantierId}/salaries/${affectationId}/accorder-acces`, {});
    }

    refuserAcces(chantierId: string, affectationId: string): Observable<AffectationSalarieChantier> {
        return this.http.post<AffectationSalarieChantier>(
            `${environment.apiUrl}/chantiers/${chantierId}/salaries/${affectationId}/refuser-acces`, {});
    }

    majSuivi(chantierId: string, affectationId: string, request: MajSuiviAffectationRequest): Observable<AffectationSalarieChantier> {
        return this.http.post<AffectationSalarieChantier>(
            `${environment.apiUrl}/chantiers/${chantierId}/salaries/${affectationId}/maj-suivi`, request);
    }

    // N'existait pas côté frontend jusqu'ici — l'endpoint backend (.../desactiver) était
    // inatteignable depuis l'écran, seule la suppression complète était possible.
    desactiver(chantierId: string, affectationId: string): Observable<AffectationSalarieChantier> {
        return this.http.post<AffectationSalarieChantier>(
            `${environment.apiUrl}/chantiers/${chantierId}/salaries/${affectationId}/desactiver`, {});
    }

    reactiver(chantierId: string, affectationId: string): Observable<AffectationSalarieChantier> {
        return this.http.post<AffectationSalarieChantier>(
            `${environment.apiUrl}/chantiers/${chantierId}/salaries/${affectationId}/reactiver`, {});
    }
}
