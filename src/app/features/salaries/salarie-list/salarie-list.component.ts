import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { AffectationSalarieChantier, Salarie, StatutAcces, StatutSalarie } from '../models/salarie.model';
import { SalarieService } from '../services/salarie.service';
import { AffectationSalarieChantierService } from '../services/affectation-salarie-chantier.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { SalarieFonction } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { AuthService } from 'src/app/core/auth/auth.service';

interface RepartitionFonction {
    libelle: string;
    total: number;
}

/**
 * Une ligne = un salarié, sur UN chantier précis (une par affectation) — pas une ligne par
 * salarié. Un salarié sur 2 chantiers apparaît donc 2 fois, chaque fois avec son propre
 * statut d'engagement et d'accès pour CE chantier. Un salarié sans aucune affectation
 * apparaît quand même, une seule fois, sans chantier — voir le même principe déjà appliqué
 * à EntrepriseListComponent. Champs à plat pour le filtre/tri natif de p-table, `salarie`
 * embarqué en plus (objet complet) uniquement pour la boîte de dialogue QR code.
 */
interface LigneSalarieAffectation {
    rowKey: string;
    salarieId: string;
    nom: string;
    prenom: string;
    nomEntrepriseCalculee: string;
    libelleFonctionCalculee: string;
    statut: StatutSalarie;
    createdAt: string;
    affectationId?: string;
    chantierId?: string;
    nomChantier?: string;
    statutAffectation?: string;
    statutAcces?: StatutAcces;
    salarie: Salarie;
}

@Component({
    selector: 'app-salarie-list',
    templateUrl: './salarie-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class SalarieListComponent implements OnInit {

    // nomEntrepriseCalculee/libelleFonctionCalculee ajoutées au chargement, pour permettre
    // un p-columnFilter texte simple (les champs bruts n'ont que des ids).
    salaries: Array<Salarie & { nomEntrepriseCalculee: string; libelleFonctionCalculee: string }> = [];
    entreprises: Entreprise[] = [];
    fonctions: SalarieFonction[] = [];
    // Réservé SUPER_ADMIN (voir GET /salaries/affectations) — reste vide pour les autres
    // rôles, auquel cas lignes() retombe naturellement sur une ligne par salarié, sans
    // colonne chantier renseignée (comportement inchangé pour ces rôles).
    affectations: AffectationSalarieChantier[] = [];
    lignes: LigneSalarieAffectation[] = [];
    loading = false;
    afficherFiltresAvances = false;
    menuItems: MenuItem[] = [];

    dialogQrCodeVisible = false;
    salarieSelectionne: Salarie | null = null;

    // --- Indicateurs (voir prototype validé) : comptés côté client à partir de la liste de
    // SALARIÉS (pas des lignes fusionnées, qui dupliqueraient un même salarié présent sur
    // plusieurs chantiers).
    nbActifs = 0;
    nbInactifs = 0;
    nbSurChantier = 0;
    nbNouveauxCeMois = 0;
    repartitionFonctions: RepartitionFonction[] = [];
    // Repliable, repliée par défaut (même convention que ClientListComponent.afficherRepartitionVilles).
    afficherRepartitionFonctions = false;

    constructor(
        private salarieService: SalarieService,
        private affectationSalarieChantierService: AffectationSalarieChantierService,
        private entrepriseService: EntrepriseService,
        private referenceDataService: ReferenceDataService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    get isEntreprise(): boolean {
        return this.auth.hasRole('ENTREPRISE');
    }

    // Voir entreprise-list.component.ts : même raison, "Chantier actuel" n'est pas
    // fiable pour un Client (le backend calcule cette valeur sur le périmètre global,
    // pas limité aux chantiers de ce client).
    get estClient(): boolean {
        return this.auth.hasRole('CLIENT');
    }

    get maxRepartitionFonctions(): number {
        return Math.max(1, ...this.repartitionFonctions.map((f) => f.total));
    }

    initiales(nom: string, prenom: string): string {
        return ((prenom[0] ?? '') + (nom[0] ?? '')).toUpperCase() || '?';
    }

    ngOnInit(): void {
        this.charger();
        if (this.isSuperAdmin) {
            this.chargerAffectations();
        }
    }

    charger() {
        this.loading = true;
        forkJoin({
            salaries: this.salarieService.lister(),
            entreprises: this.entrepriseService.lister(),
            fonctions: this.referenceDataService.listerSalarieFonction()
        }).subscribe({
            next: ({ salaries, entreprises, fonctions }) => {
                this.entreprises = entreprises;
                this.fonctions = fonctions;
                this.salaries = salaries.map((s) => ({
                    ...s,
                    nomEntrepriseCalculee: this.nomEntreprise(s.entrepriseEmployeurId),
                    libelleFonctionCalculee: this.nomFonction(s.fonctionId)
                }));
                this.calculerIndicateurs(salaries, fonctions);
                this.recalculerLignes();
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les salariés' });
            }
        });
    }

    private calculerIndicateurs(salaries: Salarie[], fonctions: SalarieFonction[]): void {
        this.nbActifs = salaries.filter((s) => s.statut === 'ACTIF').length;
        this.nbInactifs = salaries.length - this.nbActifs;
        this.nbSurChantier = salaries.filter((s) => !!s.chantierActuel).length;

        const debutMois = new Date();
        debutMois.setDate(1);
        debutMois.setHours(0, 0, 0, 0);
        this.nbNouveauxCeMois = salaries.filter((s) => new Date(s.createdAt) >= debutMois).length;

        const totalParFonction: Record<string, number> = {};
        salaries.forEach((s) => {
            const libelle = fonctions.find((f) => f.id === s.fonctionId)?.libelle;
            if (libelle) {
                totalParFonction[libelle] = (totalParFonction[libelle] ?? 0) + 1;
            }
        });
        this.repartitionFonctions = Object.entries(totalParFonction)
            .map(([libelle, total]) => ({ libelle, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);
    }

    chargerAffectations() {
        this.affectationSalarieChantierService.listerToutes().subscribe({
            next: (affectations) => {
                this.affectations = affectations;
                this.recalculerLignes();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les affectations' })
        });
    }

    /** Fusionne salariés + affectations en lignes à plat, une par affectation — voir
        LigneSalarieAffectation. Appelée après chaque chargement (salariés OU affectations),
        tolérante si l'un des deux n'est pas encore arrivé. */
    private recalculerLignes() {
        if (this.affectations.length === 0) {
            this.lignes = this.salaries.map((s) => this.ligneSansAffectation(s));
            return;
        }
        const affectationsParSalarie = new Map<string, AffectationSalarieChantier[]>();
        for (const a of this.affectations) {
            const liste = affectationsParSalarie.get(a.salarieId) ?? [];
            liste.push(a);
            affectationsParSalarie.set(a.salarieId, liste);
        }
        this.lignes = this.salaries.flatMap((salarie) => {
            const affs = affectationsParSalarie.get(salarie.id);
            if (!affs || affs.length === 0) {
                return [this.ligneSansAffectation(salarie)];
            }
            return affs.map((a) => ({
                rowKey: a.id,
                salarieId: salarie.id,
                nom: salarie.nom,
                prenom: salarie.prenom,
                nomEntrepriseCalculee: salarie.nomEntrepriseCalculee,
                libelleFonctionCalculee: salarie.libelleFonctionCalculee,
                statut: salarie.statut,
                createdAt: salarie.createdAt,
                affectationId: a.id,
                chantierId: a.chantierId,
                nomChantier: a.nomChantier,
                statutAffectation: a.statut,
                statutAcces: a.statutAcces,
                salarie
            }));
        });
    }

    private ligneSansAffectation(salarie: Salarie & { nomEntrepriseCalculee: string; libelleFonctionCalculee: string }): LigneSalarieAffectation {
        return {
            rowKey: salarie.id,
            salarieId: salarie.id,
            nom: salarie.nom,
            prenom: salarie.prenom,
            nomEntrepriseCalculee: salarie.nomEntrepriseCalculee,
            libelleFonctionCalculee: salarie.libelleFonctionCalculee,
            statut: salarie.statut,
            createdAt: salarie.createdAt,
            salarie
        };
    }

    // Bascule l'engagement (statut ACTIF/INACTIF) SUR CE CHANTIER précis, sans toucher
    // au statut global du salarié (Salarie.statut) ni à ses autres chantiers — voir le
    // modèle "identité vs engagement" validé.
    desactiverAffectation(ligne: LigneSalarieAffectation) {
        if (!ligne.chantierId || !ligne.affectationId) {
            return;
        }
        this.affectationSalarieChantierService.desactiver(ligne.chantierId, ligne.affectationId).subscribe({
            next: () => this.chargerAffectations(),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    reactiverAffectation(ligne: LigneSalarieAffectation) {
        if (!ligne.chantierId || !ligne.affectationId) {
            return;
        }
        this.affectationSalarieChantierService.reactiver(ligne.chantierId, ligne.affectationId).subscribe({
            next: () => this.chargerAffectations(),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    ouvrirQrCode(salarie: Salarie) {
        this.salarieSelectionne = salarie;
        this.dialogQrCodeVisible = true;
    }

    nomEntreprise(entrepriseId: string): string {
        return this.entreprises.find((e) => e.id === entrepriseId)?.raisonSociale ?? entrepriseId;
    }

    nomFonction(fonctionId?: string): string {
        return this.fonctions.find((f) => f.id === fonctionId)?.libelle ?? '—';
    }

    confirmerBasculeStatut(ligne: LigneSalarieAffectation) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (ligne.statut === 'ACTIF' ? 'désactiver' : 'activer') + ' ce salarié ?',
            accept: () => {
                const obs = ligne.statut === 'ACTIF'
                    ? this.salarieService.desactiver(ligne.salarieId)
                    : this.salarieService.activer(ligne.salarieId);
                obs.subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    confirmerSuppression(ligne: LigneSalarieAffectation) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: `Voulez-vous supprimer le salarié "${ligne.prenom} ${ligne.nom}" ?`,
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.salarieService.supprimer(ligne.salarieId).subscribe({
                    next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Salarié supprimé' }); this.charger(); },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }

    construireMenu(ligne: LigneSalarieAffectation): MenuItem[] {
        const items: MenuItem[] = [
            { label: 'Modifier', icon: 'pi pi-pencil', routerLink: ['/salaries', ligne.salarieId] }
        ];
        if (this.isSuperAdmin || this.isEntreprise) {
            items.push(
                {
                    label: ligne.statut === 'ACTIF' ? 'Désactiver' : 'Activer',
                    icon: ligne.statut === 'ACTIF' ? 'pi pi-ban' : 'pi pi-check',
                    command: () => this.confirmerBasculeStatut(ligne)
                },
                { separator: true },
                {
                    label: 'Supprimer',
                    icon: 'pi pi-trash',
                    styleClass: 'text-red-600',
                    command: () => this.confirmerSuppression(ligne)
                }
            );
        }
        return items;
    }
}
