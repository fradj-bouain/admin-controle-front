import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { Chantier } from '../models/chantier.model';
import { ChantierService } from '../services/chantier.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';

@Component({
    selector: 'app-chantier-list',
    templateUrl: './chantier-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class ChantierListComponent implements OnInit {

    chantiers: Chantier[] = [];
    clients: Client[] = [];
    loading = false;

    constructor(
        private chantierService: ChantierService,
        private clientService: ClientService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        private translate: TranslateService
    ) { }

    ngOnInit(): void {
        this.charger();
        this.clientService.lister().subscribe((clients) => (this.clients = clients));
    }

    charger() {
        this.loading = true;
        this.chantierService.lister().subscribe({
            next: (chantiers) => {
                this.chantiers = chantiers;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les chantiers' });
            }
        });
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
}
