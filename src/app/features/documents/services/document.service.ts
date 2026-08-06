import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreateDocumentRequest, DocumentEnAttente, DocumentItem, HistoriqueModification } from '../models/document.model';
import { MessagePlanifie } from 'src/app/features/messagerie/models/message.model';

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

    valider(id: string, dates?: { dateDebutValidite?: string; dateExpiration?: string }): Observable<DocumentItem> {
        return this.http.post<DocumentItem>(`${this.baseUrl}/${id}/valider`, dates ?? {});
    }

    refuser(id: string, documentEtatId: string): Observable<DocumentItem> {
        return this.http.post<DocumentItem>(`${this.baseUrl}/${id}/refuser`, { documentEtatId });
    }

    notifier(id: string, request: { email: string; sujet: string; description: string }): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/notifier`, request);
    }

    supprimer(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    historiqueParSalarie(salarieId: string): Observable<HistoriqueModification[]> {
        return this.http.get<HistoriqueModification[]>(`${this.baseUrl}/historique`, { params: { salarieId } });
    }

    historiqueParEntreprise(entrepriseId: string): Observable<HistoriqueModification[]> {
        return this.http.get<HistoriqueModification[]>(`${this.baseUrl}/historique`, { params: { entrepriseId } });
    }

    relancesParSalarie(salarieId: string): Observable<MessagePlanifie[]> {
        return this.http.get<MessagePlanifie[]>(`${this.baseUrl}/relances`, { params: { salarieId } });
    }

    relancesParEntreprise(entrepriseId: string): Observable<MessagePlanifie[]> {
        return this.http.get<MessagePlanifie[]>(`${this.baseUrl}/relances`, { params: { entrepriseId } });
    }

    listerEnAttente(): Observable<DocumentEnAttente[]> {
        return this.http.get<DocumentEnAttente[]>(`${this.baseUrl}/en-attente`);
    }
}
