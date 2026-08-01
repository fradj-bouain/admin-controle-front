import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateDocumentEtatRequest, DocumentEtat } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentEtatService {

    private readonly baseUrl = `${environment.apiUrl}/documents-etats`;

    constructor(private http: HttpClient) { }

    lister(): Observable<DocumentEtat[]> {
        return this.http.get<DocumentEtat[]>(this.baseUrl);
    }

    creer(request: CreateDocumentEtatRequest): Observable<DocumentEtat> {
        return this.http.post<DocumentEtat>(this.baseUrl, request);
    }

    modifier(id: string, request: CreateDocumentEtatRequest): Observable<DocumentEtat> {
        return this.http.put<DocumentEtat>(`${this.baseUrl}/${id}`, request);
    }

    supprimer(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
