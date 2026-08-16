import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Entreprise } from '../models/entreprise.model';
import { EntrepriseService } from '../services/entreprise.service';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { AuthService } from 'src/app/core/auth/auth.service';

interface RepartitionCorpsMetier {
    libelle: string;
    total: number;
}

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

    // --- Indicateurs (voir prototype validé) : comptés côté client à partir de la
    // liste déjà chargée pour cette page, pas de nouvel appel dédié.
    nbActifs = 0;
    nbInactifs = 0;
    nbSurChantier = 0;
    nbNouveauxCeMois = 0;
    repartitionCorpsMetier: RepartitionCorpsMetier[] = [];
    // Repliable, repliée par défaut (même convention que ClientListComponent.afficherRepartitionVilles).
    afficherRepartitionCorpsMetier = false;

    constructor(
        private entrepriseService: EntrepriseService,
        private referenceDataService: ReferenceDataService,
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

    get maxRepartitionCorpsMetier(): number {
        return Math.max(1, ...this.repartitionCorpsMetier.map((c) => c.total));
    }

    initiales(raisonSociale: string): string {
        const mots = raisonSociale.trim().split(/\s+/).filter((m) => m.length > 0);
        if (mots.length === 0) {
            return '?';
        }
        return mots.length === 1 ? mots[0].substring(0, 2).toUpperCase() : (mots[0][0] + mots[1][0]).toUpperCase();
    }

    ngOnInit(): void {
        this.charger();
    }

    charger() {
        this.loading = true;
        forkJoin({
            entreprises: this.entrepriseService.lister(),
            corpsDeMetiers: this.referenceDataService.listerCorpsDeMetier()
        }).subscribe({
            next: ({ entreprises, corpsDeMetiers }) => {
                this.entreprises = entreprises;
                this.calculerIndicateurs(entreprises, corpsDeMetiers);
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les entreprises' });
            }
        });
    }

    private calculerIndicateurs(entreprises: Entreprise[], corpsDeMetiers: Array<{ id: string; libelle: string }>): void {
        this.nbActifs = entreprises.filter((e) => e.actif).length;
        this.nbInactifs = entreprises.length - this.nbActifs;
        this.nbSurChantier = entreprises.filter((e) => !!e.chantierActuel).length;

        const debutMois = new Date();
        debutMois.setDate(1);
        debutMois.setHours(0, 0, 0, 0);
        this.nbNouveauxCeMois = entreprises.filter((e) => new Date(e.createdAt) >= debutMois).length;

        const totalParCorpsMetier: Record<string, number> = {};
        entreprises.forEach((e) => {
            const libelle = corpsDeMetiers.find((c) => c.id === e.corpsDeMetierId)?.libelle;
            if (libelle) {
                totalParCorpsMetier[libelle] = (totalParCorpsMetier[libelle] ?? 0) + 1;
            }
        });
        this.repartitionCorpsMetier = Object.entries(totalParCorpsMetier)
            .map(([libelle, total]) => ({ libelle, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);
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
