import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { AffectationEntrepriseChantier, Entreprise, RoleEntreprise } from '../models/entreprise.model';
import { EntrepriseService } from '../services/entreprise.service';
import { AffectationEntrepriseChantierService } from '../services/affectation-entreprise-chantier.service';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Pays } from 'src/app/features/configuration/models/configuration.model';

interface RepartitionCorpsMetier {
    libelle: string;
    total: number;
}

/**
 * Une ligne = une entreprise, sur UN chantier précis (une par affectation) — pas une ligne
 * par entreprise. Une entreprise sur 3 chantiers apparaît donc 3 fois, chaque fois avec le
 * statut d'engagement propre à ce chantier. Une entreprise sans aucune affectation apparaît
 * quand même, une seule fois, avec les champs d'affectation absents — pour rester gérable
 * (modifier/désactiver/supprimer) même avant sa première affectation. Champs à plat plutôt
 * qu'un objet { entreprise, affectation } imbriqué, pour que le filtre/tri natif de p-table
 * (globalFilterFields, p-columnFilter) fonctionne sans souci de chemin.
 */
interface SousTraitantApercu {
    entrepriseId: string;
    raisonSociale: string;
    role: RoleEntreprise;
    statut: string;
}

interface LigneEntrepriseAffectation {
    // Clé unique de ligne pour p-table (dataKey) : l'id d'affectation quand il y en a une,
    // sinon l'id d'entreprise (une seule ligne "sans affectation" possible par entreprise).
    rowKey: string;
    entrepriseId: string;
    raisonSociale: string;
    paysCalculee: string;
    telephone?: string;
    ville?: string;
    actif: boolean;
    createdAt: string;
    affectationId?: string;
    chantierId?: string;
    nomChantier?: string;
    role?: RoleEntreprise;
    statutAffectation?: string;
    // Entreprises STT1/STT2 rattachées à CETTE affectation précise (affectationParenteId
    // pointant sur elle) — jamais renseigné pour une ligne "sans affectation" ni pour un
    // STT2 (qui ne peut pas lui-même avoir de sous-traitant, voir règle métier).
    sousTraitants: SousTraitantApercu[];
}

@Component({
    selector: 'app-entreprise-list',
    templateUrl: './entreprise-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class EntrepriseListComponent implements OnInit {

    entreprises: Entreprise[] = [];
    pays: Pays[] = [];
    // Réservé SUPER_ADMIN (voir GET /entreprises/affectations) — reste vide pour les autres
    // rôles, auquel cas lignes() retombe naturellement sur une ligne par entreprise, sans
    // colonne chantier renseignée (comportement inchangé pour ces rôles).
    affectations: AffectationEntrepriseChantier[] = [];
    lignes: LigneEntrepriseAffectation[] = [];
    // Ligne dépliable "Sous-traitants" (voir template, pRowToggler) — déjà en mémoire via
    // this.affectations, aucun appel réseau au dépli, contrairement au dépli chantier de
    // ChantierListComponent (qui doit charger à la demande).
    expandedRowKeys: Record<string, boolean> = {};
    loading = false;
    // Filtres avancés (par colonne) repliés par défaut : la recherche unique
    // couvre le besoin courant, ceux-ci restent disponibles pour un besoin
    // plus précis (voir audit UX — trop de boîtes de recherche dispersées).
    afficherFiltresAvances = false;
    menuItems: MenuItem[] = [];

    // --- Indicateurs (voir prototype validé) : comptés côté client à partir de la liste
    // d'ENTREPRISES (pas des lignes fusionnées, qui dupliqueraient une même entreprise
    // présente sur plusieurs chantiers).
    nbActifs = 0;
    nbInactifs = 0;
    nbSurChantier = 0;
    nbNouveauxCeMois = 0;
    repartitionCorpsMetier: RepartitionCorpsMetier[] = [];
    // Repliable, repliée par défaut (même convention que ClientListComponent.afficherRepartitionVilles).
    afficherRepartitionCorpsMetier = false;

    constructor(
        private entrepriseService: EntrepriseService,
        private affectationEntrepriseChantierService: AffectationEntrepriseChantierService,
        private referenceDataService: ReferenceDataService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    get maxRepartitionCorpsMetier(): number {
        return Math.max(1, ...this.repartitionCorpsMetier.map((c) => c.total));
    }

    nomPays(paysId?: string): string {
        return this.pays.find((p) => p.id === paysId)?.nom ?? '—';
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
        // GET /entreprises/affectations est ouvert à tout compte authentifié et filtré
        // côté backend au périmètre de chacun (Client : ses chantiers accessibles ; SUPER_ADMIN
        // /Contrôleur : vue complète) — voir EntrepriseController.listerAffectations. Toujours
        // appelé ici : la liste fusionnée (une ligne par affectation) est désormais la vue
        // standard, plus seulement celle du SUPER_ADMIN.
        this.chargerAffectations();
    }

    charger() {
        this.loading = true;
        forkJoin({
            entreprises: this.entrepriseService.lister(),
            corpsDeMetiers: this.referenceDataService.listerCorpsDeMetier(),
            pays: this.referenceDataService.listerPays()
        }).subscribe({
            next: ({ entreprises, corpsDeMetiers, pays }) => {
                this.entreprises = entreprises;
                this.pays = pays;
                this.calculerIndicateurs(entreprises, corpsDeMetiers);
                this.recalculerLignes();
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

    chargerAffectations() {
        this.affectationEntrepriseChantierService.listerToutes().subscribe({
            next: (affectations) => {
                this.affectations = affectations;
                this.recalculerLignes();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les affectations' })
        });
    }

    /** Fusionne entreprises + affectations en lignes à plat, une par affectation — voir
        LigneEntrepriseAffectation. Appelée après chaque chargement (entreprises OU
        affectations), tolérante si l'un des deux n'est pas encore arrivé. */
    private recalculerLignes() {
        if (this.affectations.length === 0) {
            this.lignes = this.entreprises.map((e) => this.ligneSansAffectation(e));
            return;
        }
        const affectationsParEntreprise = new Map<string, AffectationEntrepriseChantier[]>();
        for (const a of this.affectations) {
            const liste = affectationsParEntreprise.get(a.entrepriseId) ?? [];
            liste.push(a);
            affectationsParEntreprise.set(a.entrepriseId, liste);
        }
        this.lignes = this.entreprises.flatMap((entreprise) => {
            const affs = affectationsParEntreprise.get(entreprise.id);
            if (!affs || affs.length === 0) {
                return [this.ligneSansAffectation(entreprise)];
            }
            return affs.map((a) => ({
                rowKey: a.id,
                entrepriseId: entreprise.id,
                raisonSociale: entreprise.raisonSociale,
                paysCalculee: this.nomPays(entreprise.paysId),
                telephone: entreprise.telephone,
                ville: entreprise.ville,
                actif: entreprise.actif,
                createdAt: entreprise.createdAt,
                affectationId: a.id,
                chantierId: a.chantierId,
                nomChantier: a.nomChantier,
                role: a.role,
                statutAffectation: a.statut,
                sousTraitants: this.affectations
                    .filter((enfant) => enfant.affectationParenteId === a.id)
                    .map((enfant) => ({
                        entrepriseId: enfant.entrepriseId,
                        raisonSociale: this.entreprises.find((e) => e.id === enfant.entrepriseId)?.raisonSociale ?? '—',
                        role: enfant.role,
                        statut: enfant.statut
                    }))
            }));
        });
    }

    private ligneSansAffectation(entreprise: Entreprise): LigneEntrepriseAffectation {
        return {
            rowKey: entreprise.id,
            entrepriseId: entreprise.id,
            raisonSociale: entreprise.raisonSociale,
            paysCalculee: this.nomPays(entreprise.paysId),
            telephone: entreprise.telephone,
            ville: entreprise.ville,
            actif: entreprise.actif,
            createdAt: entreprise.createdAt,
            sousTraitants: []
        };
    }

    // Bascule l'engagement (statut ACTIF/INACTIF) SUR CE CHANTIER précis, sans toucher
    // au statut global de l'entreprise (Entreprise.actif) ni à ses autres chantiers —
    // voir le modèle "identité vs engagement" validé.
    desactiverAffectation(ligne: LigneEntrepriseAffectation) {
        if (!ligne.chantierId || !ligne.affectationId) {
            return;
        }
        this.affectationEntrepriseChantierService.desactiver(ligne.chantierId, ligne.affectationId).subscribe({
            next: () => this.chargerAffectations(),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    reactiverAffectation(ligne: LigneEntrepriseAffectation) {
        if (!ligne.chantierId || !ligne.affectationId) {
            return;
        }
        this.affectationEntrepriseChantierService.reactiver(ligne.chantierId, ligne.affectationId).subscribe({
            next: () => this.chargerAffectations(),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    confirmerBasculeStatut(ligne: LigneEntrepriseAffectation) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (ligne.actif ? 'désactiver' : 'activer') + ' cette entreprise ?',
            accept: () => {
                const obs = ligne.actif
                    ? this.entrepriseService.desactiver(ligne.entrepriseId)
                    : this.entrepriseService.activer(ligne.entrepriseId);
                obs.subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    confirmerSuppression(ligne: LigneEntrepriseAffectation) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: `Voulez-vous supprimer l'entreprise "${ligne.raisonSociale}" ?`,
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.entrepriseService.supprimer(ligne.entrepriseId).subscribe({
                    next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Entreprise supprimée' }); this.charger(); },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }

    // Regroupe modifier/activer-désactiver/supprimer dans un seul menu "⋯" au lieu
    // de plusieurs icônes nues côte à côte (voir audit UX) — reconstruit à chaque
    // ouverture pour refléter l'état (actif/inactif) de la ligne cliquée.
    construireMenu(ligne: LigneEntrepriseAffectation): MenuItem[] {
        // queryParams doit reprendre le chantierId de la ligne, comme le clic sur la ligne
        // elle-même (voir template) — sans ça, "Modifier" perdait le contexte chantier et la
        // carte "Coordonnées de contact pour ce chantier" de la fiche restait invisible.
        const items: MenuItem[] = [
            {
                label: 'Modifier', icon: 'pi pi-pencil',
                routerLink: ['/entreprises', ligne.entrepriseId],
                queryParams: ligne.chantierId ? { chantierId: ligne.chantierId } : {}
            }
        ];
        if (this.isSuperAdmin) {
            items.push(
                {
                    label: ligne.actif ? 'Désactiver' : 'Activer',
                    icon: ligne.actif ? 'pi pi-ban' : 'pi pi-check',
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
