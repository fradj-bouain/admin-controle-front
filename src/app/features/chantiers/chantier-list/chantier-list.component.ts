import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { Chantier } from '../models/chantier.model';
import { ChantierService } from '../services/chantier.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { AffectationEntrepriseChantier, Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { AffectationEntrepriseChantierService } from 'src/app/features/entreprises/services/affectation-entreprise-chantier.service';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { CorpsDeMetier, Pays } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';

interface RepartitionClient {
    nom: string;
    total: number;
}

@Component({
    selector: 'app-chantier-list',
    templateUrl: './chantier-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class ChantierListComponent implements OnInit {

    // nomClientCalcule/prochainControleEnRetard ajoutés au chargement : le premier pour
    // permettre un p-columnFilter texte simple sur le nom du client (le champ brut n'a
    // que clientId), le second pour la colonne "Prochain contrôle" du tableau.
    chantiers: Array<Chantier & { nomClientCalcule: string; prochainControleEnRetard: boolean }> = [];
    clients: Client[] = [];
    loading = false;
    afficherFiltresAvances = false;
    menuItems: MenuItem[] = [];

    // Arrivée depuis "Voir tout" sur une fiche Client (?clientId=...) : la liste ne
    // charge que les chantiers de ce client plutôt que le registre complet — voir
    // ChantierService.lister(clientId), déjà scopé côté backend.
    filtreClientId: string | null = null;

    // --- Indicateurs (voir prototype validé) : comptés côté client à partir de la
    // liste déjà chargée pour cette page, pas de nouvel appel dédié.
    nbActifs = 0;
    nbInactifs = 0;
    nbControlesEnRetard = 0;
    nbNouveauxCeMois = 0;
    repartitionClients: RepartitionClient[] = [];
    // Repliable, repliée par défaut (même convention que ClientListComponent.afficherRepartitionVilles).
    afficherRepartitionClients = false;

    // --- Ligne dépliable "Entreprises sur ce chantier" (SUPER_ADMIN uniquement, demande
    // explicite) : rang (Principale/STT1/STT2) + coordonnées de contact propres à CE chantier,
    // sans avoir à ouvrir la fiche Chantier pour chaque ligne. Chargée à la demande au premier
    // dépli (voir onRowExpand), mise en cache par chantierId pour ne pas rappeler l'API à
    // chaque repli/dépli du même chantier. ---
    expandedRowKeys: Record<string, boolean> = {};
    entreprises: Entreprise[] = [];
    corpsDeMetiers: CorpsDeMetier[] = [];
    pays: Pays[] = [];
    entreprisesParChantier: Record<string, AffectationEntrepriseChantier[]> = {};
    chargementEntreprisesParChantier: Record<string, boolean> = {};

    constructor(
        private chantierService: ChantierService,
        private clientService: ClientService,
        private affectationEntrepriseService: AffectationEntrepriseChantierService,
        private entrepriseService: EntrepriseService,
        private referenceDataService: ReferenceDataService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        private translate: TranslateService,
        private route: ActivatedRoute,
        private router: Router,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    get nomClientFiltre(): string {
        return this.nomClient(this.filtreClientId ?? '');
    }

    ngOnInit(): void {
        if (this.isSuperAdmin) {
            // Sert à résoudre l'email de repli (voir emailAffichage), le corps de métier et
            // la localisation (voir corpsDeMetierAffichage/localisationAffichage) quand
            // l'affectation n'a pas de contact propre à ce chantier — inutile pour les
            // autres rôles, qui ne voient de toute façon pas la ligne dépliable.
            this.entrepriseService.lister().subscribe((e) => (this.entreprises = e));
            this.referenceDataService.listerCorpsDeMetier().subscribe((c) => (this.corpsDeMetiers = c));
            this.referenceDataService.listerPays().subscribe((p) => (this.pays = p));
        }
        this.route.queryParamMap.subscribe((params) => {
            this.filtreClientId = params.get('clientId');
            this.charger();
        });
    }

    // Chargée à la demande, une seule fois par chantier (voir entreprisesParChantier) —
    // reployer/déplier ensuite ne rappelle plus l'API.
    onRowExpand(event: { data: Chantier }) {
        const chantierId = event.data.id;
        if (this.entreprisesParChantier[chantierId]) {
            return;
        }
        this.chargementEntreprisesParChantier[chantierId] = true;
        this.affectationEntrepriseService.lister(chantierId).subscribe({
            next: (affectations) => {
                this.entreprisesParChantier[chantierId] = affectations;
                this.chargementEntreprisesParChantier[chantierId] = false;
            },
            error: () => (this.chargementEntreprisesParChantier[chantierId] = false)
        });
    }

    // Email de contact propre à cette relation (entreprise, chantier) — voir modèle validé
    // "chaque chantier peut avoir son propre contact" — sinon retombe sur l'email principal
    // de l'entreprise (voir AffectationEntrepriseChantier.emailContact).
    emailAffichage(a: AffectationEntrepriseChantier): string {
        if (a.emailContact) {
            return a.emailContact;
        }
        return this.entreprises.find((e) => e.id === a.entrepriseId)?.email || '—';
    }

    // Corps de métier de l'entreprise elle-même (pas de version "propre à ce chantier" —
    // à la différence des coordonnées de contact, ce que fait l'entreprise ne change pas
    // d'un chantier à l'autre) : donne un repère immédiat de ce qu'elle fait sur place.
    corpsDeMetierAffichage(a: AffectationEntrepriseChantier): string {
        const corpsDeMetierId = this.entreprises.find((e) => e.id === a.entrepriseId)?.corpsDeMetierId;
        return this.corpsDeMetiers.find((c) => c.id === corpsDeMetierId)?.libelle ?? '—';
    }

    // Ville + pays du siège de l'entreprise — pas une adresse propre au chantier (celle-ci
    // est dans adresseContact si renseignée, déjà visible via la fiche entreprise en un clic).
    localisationAffichage(a: AffectationEntrepriseChantier): string {
        const entreprise = this.entreprises.find((e) => e.id === a.entrepriseId);
        const nomPays = this.pays.find((p) => p.id === entreprise?.paysId)?.nom;
        if (entreprise?.ville && nomPays) {
            return `${entreprise.ville} (${nomPays})`;
        }
        return entreprise?.ville || nomPays || '—';
    }

    charger() {
        this.loading = true;
        forkJoin({
            chantiers: this.chantierService.lister(this.filtreClientId ?? undefined),
            clients: this.clientService.lister()
        }).subscribe({
            next: ({ chantiers, clients }) => {
                this.clients = clients;
                const aujourdHui = new Date();
                this.chantiers = chantiers.map((c) => ({
                    ...c,
                    nomClientCalcule: this.nomClient(c.clientId),
                    prochainControleEnRetard: c.statut === 'ACTIF' && !!c.dateProchainControle && new Date(c.dateProchainControle) < aujourdHui
                }));
                this.calculerIndicateurs(this.chantiers, aujourdHui);
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les chantiers' });
            }
        });
    }

    private calculerIndicateurs(chantiers: Array<Chantier & { prochainControleEnRetard: boolean }>, aujourdHui: Date): void {
        this.nbActifs = chantiers.filter((c) => c.statut === 'ACTIF').length;
        this.nbInactifs = chantiers.length - this.nbActifs;
        this.nbControlesEnRetard = chantiers.filter((c) => c.prochainControleEnRetard).length;

        const debutMois = new Date(aujourdHui);
        debutMois.setDate(1);
        debutMois.setHours(0, 0, 0, 0);
        this.nbNouveauxCeMois = chantiers.filter((c) => new Date(c.createdAt) >= debutMois).length;

        const totalParClient: Record<string, number> = {};
        chantiers.forEach((c) => {
            const nom = this.nomClient(c.clientId);
            totalParClient[nom] = (totalParClient[nom] ?? 0) + 1;
        });
        this.repartitionClients = Object.entries(totalParClient)
            .map(([nom, total]) => ({ nom, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);
    }

    get maxRepartitionClient(): number {
        return Math.max(1, ...this.repartitionClients.map((c) => c.total));
    }

    retirerFiltreClient() {
        this.router.navigate(['/chantiers']);
    }

    confirmerBasculeStatut(chantier: Chantier) {
        const action = chantier.statut === 'ACTIF' ? 'desactiver' : 'activer';
        this.confirmation.confirm({
            header: this.translate.instant('common.confirmDeleteTitle'),
            message: this.translate.instant('common.confirmDeleteMessage'),
            accept: () => this.basculerStatut(chantier, action)
        });
    }

    nomClient(clientId: string): string {
        return this.clients.find((c) => c.id === clientId)?.raisonSociale ?? clientId;
    }

    private basculerStatut(chantier: Chantier, action: 'activer' | 'desactiver') {
        const obs = action === 'activer' ? this.chantierService.activer(chantier.id) : this.chantierService.desactiver(chantier.id);
        obs.subscribe({
            next: () => this.charger(),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    confirmerSuppression(chantier: Chantier) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: `Voulez-vous supprimer le chantier "${chantier.nom}" ?`,
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.chantierService.supprimer(chantier.id).subscribe({
                    next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Chantier supprimé' }); this.charger(); },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }

    construireMenu(chantier: Chantier): MenuItem[] {
        const items: MenuItem[] = [
            { label: 'Modifier', icon: 'pi pi-pencil', routerLink: ['/chantiers', chantier.id] }
        ];
        if (this.isSuperAdmin) {
            items.push(
                {
                    label: chantier.statut === 'ACTIF' ? 'Désactiver' : 'Activer',
                    icon: chantier.statut === 'ACTIF' ? 'pi pi-ban' : 'pi pi-check',
                    command: () => this.confirmerBasculeStatut(chantier)
                },
                { separator: true },
                {
                    label: 'Supprimer',
                    icon: 'pi pi-trash',
                    styleClass: 'text-red-600',
                    command: () => this.confirmerSuppression(chantier)
                }
            );
        }
        return items;
    }
}
