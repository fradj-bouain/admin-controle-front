import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Entreprise } from '../models/entreprise.model';
import { EntrepriseService } from '../services/entreprise.service';

@Component({
    selector: 'app-entreprise-list',
    templateUrl: './entreprise-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class EntrepriseListComponent implements OnInit {

    entreprises: Entreprise[] = [];
    loading = false;

    constructor(
        private entrepriseService: EntrepriseService,
        private confirmation: ConfirmationService,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.charger();
    }

    charger() {
        this.loading = true;
        this.entrepriseService.lister().subscribe({
            next: (entreprises) => { this.entreprises = entreprises; this.loading = false; },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les entreprises' });
            }
        });
    }

    confirmerBasculeStatut(entreprise: Entreprise) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (entreprise.actif ? 'désactiver' : 'activer') + ' cette entreprise ?',
            accept: () => {
                const obs = entreprise.actif
                    ? this.entrepriseService.desactiver(entreprise.id)
                    : this.entrepriseService.activer(entreprise.id);
                obs.subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }
}
