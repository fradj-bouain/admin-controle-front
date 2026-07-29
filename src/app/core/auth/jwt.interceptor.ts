import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

    constructor(private auth: AuthService) { }

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        const token = this.auth.getToken();
        const isApiRequest = req.url.startsWith(environment.apiUrl);
        const isLoginRequest = req.url === `${environment.apiUrl}/auth/login`;

        if (!token || !isApiRequest || isLoginRequest) {
            return next.handle(req);
        }

        return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    }
}
