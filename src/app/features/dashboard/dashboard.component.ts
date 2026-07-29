import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChantierService } from '../chantiers/services/chantier.service';
import { EntrepriseService } from '../entreprises/services/entreprise.service';
import { SalarieService } from '../salaries/services/salarie.service';
import { ReferenceDataService } from '../configuration/services/reference-data.service';

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

    statChantiers: EtatEntite | null = null;
    statEntreprises: EtatEntite | null = null;
    statSalaries: EtatEntite | null = null;

    chartEtatParc: any;
    chartTypesContrat: any;
    chartOptions: any;

    constructor(
        private chantierService: ChantierService,
        private entrepriseService: EntrepriseService,
        private salarieService: SalarieService,
        private referenceDataService: ReferenceDataService
    ) { }

    ngOnInit(): void {
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
