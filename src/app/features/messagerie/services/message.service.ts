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

    boiteReception(type: DestinataireType, destinataireId: string): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.baseUrl}/boite-reception`, { params: { type, destinataireId } });
    }

    envoyes(): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.baseUrl}/envoyes`);
    }

    marquerLu(id: string): Observable<Message> {
        return this.http.post<Message>(`${this.baseUrl}/${id}/marquer-lu`, {});
    }
}
