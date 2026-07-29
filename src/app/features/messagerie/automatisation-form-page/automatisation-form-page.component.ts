import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { ChampSurveillable, CibleGroupe, DestinataireType } from '../models/message.model';
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

    // Servi par GET /champs-surveillables : ce que le backend sait réellement
    // détecter, pas une liste figée ici. Ajouter une nouvelle source surveillable
    // (nouvelle entité/champ) n'implique aucun changement de ce composant.
    champsSurveillables: ChampSurveillable[] = [];

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

    // Champ calculé explicitement (pas un getter) : un p-dropdown filtrable lié à
    // un getter qui renvoie un nouveau tableau à chaque cycle de détection de
    // changements entre en boucle infinie avec PrimeNG.
    destinatairesDisponibles: Array<{ id: string; label: string }> = [];

    form = this.fb.group({
        nom: ['', Validators.required],
        champSurveillableId: ['', Validators.required],
        nbJoursAvant: [3, [Validators.required, Validators.min(0)]],
        cibleGroupe: ['TOUS_CLIENTS' as CibleGroupe, Validators.required],
        destinataireType: ['UTILISATEUR' as DestinataireType],
        destinataireId: [''],
        sujet: ['', Validators.required],
        contenu: ['', Validators.required]
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

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.regleId = id;
            this.isNew = !id;
            if (id) {
                this.regleService.obtenir(id).subscribe((regle) => {
                    this.form.patchValue({
                        nom: regle.nom,
                        champSurveillableId: regle.champSurveillableId,
                        nbJoursAvant: regle.nbJoursAvant,
                        cibleGroupe: regle.cibleGroupe,
                        destinataireType: regle.destinataireType ?? 'UTILISATEUR',
                        destinataireId: regle.destinataireId ?? '',
                        sujet: regle.sujet,
                        contenu: regle.contenu
                    });
                });
            }
        });
    }

    get estSpecifique(): boolean {
        return this.form.value.cibleGroupe === 'SPECIFIQUE';
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
        this.router.navigate(['/messagerie/automatisation']);
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        const specifique = value.cibleGroupe === 'SPECIFIQUE';
        const payload = {
            nom: value.nom!,
            champSurveillableId: value.champSurveillableId!,
            nbJoursAvant: value.nbJoursAvant!,
            cibleGroupe: value.cibleGroupe!,
            destinataireType: specifique ? value.destinataireType! : null,
            destinataireId: specifique ? value.destinataireId! : null,
            sujet: value.sujet!,
            contenu: value.contenu!
        };
        this.saving = true;
        const obs = this.isNew ? this.regleService.creer(payload) : this.regleService.modifier(this.regleId!, payload);
        obs.subscribe({
            next: () => this.router.navigate(['/messagerie/automatisation']),
            error: () => {
                this.saving = false;
                this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Enregistrement impossible' });
            }
        });
    }
}
