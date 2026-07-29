import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Salarie } from '../models/salarie.model';
import { SalarieService } from '../services/salarie.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';

@Component({
    selector: 'app-salarie-list',
    templateUrl: './salarie-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class SalarieListComponent implements OnInit {

    salaries: Salarie[] = [];
    entreprises: Entreprise[] = [];
    loading = false;

    dialogQrCodeVisible = false;
    salarieSelectionne: Salarie | null = null;

    constructor(
        private salarieService: SalarieService,
        private entrepriseService: EntrepriseService,
        private confirmation: ConfirmationService,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.charger();
        this.entrepriseService.lister().subscribe((entreprises) => (this.entreprises = entreprises));
    }

    charger() {
        this.loading = true;
        this.salarieService.lister().subscribe({
            next: (salaries) => { this.salaries = salaries; this.loading = false; },
            error: () => {
                this.loading = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les salariés' });
            }
        });
    }

    ouvrirQrCode(salarie: Salarie) {
        this.salarieSelectionne = salarie;
        this.dialogQrCodeVisible = true;
    }

    nomEntreprise(entrepriseId: string): string {
        return this.entreprises.find((e) => e.id === entrepriseId)?.raisonSociale ?? entrepriseId;
    }

    confirmerBasculeStatut(salarie: Salarie) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (salarie.statut === 'ACTIF' ? 'désactiver' : 'activer') + ' ce salarié ?',
            accept: () => {
                const obs = salarie.statut === 'ACTIF'
                    ? this.salarieService.desactiver(salarie.id)
                    : this.salarieService.activer(salarie.id);
                obs.subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }
}
