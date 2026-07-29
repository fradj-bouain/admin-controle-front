import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { Controle, RapportControle } from '../models/controle.model';
import { ControleService } from '../services/controle.service';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';

@Component({
    selector: 'app-controle-list',
    templateUrl: './controle-list.component.html',
    providers: [MessageService]
})
export class ControleListComponent implements OnInit {

    chantiers: Chantier[] = [];
    chantierId: string | null = null;
    controles: Controle[] = [];
    rapports: RapportControle[] = [];

    constructor(
        private controleService: ControleService,
        private chantierService: ChantierService,
        private router: Router,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.chantierService.lister().subscribe((chantiers) => (this.chantiers = chantiers));
        this.chargerRapports();
    }

    onChantierChange() {
        if (this.chantierId) {
            this.controleService.lister(this.chantierId).subscribe((controles) => (this.controles = controles));
        }
    }

    nouveauControle() {
        if (!this.chantierId) {
            return;
        }
        this.router.navigate(['/controles/nouveau'], { queryParams: { chantierId: this.chantierId } });
    }

    ouvrirGenerationRapport(controle: Controle) {
        this.router.navigate(['/controles/rapports/nouveau'], {
            queryParams: { controleId: controle.id, dateControle: controle.dateControle }
        });
    }

    chargerRapports() {
        this.controleService.listerRapports().subscribe((rapports) => (this.rapports = rapports));
    }

    envoyerRapport(rapport: RapportControle) {
        this.controleService.envoyerRapport(rapport.id).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Rapport envoyé' });
                this.chargerRapports();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Envoi impossible' })
        });
    }
}
