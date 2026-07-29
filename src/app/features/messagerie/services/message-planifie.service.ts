import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MessagePlanifie, PlanifierMessageRequest } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessagePlanifieService {

    private readonly baseUrl = `${environment.apiUrl}/messages-planifies`;

    constructor(private http: HttpClient) { }

    planifier(request: PlanifierMessageRequest): Observable<MessagePlanifie> {
        return this.http.post<MessagePlanifie>(this.baseUrl, request);
    }

    lister(): Observable<MessagePlanifie[]> {
        return this.http.get<MessagePlanifie[]>(this.baseUrl);
    }

    annuler(id: string): Observable<MessagePlanifie> {
        return this.http.patch<MessagePlanifie>(`${this.baseUrl}/${id}/annuler`, {});
    }
}
