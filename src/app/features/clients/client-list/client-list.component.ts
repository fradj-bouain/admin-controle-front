import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Client } from '../models/client.model';
import { ClientService } from '../services/client.service';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-client-list',
    templateUrl: './client-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class ClientListComponent implements OnInit {

    clients: Client[] = [];
    loading = false;
    afficherFiltresAvances = false;
    menuItems: MenuItem[] = [];

    constructor(
        private clientService: ClientService,
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
        this.clientService.lister().subscribe({
            next: (clients) => { this.clients = clients; this.loading = false; },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les clients' });
            }
        });
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
