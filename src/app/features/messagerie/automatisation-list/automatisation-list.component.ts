import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RegleAutomatisation } from '../models/message.model';
import { RegleAutomatisationService } from '../services/regle-automatisation.service';

@Component({
    selector: 'app-automatisation-list',
    templateUrl: './automatisation-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class AutomatisationListComponent implements OnInit {

    regles: RegleAutomatisation[] = [];
    loading = false;

    evenementLabels: Record<string, string> = {
        DOCUMENT_EXPIRATION: 'Document arrivant à expiration',
        CHANTIER_CONTROLE_A_VENIR: 'Contrôle de chantier à venir'
    };

    cibleLabels: Record<string, string> = {
        SPECIFIQUE: 'Destinataire spécifique',
        TOUS_UTILISATEURS: 'Tous les utilisateurs',
        TOUS_CLIENTS: 'Tous les clients',
        TOUTES_ENTREPRISES: 'Toutes les entreprises'
    };

    constructor(
        private regleService: RegleAutomatisationService,
        private confirmation: ConfirmationService,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.charger();
    }

    charger() {
        this.loading = true;
        this.regleService.lister().subscribe({
            next: (regles) => { this.regles = regles; this.loading = false; },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les règles' });
            }
        });
    }

    confirmerBasculeStatut(regle: RegleAutomatisation) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (regle.actif ? 'désactiver' : 'activer') + ' cette règle ?',
            accept: () => {
                const obs = regle.actif ? this.regleService.desactiver(regle.id) : this.regleService.activer(regle.id);
                obs.subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    confirmerSuppression(regle: RegleAutomatisation) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Supprimer définitivement la règle "' + regle.nom + '" ?',
            accept: () => {
                this.regleService.supprimer(regle.id).subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }
}
