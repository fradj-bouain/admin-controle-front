import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MessagePlanifie } from '../models/message.model';
import { MessagePlanifieService } from '../services/message-planifie.service';

@Component({
    selector: 'app-planification-list',
    templateUrl: './planification-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class PlanificationListComponent implements OnInit {

    messages: MessagePlanifie[] = [];
    loading = false;

    cibleLabels: Record<string, string> = {
        SPECIFIQUE: 'Destinataire spécifique',
        TOUS_UTILISATEURS: 'Tous les utilisateurs',
        TOUS_CLIENTS: 'Tous les clients',
        TOUTES_ENTREPRISES: 'Toutes les entreprises'
    };

    constructor(
        private planifieService: MessagePlanifieService,
        private confirmation: ConfirmationService,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.charger();
    }

    charger() {
        this.loading = true;
        this.planifieService.lister().subscribe({
            next: (messages) => { this.messages = messages; this.loading = false; },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les planifications' });
            }
        });
    }

    statutSeverity(statut: string): 'success' | 'warning' | 'danger' {
        switch (statut) {
            case 'ENVOYE': return 'success';
            case 'ANNULE': return 'danger';
            default: return 'warning';
        }
    }

    confirmerAnnulation(message: MessagePlanifie) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Annuler cet envoi planifié ?',
            accept: () => {
                this.planifieService.annuler(message.id).subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Annulation impossible' })
                });
            }
        });
    }
}
