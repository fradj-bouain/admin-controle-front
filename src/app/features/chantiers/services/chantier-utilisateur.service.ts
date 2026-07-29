import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ChantierUtilisateur } from '../models/chantier.model';

@Injectable({ providedIn: 'root' })
export class ChantierUtilisateurService {

    constructor(private http: HttpClient) { }

    lister(chantierId: string): Observable<ChantierUtilisateur[]> {
        return this.http.get<ChantierUtilisateur[]>(`${environment.apiUrl}/chantiers/${chantierId}/utilisateurs`);
    }

    accorder(chantierId: string, utilisateurId: string): Observable<ChantierUtilisateur> {
        return this.http.post<ChantierUtilisateur>(`${environment.apiUrl}/chantiers/${chantierId}/utilisateurs`, { utilisateurId });
    }

    revoquer(chantierId: string, utilisateurId: string): Observable<void> {
        return this.http.delete<void>(`${environment.apiUrl}/chantiers/${chantierId}/utilisateurs/${utilisateurId}`);
    }
}
