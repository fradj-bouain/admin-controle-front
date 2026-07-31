import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RegleAutomatisation } from '../models/message.model';
import { RegleAutomatisationService } from '../services/regle-automatisation.service';
import { ChampSurveillableService } from '../services/champ-surveillable.service';

@Component({
    selector: 'app-automatisation-list',
    templateUrl: './automatisation-list.component.html',
    providers: [ConfirmationService, MessageService]
})
export class AutomatisationListComponent implements OnInit {

    regles: RegleAutomatisation[] = [];
    loading = false;

    // Alimenté par GET /champs-surveillables (voir ChampSurveillableRegistry
    // côté backend) — plus une liste figée de 2 libellés ici.
    evenementLabels: Record<string, string> = {};

    cibleLabels: Record<string, string> = {
        SPECIFIQUE: 'Destinataire spécifique',
        TOUS_UTILISATEURS: 'Tous les utilisateurs',
        TOUS_CLIENTS: 'Tous les clients',
        TOUTES_ENTREPRISES: 'Toutes les entreprises',
        TOUS_SALARIES: 'Tous les salariés'
    };

    declencheurLabels: Record<string, string> = {
        CHAMP_SURVEILLABLE: 'Champ surveillé',
        CREATION_SALARIE: "Création d'un salarié",
        CREATION_ENTREPRISE: "Création d'une entreprise",
        AFFECTATION_ENTREPRISE_CHANTIER: 'Affectation entreprise-chantier',
        PERIODIQUE: 'Automatique (périodique)',
        MANUEL: 'Manuellement'
    };

    constructor(
        private regleService: RegleAutomatisationService,
        private champSurveillableService: ChampSurveillableService,
        private confirmation: ConfirmationService,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.champSurveillableService.lister().subscribe((champs) => {
            this.evenementLabels = Object.fromEntries(champs.map((c) => [c.id, `${c.entiteLibelle} — ${c.champLibelle}`]));
        });
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

    libelleDeclencheur(regle: RegleAutomatisation): string {
        if (regle.typeDeclencheur === 'CHAMP_SURVEILLABLE' && regle.champSurveillableId) {
            return this.evenementLabels[regle.champSurveillableId] ?? this.declencheurLabels[regle.typeDeclencheur];
        }
        return this.declencheurLabels[regle.typeDeclencheur] ?? regle.typeDeclencheur;
    }

    afficherDelai(regle: RegleAutomatisation): boolean {
        return regle.typeDeclencheur === 'CHAMP_SURVEILLABLE' || regle.typeDeclencheur === 'PERIODIQUE';
    }

    confirmerEnvoyerMaintenant(regle: RegleAutomatisation) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Envoyer immédiatement un message pour la règle "' + regle.nom + '" ?',
            accept: () => {
                this.regleService.envoyerMaintenant(regle.id).subscribe({
                    next: () => {
                        this.message.add({ severity: 'success', summary: 'Succès', detail: 'Envoi déclenché' });
                        this.charger();
                    },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Envoi impossible' })
                });
            }
        });
    }
}
