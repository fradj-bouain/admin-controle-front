import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { UtilisateurService } from '../services/utilisateur.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { ControleTiers } from '../models/configuration.model';
import { ReferenceDataService } from '../services/reference-data.service';

@Component({
    selector: 'app-utilisateur-form-page',
    templateUrl: './utilisateur-form-page.component.html',
    providers: [MessageService]
})
export class UtilisateurFormPageComponent implements OnInit {

    saving = false;
    loading = false;
    // Pas de GET /utilisateurs/{id} côté backend (seul un listing existe) : en édition,
    // l'utilisateur visé est retrouvé dans la liste complète déjà appelée par
    // ailleurs (Configuration) — un aller-retour de plus, mais pas de nouvel endpoint
    // pour un cas d'usage aussi ponctuel.
    isNew = true;
    utilisateurId: string | null = null;
    roles = ['SUPER_ADMIN', 'CLIENT', 'ENTREPRISE', 'CONTROLEUR'];
    clients: Client[] = [];
    entreprises: Entreprise[] = [];
    controleTiersListe: ControleTiers[] = [];

    form = this.fb.group({
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        username: ['', Validators.required],
        password: ['', Validators.required],
        roles: [[] as string[], Validators.required],
        entrepriseId: [''],
        clientId: [''],
        controleTiersId: [''],
        // Uniquement pertinent pour un rôle CLIENT (voir template) : true = "accès
        // total" à tous les chantiers du client, false = "responsable de chantier"
        // cantonné aux chantiers qui lui seront assignés. Décision réservée au
        // SUPER_ADMIN, jamais proposée en auto-gestion (Mon équipe).
        accesTousChantiers: [false]
    });

    constructor(
        private fb: FormBuilder,
        private utilisateurService: UtilisateurService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private referenceDataService: ReferenceDataService,
        private route: ActivatedRoute,
        private router: Router,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.clientService.lister().subscribe((clients) => (this.clients = clients));
        this.entrepriseService.lister().subscribe((entreprises) => (this.entreprises = entreprises));
        this.referenceDataService.listerControleTiers().subscribe((controleTiersListe) => (this.controleTiersListe = controleTiersListe));

        this.form.controls.roles.valueChanges.subscribe((roles) => {
            this.majValidateurConditionnel(this.form.controls.entrepriseId, (roles ?? []).includes('ENTREPRISE'));
            this.majValidateurConditionnel(this.form.controls.clientId, (roles ?? []).includes('CLIENT'));
            this.majValidateurConditionnel(this.form.controls.controleTiersId, (roles ?? []).includes('CONTROLEUR'));
        });

        const id = this.route.snapshot.paramMap.get('id');
        this.utilisateurId = id;
        this.isNew = !id;

        if (id) {
            // Édition : rôle et rattachement (client/entreprise/organisme) restent affichés
            // pour le contexte mais non modifiables — UtilisateurService.modifier ne les
            // prend pas en paramètre (changer le rôle d'un compte après coup a des
            // implications non gérées ici : assignations chantier, historique, etc.).
            this.form.controls.roles.disable();
            this.form.controls.entrepriseId.disable();
            this.form.controls.clientId.disable();
            this.form.controls.controleTiersId.disable();
            this.form.controls.password.clearValidators();
            this.form.controls.password.updateValueAndValidity();

            this.loading = true;
            this.utilisateurService.lister().subscribe({
                next: (utilisateurs) => {
                    const utilisateur = utilisateurs.find((u) => u.id === id);
                    this.loading = false;
                    if (!utilisateur) {
                        this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Utilisateur introuvable' });
                        this.router.navigate(['/configuration']);
                        return;
                    }
                    this.form.patchValue({
                        nom: utilisateur.nom,
                        prenom: utilisateur.prenom,
                        email: utilisateur.email,
                        username: utilisateur.username,
                        roles: utilisateur.roles,
                        entrepriseId: utilisateur.entrepriseId ?? '',
                        clientId: utilisateur.clientId ?? '',
                        controleTiersId: utilisateur.controleTiersId ?? '',
                        accesTousChantiers: !!utilisateur.accesTousChantiers
                    });
                },
                error: () => (this.loading = false)
            });
            return;
        }

        const clientId = this.route.snapshot.queryParamMap.get('clientId');
        if (clientId) {
            this.form.patchValue({ clientId, roles: ['CLIENT'] });
        }
    }

    private majValidateurConditionnel(control: AbstractControl, requis: boolean) {
        if (requis) {
            control.setValidators(Validators.required);
        } else {
            control.clearValidators();
            control.setValue('');
        }
        control.updateValueAndValidity();
    }

    annuler() {
        this.router.navigate(['/configuration']);
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        this.saving = true;

        if (!this.isNew && this.utilisateurId) {
            this.utilisateurService.modifier(this.utilisateurId, {
                nom: value.nom!,
                prenom: value.prenom!,
                email: value.email!,
                username: value.username!,
                password: value.password || undefined,
                accesTousChantiers: (value.roles ?? []).includes('CLIENT') ? !!value.accesTousChantiers : undefined
            }).subscribe({
                next: () => {
                    this.message.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur modifié' });
                    this.router.navigate(['/configuration']);
                },
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' });
                }
            });
            return;
        }

        this.utilisateurService.creer({
            nom: value.nom!,
            prenom: value.prenom!,
            email: value.email!,
            username: value.username!,
            password: value.password!,
            roles: value.roles!,
            entrepriseId: value.entrepriseId || undefined,
            clientId: value.clientId || undefined,
            controleTiersId: value.controleTiersId || undefined,
            accesTousChantiers: (value.roles ?? []).includes('CLIENT') ? !!value.accesTousChantiers : undefined
        }).subscribe({
            next: () => this.router.navigate(['/configuration']),
            error: () => {
                this.saving = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
            }
        });
    }
}
