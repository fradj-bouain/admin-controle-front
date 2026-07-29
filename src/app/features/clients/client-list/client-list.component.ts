import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Client } from '../models/client.model';
import { ClientService } from '../services/client.service';

@Component({
    selector: 'app-client-list',
    templateUrl: './client-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class ClientListComponent implements OnInit {

    clients: Client[] = [];
    loading = false;

    constructor(
        private clientService: ClientService,
        private confirmation: ConfirmationService,
        private message: MessageService
    ) { }

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
}
