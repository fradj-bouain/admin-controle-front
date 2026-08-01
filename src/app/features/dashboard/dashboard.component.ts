import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChantierService } from '../chantiers/services/chantier.service';
import { EntrepriseService } from '../entreprises/services/entreprise.service';
import { SalarieService } from '../salaries/services/salarie.service';
import { ReferenceDataService } from '../configuration/services/reference-data.service';
import { ControleService } from '../controles/services/controle.service';
import { DocumentEnAttente } from '../documents/models/document.model';
import { DocumentService } from '../documents/services/document.service';
import { AuthService } from 'src/app/core/auth/auth.service';

interface EtatEntite {
    total: number;
    actifs: number;
    inactifs: number;
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

    chargement = true;

    // Un compte Contrôleur n'a pas de périmètre sur chantiers/entreprises/salariés
    // (volontairement inchangé) — son dashboard montre ses contrôles/rapports à la
    // place, plutôt que des chiffres qui ne le concernent pas.
    estControleur = false;

    statChantiers: EtatEntite | null = null;
    statEntreprises: EtatEntite | null = null;
    statSalaries: EtatEntite | null = null;

    statControles: EtatEntite | null = null;
    statRapports: EtatEntite | null = null;

    chartEtatParc: any;
    chartTypesContrat: any;
    chartOptions: any;

    // Visible uniquement pour le compte interne (SUPER_ADMIN) : un compte
    // Entreprise/Client/Contrôleur n'a pas accès à GET /documents/en-attente.
    peutVoirDocumentsEnAttente = false;
    documentsEnAttente: DocumentEnAttente[] = [];

    constructor(
        private chantierService: ChantierService,
        private entrepriseService: EntrepriseService,
        private salarieService: SalarieService,
        private referenceDataService: ReferenceDataService,
        private controleService: ControleService,
        private documentService: DocumentService,
        private auth: AuthService
    ) { }

    ngOnInit(): void {
        this.peutVoirDocumentsEnAttente = this.auth.hasRole('SUPER_ADMIN');
        if (this.peutVoirDocumentsEnAttente) {
            this.documentService.listerEnAttente().subscribe((documents) => (this.documentsEnAttente = documents));
        }

        this.estControleur = this.auth.hasRole('CONTROLEUR');

        const style = getComputedStyle(document.documentElement);
        const texteSecondaire = style.getPropertyValue('--text-color-secondary') || '#6b7280';
        const bordure = style.getPropertyValue('--surface-border') || '#e5e7eb';

        this.chartOptions = {
            plugins: {
                legend: { labels: { color: texteSecondaire } }
            },
            scales: {
                x: { ticks: { color: texteSecondaire }, grid: { color: 'transparent' } },
                y: { ticks: { color: texteSecondaire, precision: 0 }, grid: { color: bordure }, beginAtZero: true }
            }
        };

        if (this.estControleur) {
            this.chargerDashboardControleur();
        } else {
            this.chargerDashboardStandard();
        }
    }

    private chargerDashboardControleur(): void {
        forkJoin({
            controles: this.controleService.lister(),
            rapports: this.controleService.listerRapports()
        }).subscribe({
            next: ({ controles, rapports }) => {
                this.statControles = this.calculerEtat(controles, (c) => c.termine);
                this.statRapports = this.calculerEtat(rapports, (r) => !!r.dateEnvoi);
                this.chargement = false;
            },
            error: () => (this.chargement = false)
        });
    }

    private chargerDashboardStandard(): void {
        forkJoin({
            chantiers: this.chantierService.lister(),
            entreprises: this.entrepriseService.lister(),
            salaries: this.salarieService.lister(),
            typesContrat: this.referenceDataService.listerTypeContratSalarie()
        }).subscribe({
            next: ({ chantiers, entreprises, salaries, typesContrat }) => {
                this.statChantiers = this.calculerEtat(chantiers, (c) => c.statut === 'ACTIF');
                this.statEntreprises = this.calculerEtat(entreprises, (e) => e.actif);
                this.statSalaries = this.calculerEtat(salaries, (s) => s.statut === 'ACTIF');

                this.chartEtatParc = {
                    labels: ['Chantiers', 'Entreprises', 'Salariés'],
                    datasets: [
                        {
                            label: 'Actifs',
                            backgroundColor: '#22c55e',
                            borderRadius: 4,
                            data: [this.statChantiers.actifs, this.statEntreprises.actifs, this.statSalaries.actifs]
                        },
                        {
                            label: 'Inactifs',
                            backgroundColor: '#ef4444',
                            borderRadius: 4,
                            data: [this.statChantiers.inactifs, this.statEntreprises.inactifs, this.statSalaries.inactifs]
                        }
                    ]
                };

                this.chartTypesContrat = {
                    labels: typesContrat.map((t) => t.libelle),
                    datasets: [
                        {
                            label: 'Salariés',
                            backgroundColor: '#3b82f6',
                            borderRadius: 4,
                            data: typesContrat.map((t) => salaries.filter((s) => s.typeContratId === t.id).length)
                        }
                    ]
                };

                this.chargement = false;
            },
            error: () => (this.chargement = false)
        });
    }

    private calculerEtat<T>(items: T[], estActif: (item: T) => boolean): EtatEntite {
        const actifs = items.filter(estActif).length;
        return { total: items.length, actifs, inactifs: items.length - actifs };
    }
}
