import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { Salarie } from '../models/salarie.model';
import { SalarieService } from '../services/salarie.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { AuthService } from 'src/app/core/auth/auth.service';

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
    afficherFiltresAvances = false;
    menuItems: MenuItem[] = [];

    dialogQrCodeVisible = false;
    salarieSelectionne: Salarie | null = null;

    constructor(
        private salarieService: SalarieService,
        private entrepriseService: EntrepriseService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    get isEntreprise(): boolean {
        return this.auth.hasRole('ENTREPRISE');
    }

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

    construireMenu(salarie: Salarie): MenuItem[] {
        const items: MenuItem[] = [
            { label: 'Modifier', icon: 'pi pi-pencil', routerLink: ['/salaries', salarie.id] }
        ];
        if (this.isSuperAdmin || this.isEntreprise) {
            items.push(
                {
                    label: salarie.statut === 'ACTIF' ? 'Désactiver' : 'Activer',
                    icon: salarie.statut === 'ACTIF' ? 'pi pi-ban' : 'pi pi-check',
                    command: () => this.confirmerBasculeStatut(salarie)
                },
                { separator: true },
                {
                    label: 'Supprimer',
                    icon: 'pi pi-trash',
                    styleClass: 'text-red-600',
                    command: () => this.confirmerSuppression(salarie)
                }
            );
        }
        return items;
    }
}
