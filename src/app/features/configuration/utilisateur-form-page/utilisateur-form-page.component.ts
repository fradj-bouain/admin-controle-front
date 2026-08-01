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
        controleTiersId: ['']
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

        const clientId = this.route.snapshot.queryParamMap.get('clientId');
        if (clientId) {
            this.form.patchValue({ clientId, roles: ['CLIENT'] });
        }

        this.form.controls.roles.valueChanges.subscribe((roles) => {
            this.majValidateurConditionnel(this.form.controls.entrepriseId, (roles ?? []).includes('ENTREPRISE'));
            this.majValidateurConditionnel(this.form.controls.clientId, (roles ?? []).includes('CLIENT'));
            this.majValidateurConditionnel(this.form.controls.controleTiersId, (roles ?? []).includes('CONTROLEUR'));
        });
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
        this.utilisateurService.creer({
            nom: value.nom!,
            prenom: value.prenom!,
            email: value.email!,
            username: value.username!,
            password: value.password!,
            roles: value.roles!,
            entrepriseId: value.entrepriseId || undefined,
            clientId: value.clientId || undefined,
            controleTiersId: value.controleTiersId || undefined
        }).subscribe({
            next: () => this.router.navigate(['/configuration']),
            error: () => {
                this.saving = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
            }
        });
    }
}
