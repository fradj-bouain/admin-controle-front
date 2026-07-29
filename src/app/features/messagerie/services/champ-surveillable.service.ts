import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ChampSurveillable } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class ChampSurveillableService {

    private readonly baseUrl = `${environment.apiUrl}/champs-surveillables`;

    constructor(private http: HttpClient) { }

    lister(): Observable<ChampSurveillable[]> {
        return this.http.get<ChampSurveillable[]>(this.baseUrl);
    }
}
