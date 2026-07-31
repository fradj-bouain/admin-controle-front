import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { CibleGroupe, DestinataireType } from '../models/message.model';
import { MessagePlanifieService } from '../services/message-planifie.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Utilisateur } from 'src/app/features/configuration/models/configuration.model';

@Component({
    selector: 'app-planification-form-page',
    templateUrl: './planification-form-page.component.html',
    providers: [ToastService]
})
export class PlanificationFormPageComponent implements OnInit {

    saving = false;

    ciblesGroupe = [
        { label: 'Tous les utilisateurs', value: 'TOUS_UTILISATEURS' },
        { label: 'Tous les clients', value: 'TOUS_CLIENTS' },
        { label: 'Toutes les entreprises', value: 'TOUTES_ENTREPRISES' },
        { label: 'Destinataire spécifique', value: 'SPECIFIQUE' }
    ];

    types: DestinataireType[] = ['CLIENT', 'ENTREPRISE', 'UTILISATEUR'];
    clients: Client[] = [];
    entreprises: Entreprise[] = [];
    utilisateurs: Utilisateur[] = [];
    destinatairesDisponibles: Array<{ id: string; label: string }> = [];

    form = this.fb.group({
        cibleGroupe: ['TOUS_CLIENTS' as CibleGroupe, Validators.required],
        destinataireType: ['UTILISATEUR' as DestinataireType],
        destinataireId: [''],
        sujet: ['', Validators.required],
        contenu: ['', Validators.required],
        dateEnvoiPrevue: [null as Date | null, Validators.required]
    });

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private planifieService: MessagePlanifieService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private utilisateurService: UtilisateurService,
        private toast: ToastService
    ) { }

    ngOnInit(): void {
        this.clientService.lister().subscribe((clients) => { this.clients = clients; this.recalculerDestinataires(); });
        this.entrepriseService.lister().subscribe((entreprises) => { this.entreprises = entreprises; this.recalculerDestinataires(); });
        this.utilisateurService.lister().subscribe((utilisateurs) => { this.utilisateurs = utilisateurs; this.recalculerDestinataires(); });
        this.form.controls.destinataireType.valueChanges.subscribe(() => this.recalculerDestinataires());
        this.form.controls.cibleGroupe.valueChanges.subscribe((cibleGroupe) => {
            this.majValidateurConditionnel(this.form.controls.destinataireId, cibleGroupe === 'SPECIFIQUE');
        });
    }

    get estSpecifique(): boolean {
        return this.form.value.cibleGroupe === 'SPECIFIQUE';
    }

    private majValidateurConditionnel(control: AbstractControl, requis: boolean) {
        if (requis) {
            control.setValidators(Validators.required);
        } else {
            control.clearValidators();
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
        this.router.navigate(['/messagerie'], { queryParams: { tab: 'planification' } });
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        const specifique = value.cibleGroupe === 'SPECIFIQUE';
        this.saving = true;
        this.planifieService.planifier({
            cibleGroupe: value.cibleGroupe!,
            destinataireType: specifique ? value.destinataireType! : null,
            destinataireId: specifique ? value.destinataireId! : null,
            chantierId: null,
            sujet: value.sujet!,
            contenu: value.contenu!,
            dateEnvoiPrevue: value.dateEnvoiPrevue!.toISOString()
        }).subscribe({
            next: () => this.router.navigate(['/messagerie'], { queryParams: { tab: 'planification' } }),
            error: () => {
                this.saving = false;
                this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Planification impossible' });
            }
        });
    }
}
