import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateUtilisateurRequest, Utilisateur } from '../models/configuration.model';

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
}
