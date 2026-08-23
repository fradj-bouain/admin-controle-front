import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DestinataireType, Message, SendMessageRequest } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {

    private readonly baseUrl = `${environment.apiUrl}/messages`;

    constructor(private http: HttpClient) { }

    envoyer(request: SendMessageRequest): Observable<Message> {
        return this.http.post<Message>(this.baseUrl, request);
    }

    boiteReception(): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.baseUrl}/boite-reception`);
    }

    envoyes(): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.baseUrl}/envoyes`);
    }

    // Historique des messages pour une fiche (Entreprise/Client/Salarié via salarieId) — pas
    // la boîte de réception d'un compte. chantierId/salarieId optionnels : mêmes principes que
    // documents/historique de documents (voir DocumentService.historiqueParEntreprise).
    historique(destinataireType: DestinataireType, destinataireId: string,
        options?: { chantierId?: string; salarieId?: string }): Observable<Message[]> {
        const params: Record<string, string> = { destinataireType, destinataireId };
        if (options?.chantierId) {
            params['chantierId'] = options.chantierId;
        }
        if (options?.salarieId) {
            params['salarieId'] = options.salarieId;
        }
        return this.http.get<Message[]>(`${this.baseUrl}/historique`, { params });
    }

    obtenir(id: string): Observable<Message> {
        return this.http.get<Message>(`${this.baseUrl}/${id}`);
    }

    marquerLu(id: string): Observable<Message> {
        return this.http.post<Message>(`${this.baseUrl}/${id}/marquer-lu`, {});
    }
}
