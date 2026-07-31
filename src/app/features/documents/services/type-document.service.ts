import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateTypeDocumentRequest, TypeDocument } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class TypeDocumentService {

    private readonly baseUrl = `${environment.apiUrl}/types-document`;

    constructor(private http: HttpClient) { }

    lister(): Observable<TypeDocument[]> {
        return this.http.get<TypeDocument[]>(this.baseUrl);
    }

    obtenir(id: string): Observable<TypeDocument> {
        return this.http.get<TypeDocument>(`${this.baseUrl}/${id}`);
    }

    creer(request: CreateTypeDocumentRequest): Observable<TypeDocument> {
        return this.http.post<TypeDocument>(this.baseUrl, request);
    }

    modifier(id: string, request: CreateTypeDocumentRequest): Observable<TypeDocument> {
        return this.http.put<TypeDocument>(`${this.baseUrl}/${id}`, request);
    }
}
