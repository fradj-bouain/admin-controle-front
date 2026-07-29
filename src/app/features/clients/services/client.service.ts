import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Client, CreateClientRequest } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {

    private readonly baseUrl = `${environment.apiUrl}/clients`;

    constructor(private http: HttpClient) { }

    lister(): Observable<Client[]> {
        return this.http.get<Client[]>(this.baseUrl);
    }

    obtenir(id: string): Observable<Client> {
        return this.http.get<Client>(`${this.baseUrl}/${id}`);
    }

    creer(request: CreateClientRequest): Observable<Client> {
        return this.http.post<Client>(this.baseUrl, request);
    }

    modifier(id: string, request: CreateClientRequest): Observable<Client> {
        return this.http.put<Client>(`${this.baseUrl}/${id}`, request);
    }

    activer(id: string): Observable<Client> {
        return this.http.post<Client>(`${this.baseUrl}/${id}/activer`, {});
    }

    desactiver(id: string): Observable<Client> {
        return this.http.post<Client>(`${this.baseUrl}/${id}/desactiver`, {});
    }
}
