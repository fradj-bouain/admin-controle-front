import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Client } from '../models/client.model';
import { ClientService } from '../services/client.service';
import { ChantierService } from '../../chantiers/services/chantier.service';
import { AuthService } from 'src/app/core/auth/auth.service';

interface RepartitionVille {
    ville: string;
    total: number;
}

@Component({
    selector: 'app-client-list',
    templateUrl: './client-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class ClientListComponent implements OnInit {

    // nbChantiers ajouté au chargement (voir calculerIndicateurs), pour l'afficher en
    // colonne dans le tableau sans second appel dédié.
    clients: Array<Client & { nbChantiers: number }> = [];
    loading = false;
    afficherFiltresAvances = false;
    menuItems: MenuItem[] = [];

    // --- Indicateurs (voir prototype validé) : comptés côté client à partir des
    // listes déjà chargées pour cette page, pas de nouvel appel dédié.
    nbActifs = 0;
    nbInactifs = 0;
    nbAvecChantierActif = 0;
    nbNouveauxCeMois = 0;
    repartitionVilles: RepartitionVille[] = [];
    // Repliable, repliée par défaut (même convention que ChantierDetailComponent.afficherStatistiques).
    afficherRepartitionVilles = false;

    constructor(
        private clientService: ClientService,
        private chantierService: ChantierService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    ngOnInit(): void {
        this.charger();
    }

    charger() {
        this.loading = true;
        forkJoin({
            clients: this.clientService.lister(),
            chantiers: this.chantierService.lister()
        }).subscribe({
            next: ({ clients, chantiers }) => {
                const nbChantiersParClient: Record<string, number> = {};
                chantiers.forEach((c) => (nbChantiersParClient[c.clientId] = (nbChantiersParClient[c.clientId] ?? 0) + 1));
                this.clients = clients.map((c) => ({ ...c, nbChantiers: nbChantiersParClient[c.id] ?? 0 }));
                this.calculerIndicateurs(clients, chantiers.map((c) => ({ clientId: c.clientId, statut: c.statut })));
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les clients' });
            }
        });
    }

    private calculerIndicateurs(clients: Client[], chantiers: Array<{ clientId: string; statut: string }>): void {
        this.nbActifs = clients.filter((c) => c.actif).length;
        this.nbInactifs = clients.length - this.nbActifs;

        const clientsAvecChantierActif = new Set(chantiers.filter((c) => c.statut === 'ACTIF').map((c) => c.clientId));
        this.nbAvecChantierActif = clients.filter((c) => clientsAvecChantierActif.has(c.id)).length;

        const debutMois = new Date();
        debutMois.setDate(1);
        debutMois.setHours(0, 0, 0, 0);
        this.nbNouveauxCeMois = clients.filter((c) => new Date(c.createdAt) >= debutMois).length;

        const totalParVille: Record<string, number> = {};
        clients.forEach((c) => {
            const ville = (c.ville ?? '').trim();
            if (ville) {
                totalParVille[ville] = (totalParVille[ville] ?? 0) + 1;
            }
        });
        this.repartitionVilles = Object.entries(totalParVille)
            .map(([ville, total]) => ({ ville, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);
    }

    get maxRepartitionVille(): number {
        return Math.max(1, ...this.repartitionVilles.map((v) => v.total));
    }

    initiales(raisonSociale: string): string {
        const mots = raisonSociale.trim().split(/\s+/).filter((m) => m.length > 0);
        if (mots.length === 0) {
            return '?';
        }
        return mots.length === 1 ? mots[0].substring(0, 2).toUpperCase() : (mots[0][0] + mots[1][0]).toUpperCase();
    }

    confirmerBasculeStatut(client: Client) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (client.actif ? 'désactiver' : 'activer') + ' ce client ?',
            accept: () => {
                const obs = client.actif ? this.clientService.desactiver(client.id) : this.clientService.activer(client.id);
                obs.subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    confirmerSuppression(client: Client) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: `Voulez-vous supprimer le client "${client.raisonSociale}" ?`,
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.clientService.supprimer(client.id).subscribe({
                    next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Client supprimé' }); this.charger(); },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }

    construireMenu(client: Client): MenuItem[] {
        // Un compte Entreprise ne peut que consulter la fiche (le formulaire s'ouvre
        // en lecture seule, voir client-detail.component) — jamais la modifier.
        const items: MenuItem[] = [
            this.isSuperAdmin
                ? { label: 'Modifier', icon: 'pi pi-pencil', routerLink: ['/clients', client.id] }
                : { label: 'Consulter', icon: 'pi pi-eye', routerLink: ['/clients', client.id] }
        ];
        if (this.isSuperAdmin) {
            items.push(
                {
                    label: client.actif ? 'Désactiver' : 'Activer',
                    icon: client.actif ? 'pi pi-ban' : 'pi pi-check',
                    command: () => this.confirmerBasculeStatut(client)
                },
                { separator: true },
                {
                    label: 'Supprimer',
                    icon: 'pi pi-trash',
                    styleClass: 'text-red-600',
                    command: () => this.confirmerSuppression(client)
                }
            );
        }
        return items;
    }
}
