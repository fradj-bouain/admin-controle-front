import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Client } from '../models/client.model';
import { ClientService } from '../services/client.service';
import { Pays, Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';

@Component({
    selector: 'app-client-detail',
    templateUrl: './client-detail.component.html',
    providers: [MessageService, ConfirmationService]
})
export class ClientDetailComponent implements OnInit {

    isNew = true;
    saving = false;
    clientId: string | null = null;
    client: Client | null = null;

    pays: Pays[] = [];
    utilisateurs: Utilisateur[] = [];
    chantiers: Chantier[] = [];
    afficherChantiers = false;

    coordonneesForm = this.fb.group({
        raisonSociale: ['', Validators.required],
        adresse: [''],
        adresse2: [''],
        adresse3: [''],
        ville: [''],
        paysId: [''],
        telephone: [''],
        telephone2: [''],
        telephone3: [''],
        email: ['', Validators.email],
        siren: [''],
        siret: [''],
        rcsRci: [''],
        tvaIntra: [''],
        numCotisant: [''],
        responsableSignataireAgrement: ['']
    });

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private clientService: ClientService,
        private referenceDataService: ReferenceDataService,
        private utilisateurService: UtilisateurService,
        private chantierService: ChantierService,
        private confirmation: ConfirmationService,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.referenceDataService.listerPays().subscribe((pays) => (this.pays = pays));

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.clientId = id;
            this.isNew = !id;
            if (id) {
                this.chargerClient(id);
                this.chargerUtilisateurs(id);
                this.chargerChantiers(id);
            }
        });
    }

    private chargerClient(id: string) {
        this.clientService.obtenir(id).subscribe((c) => {
            this.client = c;
            this.coordonneesForm.patchValue(c);
        });
    }

    private chargerUtilisateurs(clientId: string) {
        this.utilisateurService.lister().subscribe((utilisateurs) => {
            this.utilisateurs = utilisateurs.filter((u) => u.clientId === clientId);
        });
    }

    private chargerChantiers(clientId: string) {
        this.chantierService.lister(clientId).subscribe((chantiers) => (this.chantiers = chantiers));
    }

    submitCoordonnees() {
        if (this.coordonneesForm.invalid) {
            this.coordonneesForm.markAllAsTouched();
            return;
        }
        const value = this.coordonneesForm.getRawValue();
        const payload = {
            raisonSociale: value.raisonSociale!,
            adresse: value.adresse ?? undefined,
            adresse2: value.adresse2 ?? undefined,
            adresse3: value.adresse3 ?? undefined,
            ville: value.ville ?? undefined,
            paysId: value.paysId ?? undefined,
            telephone: value.telephone ?? undefined,
            telephone2: value.telephone2 ?? undefined,
            telephone3: value.telephone3 ?? undefined,
            email: value.email ?? undefined,
            siren: value.siren ?? undefined,
            siret: value.siret ?? undefined,
            rcsRci: value.rcsRci ?? undefined,
            tvaIntra: value.tvaIntra ?? undefined,
            numCotisant: value.numCotisant ?? undefined,
            responsableSignataireAgrement: value.responsableSignataireAgrement ?? undefined
        };
        this.saving = true;
        if (this.isNew) {
            this.clientService.creer(payload).subscribe({
                next: (client) => this.router.navigate(['/clients', client.id]),
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
                }
            });
        } else {
            this.clientService.modifier(this.clientId!, payload).subscribe({
                next: (client) => {
                    this.saving = false;
                    this.client = client;
                    this.message.add({ severity: 'success', summary: 'Succès', detail: 'Client modifié' });
                },
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' });
                }
            });
        }
    }

    confirmerBasculeStatut() {
        if (!this.client) {
            return;
        }
        const client = this.client;
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (client.actif ? 'désactiver' : 'activer') + ' ce client ?',
            accept: () => {
                const obs = client.actif
                    ? this.clientService.desactiver(client.id)
                    : this.clientService.activer(client.id);
                obs.subscribe({
                    next: (c) => (this.client = c),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    retour() {
        this.router.navigate(['/clients']);
    }
}
