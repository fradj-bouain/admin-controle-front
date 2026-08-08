import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html'
})
export class AppMenuComponent implements OnInit {

    model: any[] = [];

    constructor(private auth: AuthService) { }

    ngOnInit() {
        const estSuperAdmin = this.auth.hasRole('SUPER_ADMIN');
        const gereSaPropreEquipe = this.auth.hasRole('CLIENT') || this.auth.hasRole('ENTREPRISE');

        this.model = [
            {
                label: 'menu.dashboard',
                icon: 'pi pi-fw pi-home',
                routerLink: ['/']
            },
            {
                label: 'menu.clients',
                icon: 'pi pi-fw pi-building',
                routerLink: ['/clients']
            },
            {
                label: 'menu.chantiers',
                icon: 'pi pi-fw pi-map',
                routerLink: ['/chantiers']
            },
            {
                label: 'menu.entreprises',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/entreprises']
            },
            {
                label: 'menu.salaries',
                icon: 'pi pi-fw pi-users',
                routerLink: ['/salaries']
            },
            {
                label: 'menu.controles',
                icon: 'pi pi-fw pi-verified',
                routerLink: ['/controles']
            },
            {
                label: 'menu.documents',
                icon: 'pi pi-fw pi-file',
                routerLink: ['/documents']
            },
            // Mon équipe : auto-gestion des comptes utilisateurs rattachés à sa propre
            // session (Client ou Entreprise) — n'existe pas pour Contrôleur.
            ...(gereSaPropreEquipe ? [{
                label: 'menu.monEquipe',
                icon: 'pi pi-fw pi-users',
                routerLink: ['/mon-equipe']
            }] : []),
            // Messagerie : lecture (boîte de réception + envoyés) ouverte à SUPER_ADMIN
            // et à qui gère sa propre équipe (Client/Entreprise) — un message peut leur
            // être adressé collectivement. Rédiger/automatisation restent réservés au
            // SUPER_ADMIN via data.roles sur ces routes précises.
            ...(estSuperAdmin || gereSaPropreEquipe ? [{
                label: 'menu.messagerie',
                icon: 'pi pi-fw pi-envelope',
                routerLink: ['/messagerie']
            }] : []),
            // Configuration (données de référence) ne concerne que le SUPER_ADMIN —
            // masquée pour les autres comptes, qui de toute façon ne passeraient pas
            // le AuthGuard (data.roles) s'ils y accédaient directement par URL.
            ...(estSuperAdmin ? [{
                label: 'menu.configuration',
                icon: 'pi pi-fw pi-cog',
                routerLink: ['/configuration']
            }] : [])
        ];
    }
}
