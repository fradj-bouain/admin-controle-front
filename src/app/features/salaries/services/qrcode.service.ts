import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { QrCode } from '../models/qrcode.model';

@Injectable({ providedIn: 'root' })
export class QrCodeService {

    constructor(private http: HttpClient) { }

    obtenir(salarieId: string): Observable<QrCode> {
        return this.http.get<QrCode>(`${environment.apiUrl}/salaries/${salarieId}/qrcode`);
    }

    generer(salarieId: string): Observable<QrCode> {
        return this.http.post<QrCode>(`${environment.apiUrl}/salaries/${salarieId}/qrcode`, {});
    }

    regenerer(salarieId: string): Observable<QrCode> {
        return this.http.post<QrCode>(`${environment.apiUrl}/salaries/${salarieId}/qrcode/regenerer`, {});
    }

    desactiver(salarieId: string): Observable<QrCode> {
        return this.http.post<QrCode>(`${environment.apiUrl}/salaries/${salarieId}/qrcode/desactiver`, {});
    }

    /**
     * L'endpoint image exige un Bearer token (JwtInterceptor) : impossible de le
     * lier directement à un <img src>, il faut le récupérer en blob puis créer
     * une URL objet locale.
     */
    telechargerImage(salarieId: string): Observable<Blob> {
        return this.http.get(`${environment.apiUrl}/salaries/${salarieId}/qrcode/image`, { responseType: 'blob' });
    }
}
