import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateDocumentRequest, DocumentItem } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {

    private readonly baseUrl = `${environment.apiUrl}/documents`;

    constructor(private http: HttpClient) { }

    listerParSalarie(salarieId: string): Observable<DocumentItem[]> {
        return this.http.get<DocumentItem[]>(this.baseUrl, { params: { salarieId } });
    }

    listerParEntreprise(entrepriseId: string): Observable<DocumentItem[]> {
        return this.http.get<DocumentItem[]>(this.baseUrl, { params: { entrepriseId } });
    }

    creer(request: CreateDocumentRequest): Observable<DocumentItem> {
        return this.http.post<DocumentItem>(this.baseUrl, request);
    }

    valider(id: string): Observable<DocumentItem> {
        return this.http.post<DocumentItem>(`${this.baseUrl}/${id}/valider`, {});
    }

    refuser(id: string, documentEtatId: string): Observable<DocumentItem> {
        return this.http.post<DocumentItem>(`${this.baseUrl}/${id}/refuser`, { documentEtatId });
    }
}
