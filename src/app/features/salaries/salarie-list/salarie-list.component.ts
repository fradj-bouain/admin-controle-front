import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
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

    // nomEntrepriseCalculee ajoutée au chargement, pour permettre un
    // p-columnFilter texte simple (le champ brut n'a que entrepriseEmployeurId).
    salaries: Array<Salarie & { nomEntrepriseCalculee: string }> = [];
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
    }

    charger() {
        this.loading = true;
        forkJoin({
            salaries: this.salarieService.lister(),
            entreprises: this.entrepriseService.lister()
        }).subscribe({
            next: ({ salaries, entreprises }) => {
                this.entreprises = entreprises;
                this.salaries = salaries.map((s) => ({ ...s, nomEntrepriseCalculee: this.nomEntreprise(s.entrepriseEmployeurId) }));
                this.loading = false;
            },
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

    confirmerSuppression(salarie: Salarie) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: `Voulez-vous supprimer le salarié "${salarie.prenom} ${salarie.nom}" ?`,
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.salarieService.supprimer(salarie.id).subscribe({
                    next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Salarié supprimé' }); this.charger(); },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }
}
