import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DocumentChantierSupplementaire } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentChantierSupplementaireService {

    constructor(private http: HttpClient) { }

    lister(chantierId: string): Observable<DocumentChantierSupplementaire[]> {
        return this.http.get<DocumentChantierSupplementaire[]>(
            `${environment.apiUrl}/chantiers/${chantierId}/documents-supplementaires`);
    }

    ajouter(chantierId: string, typeDocumentId: string): Observable<DocumentChantierSupplementaire> {
        return this.http.post<DocumentChantierSupplementaire>(
            `${environment.apiUrl}/chantiers/${chantierId}/documents-supplementaires`, { typeDocumentId });
    }

    retirer(chantierId: string, id: string): Observable<void> {
        return this.http.delete<void>(
            `${environment.apiUrl}/chantiers/${chantierId}/documents-supplementaires/${id}`);
    }
}
