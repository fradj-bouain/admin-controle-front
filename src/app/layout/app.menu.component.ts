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
        const estEntreprise = this.auth.hasRole('ENTREPRISE');
        const estClient = this.auth.hasRole('CLIENT');
        const gereSaPropreEquipe = estClient || estEntreprise;
        // "Mon équipe" (créer/modifier/désactiver/supprimer des comptes) est réservé, côté
        // Client, au profil "accès total" (voir Utilisateur.accesTousChantiers) — un
        // "responsable de chantier" n'a pas à administrer le reste de l'équipe. Sans
        // incidence sur Entreprise, qui n'a pas cette notion à deux niveaux.
        const peutGererEquipe = estEntreprise || (estClient && this.auth.accesTousChantiers);

        this.model = [
            {
                label: 'menu.dashboard',
                icon: 'pi pi-fw pi-home',
                routerLink: ['/']
            },
            // Un compte Client n'a par construction accès qu'à SA propre fiche (voir
            // ClientController.lister) : passer par le listing (une seule ligne à cliquer)
            // n'a aucun sens pour lui. Lien direct vers sa fiche, libellé adapté ("Ma
            // fiche" plutôt que "Clients" au pluriel) — comportement inchangé pour tous
            // les autres rôles, qui gèrent un vrai registre.
            estClient ? {
                label: 'menu.maFiche',
                icon: 'pi pi-fw pi-building',
                routerLink: ['/clients', this.auth.clientId]
            } : {
                label: 'menu.clients',
                icon: 'pi pi-fw pi-building',
                routerLink: ['/clients']
            },
            {
                label: 'menu.chantiers',
                icon: 'pi pi-fw pi-map',
                routerLink: ['/chantiers']
            },
            // Entreprises/Salariés/Contrôles/Documents : registres complets, masqués pour
            // le Client — tout ce qui le concerne (entreprises sur ses chantiers, salariés
            // qui y interviennent, conformité documentaire, contrôles) est désormais
            // consultable depuis la fiche Chantier elle-même (voir ChantierDetailComponent,
            // vue Client) et ses raccourcis vers les fiches Entreprise/Salarié, plutôt que
            // dupliqué dans des listings globaux qui ne le concernent pas.
            ...(!estClient ? [{
                label: 'menu.entreprises',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/entreprises']
            }] : []),
            ...(!estClient ? [{
                label: 'menu.salaries',
                icon: 'pi pi-fw pi-users',
                routerLink: ['/salaries']
            }] : []),
            // Contrôles/Rapports : masqué pour l'Entreprise (n'a pas à consulter ses propres
            // contrôles) ET pour le Client (consultables depuis la fiche Chantier).
            ...(!estEntreprise && !estClient ? [{
                label: 'menu.controles',
                icon: 'pi pi-fw pi-verified',
                routerLink: ['/controles']
            }] : []),
            ...(!estClient ? [{
                label: 'menu.documents',
                icon: 'pi pi-fw pi-file',
                routerLink: ['/documents']
            }] : []),
            // Mon équipe : auto-gestion des comptes utilisateurs rattachés à sa propre
            // session (Client ou Entreprise) — n'existe pas pour Contrôleur, ni pour un
            // Client "responsable de chantier" (voir peutGererEquipe).
            ...(peutGererEquipe ? [{
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
