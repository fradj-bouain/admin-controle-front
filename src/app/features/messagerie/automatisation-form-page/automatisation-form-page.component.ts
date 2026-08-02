import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { ChampSurveillable, CibleGroupe, DestinataireType, TypeDeclencheur } from '../models/message.model';
import { RegleAutomatisationService } from '../services/regle-automatisation.service';
import { ChampSurveillableService } from '../services/champ-surveillable.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Utilisateur } from 'src/app/features/configuration/models/configuration.model';

@Component({
    selector: 'app-automatisation-form-page',
    templateUrl: './automatisation-form-page.component.html',
    providers: [ToastService]
})
export class AutomatisationFormPageComponent implements OnInit {

    isNew = true;
    regleId: string | null = null;
    saving = false;
    loading = false;

    // Champs purement visuels (parité d'affichage avec le site legacy) : pas de
    // colonne backend correspondante, rien n'est envoyé au serveur pour eux.
    actifCosmetique = true;
    concerneUniquementClient = false;
    noteBasDePage = '';
    fichierModeleNom: string | null = null;

    // Servi par GET /champs-surveillables : ce que le backend sait réellement
    // détecter, pas une liste figée ici. Ajouter une nouvelle source surveillable
    // (nouvelle entité/champ) n'implique aucun changement de ce composant.
    champsSurveillables: ChampSurveillable[] = [];

    typesDeclencheur: Array<{ label: string; value: TypeDeclencheur }> = [
        { label: 'Champ surveillé (N jours avant une échéance)', value: 'CHAMP_SURVEILLABLE' },
        { label: "Création d'un salarié", value: 'CREATION_SALARIE' },
        { label: "Création d'une entreprise", value: 'CREATION_ENTREPRISE' },
        { label: "Affectation d'une entreprise à un chantier", value: 'AFFECTATION_ENTREPRISE_CHANTIER' },
        { label: 'Automatique (récurrence périodique)', value: 'PERIODIQUE' },
        { label: 'Manuellement', value: 'MANUEL' }
    ];

    ciblesGroupe = [
        { label: 'Tous les utilisateurs', value: 'TOUS_UTILISATEURS' },
        { label: 'Tous les clients', value: 'TOUS_CLIENTS' },
        { label: 'Toutes les entreprises', value: 'TOUTES_ENTREPRISES' },
        { label: 'Tous les salariés (via leur entreprise employeuse)', value: 'TOUS_SALARIES' },
        { label: 'Destinataire spécifique', value: 'SPECIFIQUE' }
    ];

    types: DestinataireType[] = ['CLIENT', 'ENTREPRISE', 'UTILISATEUR'];
    clients: Client[] = [];
    entreprises: Entreprise[] = [];
    utilisateurs: Utilisateur[] = [];

    // Champ calculé explicitement (pas un getter) : un p-dropdown filtrable lié à
    // un getter qui renvoie un nouveau tableau à chaque cycle de détection de
    // changements entre en boucle infinie avec PrimeNG.
    destinatairesDisponibles: Array<{ id: string; label: string }> = [];

    form = this.fb.group({
        nom: ['', Validators.required],
        typeDeclencheur: ['CHAMP_SURVEILLABLE' as TypeDeclencheur, Validators.required],
        champSurveillableId: ['', Validators.required],
        nbJoursAvant: [3, [Validators.required, Validators.min(0)]],
        cibleGroupe: ['TOUS_CLIENTS' as CibleGroupe, Validators.required],
        destinataireType: ['UTILISATEUR' as DestinataireType],
        destinataireId: [''],
        sujet: ['', Validators.required],
        contenu: ['', Validators.required],
        numeroInterne: [''],
        titreInterne: ['']
    });

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private regleService: RegleAutomatisationService,
        private champSurveillableService: ChampSurveillableService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private utilisateurService: UtilisateurService,
        private toast: ToastService
    ) { }

    ngOnInit(): void {
        this.champSurveillableService.lister().subscribe((champs) => {
            this.champsSurveillables = champs;
            if (!this.form.value.champSurveillableId && champs.length > 0) {
                this.form.patchValue({ champSurveillableId: champs[0].id });
            }
        });
        this.clientService.lister().subscribe((clients) => { this.clients = clients; this.recalculerDestinataires(); });
        this.entrepriseService.lister().subscribe((entreprises) => { this.entreprises = entreprises; this.recalculerDestinataires(); });
        this.utilisateurService.lister().subscribe((utilisateurs) => { this.utilisateurs = utilisateurs; this.recalculerDestinataires(); });
        this.form.controls.destinataireType.valueChanges.subscribe(() => this.recalculerDestinataires());
        this.form.controls.cibleGroupe.valueChanges.subscribe((cibleGroupe) => {
            this.majValidateurConditionnel(this.form.controls.destinataireId, cibleGroupe === 'SPECIFIQUE', Validators.required);
        });
        this.form.controls.typeDeclencheur.valueChanges.subscribe((type) => {
            this.majValidateurConditionnel(this.form.controls.champSurveillableId, type === 'CHAMP_SURVEILLABLE', Validators.required);
            this.majValidateurConditionnel(this.form.controls.nbJoursAvant, this.afficherNbJoursAvant, [Validators.required, Validators.min(0)], 0);
        });

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.regleId = id;
            this.isNew = !id;
            if (id) {
                this.loading = true;
                this.regleService.obtenir(id).subscribe({
                    next: (regle) => {
                        this.form.patchValue({
                            nom: regle.nom,
                            typeDeclencheur: regle.typeDeclencheur,
                            champSurveillableId: regle.champSurveillableId ?? '',
                            nbJoursAvant: regle.nbJoursAvant,
                            cibleGroupe: regle.cibleGroupe,
                            destinataireType: regle.destinataireType ?? 'UTILISATEUR',
                            destinataireId: regle.destinataireId ?? '',
                            sujet: regle.sujet,
                            contenu: regle.contenu,
                            numeroInterne: regle.numeroInterne ?? '',
                            titreInterne: regle.titreInterne ?? ''
                        });
                        this.loading = false;
                    },
                    error: () => this.loading = false
                });
            }
        });
    }

    get estSpecifique(): boolean {
        return this.form.value.cibleGroupe === 'SPECIFIQUE';
    }

    get estChampSurveillable(): boolean {
        return this.form.value.typeDeclencheur === 'CHAMP_SURVEILLABLE';
    }

    get estPeriodique(): boolean {
        return this.form.value.typeDeclencheur === 'PERIODIQUE';
    }

    get afficherNbJoursAvant(): boolean {
        return this.estChampSurveillable || this.estPeriodique;
    }

    get libelleNbJoursAvant(): string {
        return this.estPeriodique ? "Tous les combien de jours" : "Jours avant l'événement";
    }

    private majValidateurConditionnel(control: AbstractControl, requis: boolean, validateurs: ValidatorFn | ValidatorFn[], valeurSinon: unknown = '') {
        if (requis) {
            control.setValidators(validateurs);
        } else {
            control.clearValidators();
            control.setValue(valeurSinon);
        }
        control.updateValueAndValidity();
    }

    private recalculerDestinataires() {
        switch (this.form.value.destinataireType) {
            case 'CLIENT':
                this.destinatairesDisponibles = this.clients.map((c) => ({ id: c.id, label: c.raisonSociale }));
                break;
            case 'ENTREPRISE':
                this.destinatairesDisponibles = this.entreprises.map((e) => ({ id: e.id, label: e.raisonSociale }));
                break;
            default:
                this.destinatairesDisponibles = this.utilisateurs.map((u) => ({ id: u.id, label: u.username }));
        }
    }

    annuler() {
        this.router.navigate(['/messagerie'], { queryParams: { tab: 'automatisation' } });
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        const specifique = value.cibleGroupe === 'SPECIFIQUE';
        const champSurveillable = value.typeDeclencheur === 'CHAMP_SURVEILLABLE';
        const payload = {
            nom: value.nom!,
            typeDeclencheur: value.typeDeclencheur!,
            champSurveillableId: champSurveillable ? value.champSurveillableId! : null,
            nbJoursAvant: value.nbJoursAvant!,
            cibleGroupe: value.cibleGroupe!,
            destinataireType: specifique ? value.destinataireType! : null,
            destinataireId: specifique ? value.destinataireId! : null,
            sujet: value.sujet!,
            contenu: value.contenu!,
            numeroInterne: value.numeroInterne || null,
            titreInterne: value.titreInterne || null
        };
        this.saving = true;
        const obs = this.isNew ? this.regleService.creer(payload) : this.regleService.modifier(this.regleId!, payload);
        obs.subscribe({
            next: () => this.router.navigate(['/messagerie'], { queryParams: { tab: 'automatisation' } }),
            error: () => {
                this.saving = false;
                this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Enregistrement impossible' });
            }
        });
    }
}
