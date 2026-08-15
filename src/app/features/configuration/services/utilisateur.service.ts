import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateUtilisateurRequest, ModifierUtilisateurRequest, Utilisateur, UtilisateurChantier } from '../models/configuration.model';

@Injectable({ providedIn: 'root' })
export class UtilisateurService {

    private readonly baseUrl = `${environment.apiUrl}/utilisateurs`;

    constructor(private http: HttpClient) { }

    lister(): Observable<Utilisateur[]> {
        return this.http.get<Utilisateur[]>(this.baseUrl);
    }

    creer(request: CreateUtilisateurRequest): Observable<Utilisateur> {
        return this.http.post<Utilisateur>(this.baseUrl, request);
    }

    modifier(id: string, request: ModifierUtilisateurRequest): Observable<Utilisateur> {
        return this.http.put<Utilisateur>(`${this.baseUrl}/${id}`, request);
    }

    desactiver(id: string): Observable<Utilisateur> {
        return this.http.post<Utilisateur>(`${this.baseUrl}/${id}/desactiver`, {});
    }

    activer(id: string): Observable<Utilisateur> {
        return this.http.post<Utilisateur>(`${this.baseUrl}/${id}/activer`, {});
    }

    supprimer(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    listerChantiers(id: string): Observable<UtilisateurChantier[]> {
        return this.http.get<UtilisateurChantier[]>(`${this.baseUrl}/${id}/chantiers`);
    }
}
