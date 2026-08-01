import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
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

    // nomClientCalcule ajouté au chargement, pour permettre un p-columnFilter
    // texte simple sur le nom du client (le champ brut n'a que clientId).
    chantiers: Array<Chantier & { nomClientCalcule: string }> = [];
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
    }

    charger() {
        this.loading = true;
        forkJoin({
            chantiers: this.chantierService.lister(),
            clients: this.clientService.lister()
        }).subscribe({
            next: ({ chantiers, clients }) => {
                this.clients = clients;
                this.chantiers = chantiers.map((c) => ({ ...c, nomClientCalcule: this.nomClient(c.clientId) }));
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
}
