import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Entreprise } from '../models/entreprise.model';
import { EntrepriseService } from '../services/entreprise.service';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-entreprise-list',
    templateUrl: './entreprise-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class EntrepriseListComponent implements OnInit {

    entreprises: Entreprise[] = [];
    loading = false;
    // Filtres avancés (par colonne) repliés par défaut : la recherche unique
    // couvre le besoin courant, ceux-ci restent disponibles pour un besoin
    // plus précis (voir audit UX — trop de boîtes de recherche dispersées).
    afficherFiltresAvances = false;
    menuItems: MenuItem[] = [];

    constructor(
        private entrepriseService: EntrepriseService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    // "Chantier actuel" n'a de sens que pour un usage transverse (SUPER_ADMIN/ENTREPRISE) :
    // côté Client, cette liste est déjà limitée aux entreprises de SES chantiers, et le
    // chantier "actuel" retourné par le backend n'est pas garanti être l'un d'eux (une
    // entreprise peut intervenir ailleurs en parallèle) — donc pas pertinent à afficher ici.
    get estClient(): boolean {
        return this.auth.hasRole('CLIENT');
    }

    ngOnInit(): void {
        this.charger();
    }

    charger() {
        this.loading = true;
        this.entrepriseService.lister().subscribe({
            next: (entreprises) => { this.entreprises = entreprises; this.loading = false; },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les entreprises' });
            }
        });
    }

    confirmerBasculeStatut(entreprise: Entreprise) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (entreprise.actif ? 'désactiver' : 'activer') + ' cette entreprise ?',
            accept: () => {
                const obs = entreprise.actif
                    ? this.entrepriseService.desactiver(entreprise.id)
                    : this.entrepriseService.activer(entreprise.id);
                obs.subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    confirmerSuppression(entreprise: Entreprise) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: `Voulez-vous supprimer l'entreprise "${entreprise.raisonSociale}" ?`,
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.entrepriseService.supprimer(entreprise.id).subscribe({
                    next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Entreprise supprimée' }); this.charger(); },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }

    // Regroupe modifier/activer-désactiver/supprimer dans un seul menu "⋯" au lieu
    // de plusieurs icônes nues côte à côte (voir audit UX) — reconstruit à chaque
    // ouverture pour refléter l'état (actif/inactif) de la ligne cliquée.
    construireMenu(entreprise: Entreprise): MenuItem[] {
        const items: MenuItem[] = [
            { label: 'Modifier', icon: 'pi pi-pencil', routerLink: ['/entreprises', entreprise.id] }
        ];
        if (this.isSuperAdmin) {
            items.push(
                {
                    label: entreprise.actif ? 'Désactiver' : 'Activer',
                    icon: entreprise.actif ? 'pi pi-ban' : 'pi pi-check',
                    command: () => this.confirmerBasculeStatut(entreprise)
                },
                { separator: true },
                {
                    label: 'Supprimer',
                    icon: 'pi pi-trash',
                    styleClass: 'text-red-600',
                    command: () => this.confirmerSuppression(entreprise)
                }
            );
        }
        return items;
    }
}
