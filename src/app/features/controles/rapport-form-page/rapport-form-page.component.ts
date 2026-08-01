import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ControleService } from '../services/controle.service';
import { ControleSalarie } from '../models/controle.model';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';
import { Salarie } from 'src/app/features/salaries/models/salarie.model';
import { SalarieService } from 'src/app/features/salaries/services/salarie.service';
import { AffectationSalarieChantierService } from 'src/app/features/salaries/services/affectation-salarie-chantier.service';
import { AffectationSalarieChantier } from 'src/app/features/salaries/models/salarie.model';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { ActionCorrective, Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';

@Component({
    selector: 'app-rapport-form-page',
    templateUrl: './rapport-form-page.component.html',
    providers: [MessageService]
})
export class RapportFormPageComponent implements OnInit {

    saving = false;
    ajoutEnCours = false;
    entreeEnEdition: ControleSalarie | null = null;
    controleId!: string;
    dateControle: string | null = null;
    chantier: Chantier | null = null;

    affectations: AffectationSalarieChantier[] = [];
    salaries: Salarie[] = [];
    entreprises: Entreprise[] = [];
    actionsCorrectives: ActionCorrective[] = [];
    utilisateurs: Utilisateur[] = [];
    entrees: ControleSalarie[] = [];

    affectationsDisponibles: Array<{ id: string; label: string }> = [];
    motifsDisponibles: ActionCorrective[] = [];

    checklistForm = this.fb.group({
        affectationId: ['', Validators.required],
        accorde: [true],
        actionCorrectiveId: ['']
    });

    rapportForm = this.fb.group({
        nbNouvellesEntreprises: [0, Validators.min(0)],
        nbNouveauxSalaries: [0, Validators.min(0)],
        nbSalariesDetaches: [0, Validators.min(0)],
        responsableUtilisateurId: ['']
    });

    constructor(
        private fb: FormBuilder,
        private controleService: ControleService,
        private chantierService: ChantierService,
        private salarieService: SalarieService,
        private affectationService: AffectationSalarieChantierService,
        private entrepriseService: EntrepriseService,
        private referenceDataService: ReferenceDataService,
        private utilisateurService: UtilisateurService,
        private route: ActivatedRoute,
        private router: Router,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.controleId = this.route.snapshot.queryParamMap.get('controleId')!;
        this.dateControle = this.route.snapshot.queryParamMap.get('dateControle');

        this.referenceDataService.listerActionsCorrectives().subscribe((actions) => {
            this.actionsCorrectives = actions;
            this.motifsDisponibles = actions.filter((a) => a.cible !== 'ENTREPRISES');
        });
        this.utilisateurService.lister().subscribe((utilisateurs) => (this.utilisateurs = utilisateurs));
        this.entrepriseService.lister().subscribe((entreprises) => (this.entreprises = entreprises));
        this.salarieService.lister().subscribe((salaries) => {
            this.salaries = salaries;
            this.recalculerAffectationsDisponibles();
        });

        this.controleService.obtenir(this.controleId).subscribe((controle) => {
            this.chantierService.obtenir(controle.chantierId).subscribe((chantier) => (this.chantier = chantier));
            this.affectationService.lister(controle.chantierId).subscribe((affectations) => {
                this.affectations = affectations;
                this.recalculerAffectationsDisponibles();
            });
        });

        this.chargerEntrees();

        this.checklistForm.controls.accorde.valueChanges.subscribe((accorde) => {
            const control = this.checklistForm.controls.actionCorrectiveId;
            if (!accorde) {
                control.setValidators(Validators.required);
            } else {
                control.clearValidators();
                control.setValue('');
            }
            control.updateValueAndValidity();
        });
    }

    private chargerEntrees() {
        this.controleService.listerSalaries(this.controleId).subscribe((entrees) => {
            this.entrees = entrees;
            this.recalculerAffectationsDisponibles();
        });
    }

    private recalculerAffectationsDisponibles() {
        const dejaCoches = new Set(this.entrees.map((e) => e.salarieId));
        if (this.entreeEnEdition) {
            dejaCoches.delete(this.entreeEnEdition.salarieId);
        }
        this.affectationsDisponibles = this.affectations
            .filter((a) => !dejaCoches.has(a.salarieId))
            .map((a) => ({ id: a.id, label: `${this.nomSalarie(a.salarieId)} — ${this.nomEntreprise(a.entrepriseId)}` }));
    }

    nomSalarie(id: string): string {
        const s = this.salaries.find((x) => x.id === id);
        return s ? `${s.prenom} ${s.nom}` : id;
    }

    nomEntreprise(id?: string): string {
        return this.entreprises.find((e) => e.id === id)?.raisonSociale ?? '—';
    }

    libelleMotif(id?: string): string {
        if (!id) {
            return '—';
        }
        return this.actionsCorrectives.find((a) => a.id === id)?.nom ?? id;
    }

    get estRefus(): boolean {
        return this.checklistForm.value.accorde === false;
    }

    get modeEdition(): boolean {
        return this.entreeEnEdition !== null;
    }

    modifierEntree(entree: ControleSalarie) {
        this.entreeEnEdition = entree;
        const affectation = this.affectations.find((a) => a.salarieId === entree.salarieId);
        this.recalculerAffectationsDisponibles();
        this.checklistForm.setValue({
            affectationId: affectation?.id ?? '',
            accorde: entree.accorde,
            actionCorrectiveId: entree.actionCorrectiveId ?? ''
        });
    }

    annulerEditionEntree() {
        this.entreeEnEdition = null;
        this.checklistForm.reset({ affectationId: '', accorde: true, actionCorrectiveId: '' });
        this.recalculerAffectationsDisponibles();
    }

    ajouterEntree() {
        if (this.checklistForm.invalid) {
            this.checklistForm.markAllAsTouched();
            return;
        }
        const value = this.checklistForm.getRawValue();

        if (this.entreeEnEdition) {
            this.ajoutEnCours = true;
            this.controleService.modifierSalarie(this.controleId, this.entreeEnEdition.id, {
                accorde: value.accorde!,
                actionCorrectiveId: value.accorde ? undefined : (value.actionCorrectiveId || undefined)
            }).subscribe({
                next: () => {
                    this.ajoutEnCours = false;
                    this.entreeEnEdition = null;
                    this.checklistForm.reset({ affectationId: '', accorde: true, actionCorrectiveId: '' });
                    this.chargerEntrees();
                },
                error: () => {
                    this.ajoutEnCours = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' });
                }
            });
            return;
        }

        const affectation = this.affectations.find((a) => a.id === value.affectationId);
        if (!affectation || !affectation.entrepriseId) {
            return;
        }
        this.ajoutEnCours = true;
        this.controleService.ajouterSalarie(this.controleId, {
            salarieId: affectation.salarieId,
            entrepriseId: affectation.entrepriseId,
            accorde: value.accorde!,
            actionCorrectiveId: value.accorde ? undefined : (value.actionCorrectiveId || undefined)
        }).subscribe({
            next: () => {
                this.ajoutEnCours = false;
                this.checklistForm.reset({ affectationId: '', accorde: true, actionCorrectiveId: '' });
                this.chargerEntrees();
            },
            error: () => {
                this.ajoutEnCours = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Ajout impossible' });
            }
        });
    }

    supprimerEntree(entree: ControleSalarie) {
        this.controleService.supprimerSalarie(this.controleId, entree.id).subscribe({
            next: () => this.chargerEntrees(),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
        });
    }

    annuler() {
        this.router.navigate(['/controles']);
    }

    submit() {
        if (this.rapportForm.invalid) {
            this.rapportForm.markAllAsTouched();
            return;
        }
        if (this.entrees.length === 0) {
            this.message.add({ severity: 'warn', summary: 'Checklist vide', detail: 'Ajoutez au moins un salarié à la checklist avant de générer le rapport.' });
            return;
        }
        const value = this.rapportForm.getRawValue();
        this.saving = true;
        this.controleService.genererRapport({
            controleId: this.controleId,
            nbNouvellesEntreprises: value.nbNouvellesEntreprises ?? 0,
            nbNouveauxSalaries: value.nbNouveauxSalaries ?? 0,
            nbSalariesDetaches: value.nbSalariesDetaches ?? 0,
            responsableUtilisateurId: value.responsableUtilisateurId || undefined
        }).subscribe({
            next: (rapport) => this.router.navigate(['/controles/rapports', rapport.id]),
            error: () => {
                this.saving = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Génération impossible' });
            }
        });
    }
}
