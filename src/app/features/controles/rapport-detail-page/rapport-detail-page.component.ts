import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ControleService } from '../services/controle.service';
import { ControleSalarie, RapportControle } from '../models/controle.model';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';
import { Salarie } from 'src/app/features/salaries/models/salarie.model';
import { SalarieService } from 'src/app/features/salaries/services/salarie.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { ActionCorrective, Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-rapport-detail-page',
    templateUrl: './rapport-detail-page.component.html',
    providers: [MessageService, ConfirmationService]
})
export class RapportDetailPageComponent implements OnInit {

    rapportId!: string;
    rapport: RapportControle | null = null;
    chantier: Chantier | null = null;
    loading = true;
    autresRapports: RapportControle[] = [];
    entrees: ControleSalarie[] = [];

    salaries: Salarie[] = [];
    entreprises: Entreprise[] = [];
    actionsCorrectives: ActionCorrective[] = [];
    utilisateurs: Utilisateur[] = [];

    edition = false;
    envoiEnCours = false;

    form = this.fb.group({
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
        private entrepriseService: EntrepriseService,
        private referenceDataService: ReferenceDataService,
        private utilisateurService: UtilisateurService,
        private route: ActivatedRoute,
        private router: Router,
        private message: MessageService,
        private confirmation: ConfirmationService,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    ngOnInit(): void {
        this.rapportId = this.route.snapshot.paramMap.get('id')!;
        this.salarieService.lister().subscribe((salaries) => (this.salaries = salaries));
        this.entrepriseService.lister().subscribe((entreprises) => (this.entreprises = entreprises));
        this.referenceDataService.listerActionsCorrectives().subscribe((actions) => (this.actionsCorrectives = actions));
        this.utilisateurService.lister().subscribe((utilisateurs) => (this.utilisateurs = utilisateurs));
        this.charger();
    }

    private charger() {
        this.controleService.obtenirRapport(this.rapportId).subscribe({
            next: (rapport) => {
                this.rapport = rapport;
                this.form.patchValue({
                    nbNouvellesEntreprises: rapport.nbNouvellesEntreprises,
                    nbNouveauxSalaries: rapport.nbNouveauxSalaries,
                    nbSalariesDetaches: rapport.nbSalariesDetaches,
                    responsableUtilisateurId: rapport.responsableUtilisateurId ?? ''
                });
                this.chantierService.obtenir(rapport.chantierId).subscribe((chantier) => (this.chantier = chantier));
                this.controleService.listerSalaries(rapport.controleId).subscribe((entrees) => (this.entrees = entrees));
                this.controleService.listerRapports(rapport.chantierId).subscribe((rapports) => {
                    this.autresRapports = rapports.filter((r) => r.id !== rapport.id);
                });
                this.loading = false;
            },
            error: () => this.loading = false
        });
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

    nomResponsable(id?: string): string {
        return this.utilisateurs.find((u) => u.id === id)?.username ?? '—';
    }

    retour() {
        this.router.navigate(['/controles']);
    }

    imprimer() {
        window.print();
    }

    ouvrirEdition() {
        this.edition = true;
    }

    annulerEdition() {
        this.edition = false;
        if (this.rapport) {
            this.form.patchValue({
                nbNouvellesEntreprises: this.rapport.nbNouvellesEntreprises,
                nbNouveauxSalaries: this.rapport.nbNouveauxSalaries,
                nbSalariesDetaches: this.rapport.nbSalariesDetaches,
                responsableUtilisateurId: this.rapport.responsableUtilisateurId ?? ''
            });
        }
    }

    enregistrerEdition() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        this.controleService.modifierRapport(this.rapportId, {
            nbNouvellesEntreprises: value.nbNouvellesEntreprises ?? 0,
            nbNouveauxSalaries: value.nbNouveauxSalaries ?? 0,
            nbSalariesDetaches: value.nbSalariesDetaches ?? 0,
            responsableUtilisateurId: value.responsableUtilisateurId || undefined
        }).subscribe({
            next: (rapport) => {
                this.rapport = rapport;
                this.edition = false;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Rapport modifié' });
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
        });
    }

    confirmerSuppression() {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous supprimer ce rapport ?',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.controleService.supprimerRapport(this.rapportId).subscribe({
                    next: () => {
                        this.message.add({ severity: 'success', summary: 'Succès', detail: 'Rapport supprimé' });
                        this.router.navigate(['/controles']);
                    },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }

    confirmerRenvoiEmail() {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: "Renvoyer ce rapport par email au client de ce chantier ?",
            accept: () => {
                this.envoiEnCours = true;
                this.controleService.renvoyerRapportParEmail(this.rapportId).subscribe({
                    next: () => {
                        this.envoiEnCours = false;
                        this.message.add({ severity: 'success', summary: 'Succès', detail: 'Rapport envoyé par email' });
                        this.charger();
                    },
                    error: (err) => {
                        this.envoiEnCours = false;
                        this.message.add({
                            severity: 'error', summary: 'Erreur',
                            detail: err?.error?.message ?? 'Envoi impossible'
                        });
                    }
                });
            }
        });
    }
}
