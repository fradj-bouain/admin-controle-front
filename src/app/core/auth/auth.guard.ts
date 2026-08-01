import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Vérifie l'authentification et, si la route porte `data.roles`, que
 * l'utilisateur possède au moins un des rôles requis.
 *
 * Ne couvre QUE l'autorisation "globale" (ex: SUPER_ADMIN, CLIENT, ENTREPRISE).
 * L'autorisation contextuelle par chantier (rôle Principale/STT1/STT2, qui
 * dépend du chantier consulté) est vérifiée côté backend uniquement, jamais
 * ici : voir ChantierAuthorizationService côté API.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {

    constructor(private auth: AuthService, private router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
        return this.check(route, state);
    }

    canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
        return this.check(route, state);
    }

    private check(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
        if (!this.auth.isAuthenticated()) {
            return this.router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
        }

        const requiredRoles: string[] = route.data['roles'] ?? [];
        if (requiredRoles.length === 0) {
            return true;
        }

        return requiredRoles.some((role) => this.auth.hasRole(role)) || this.router.createUrlTree(['/notfound']);
    }
}
