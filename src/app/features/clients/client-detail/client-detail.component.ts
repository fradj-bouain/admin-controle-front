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
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-client-detail',
    templateUrl: './client-detail.component.html',
    providers: [MessageService, ConfirmationService]
})
export class ClientDetailComponent implements OnInit {

    isNew = true;
    saving = false;
    loading = false;
    clientId: string | null = null;
    client: Client | null = null;

    pays: Pays[] = [];
    utilisateurs: Utilisateur[] = [];
    chantiers: Chantier[] = [];
    afficherChantiers = false;

    coordonneesForm = this.fb.group({
        raisonSociale: ['', Validators.required],
        adresse: ['', Validators.required],
        adresse2: [''],
        adresse3: [''],
        ville: ['', Validators.required],
        paysId: ['', Validators.required],
        telephone: ['', Validators.required],
        telephone2: [''],
        telephone3: [''],
        email: ['', Validators.email],
        siren: ['', Validators.required],
        siret: ['', Validators.required],
        rcsRci: ['', Validators.required],
        tvaIntra: [''],
        numCotisant: [''],
        responsableSignataireAgrement: ['']
    });

    // --- Compte utilisateur créé en même temps que le client (gain de temps :
    // plus besoin d'un aller-retour par Configuration > Utilisateurs) ---
    creerCompteUtilisateur = false;
    compteForm = this.fb.group({
        prenom: ['', Validators.required],
        nom: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        username: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]]
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
        private message: MessageService,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    get isEntreprise(): boolean {
        return this.auth.hasRole('ENTREPRISE');
    }

    get isClient(): boolean {
        return this.auth.hasRole('CLIENT');
    }

    // Compte connecté, pour retrouver son propre statut d'accès dans "Mon équipe" (voir
    // moiAccesTousChantiers) et lui afficher "(vous)" dans la liste.
    get monCompte(): Utilisateur | undefined {
        return this.utilisateurs.find((u) => u.id === this.auth.userId);
    }

    get moiAccesTousChantiers(): boolean {
        return !!this.monCompte?.accesTousChantiers;
    }

    // Les 5 premiers suffisent pour cette carte teaser — "Gérer mon équipe" mène à la
    // liste complète (voir MonEquipeComponent), pas de pagination à dupliquer ici.
    get equipeApercu(): Utilisateur[] {
        return this.utilisateurs.slice(0, 5);
    }

    get chantiersApercu(): Chantier[] {
        return this.chantiers.slice(0, 5);
    }

    initialesUtilisateur(u: Utilisateur): string {
        const p = (u.prenom || '').trim();
        const n = (u.nom || '').trim();
        if (!p && !n) {
            return '?';
        }
        return ((p[0] ?? '') + (n[0] ?? '')).toUpperCase() || '?';
    }

    nomPays(id?: string): string {
        return this.pays.find((p) => p.id === id)?.nom ?? '—';
    }

    get clientInitiales(): string {
        const mots = (this.client?.raisonSociale ?? '').trim().split(/\s+/).filter(Boolean);
        if (mots.length === 0) {
            return '?';
        }
        return mots.length === 1 ? mots[0].slice(0, 2).toUpperCase() : (mots[0][0] + mots[1][0]).toUpperCase();
    }

    ngOnInit(): void {
        this.referenceDataService.listerPays().subscribe((pays) => (this.pays = pays));

        // Un compte Entreprise ne peut que consulter cette fiche (le backend refuse de
        // toute façon POST/PUT/activer/désactiver côté API) — formulaire verrouillé
        // pour ne pas laisser croire qu'une saisie pourrait être enregistrée.
        if (!this.isSuperAdmin) {
            this.coordonneesForm.disable();
        }

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.clientId = id;
            this.isNew = !id;
            if (id) {
                this.loading = true;
                this.chargerClient(id);
                this.chargerUtilisateurs(id);
                this.chargerChantiers(id);
            }
        });
    }

    private chargerClient(id: string) {
        this.clientService.obtenir(id).subscribe({
            next: (c) => {
                this.client = c;
                this.coordonneesForm.patchValue(c);
                this.loading = false;
            },
            error: () => this.loading = false
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
        if (this.isNew && this.creerCompteUtilisateur && this.compteForm.invalid) {
            this.compteForm.markAllAsTouched();
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
                next: (client) => this.finaliserCreationClient(client.id),
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

    private finaliserCreationClient(clientId: string) {
        if (!this.creerCompteUtilisateur) {
            this.router.navigate(['/clients', clientId]);
            return;
        }
        const compte = this.compteForm.getRawValue();
        this.utilisateurService.creer({
            nom: compte.nom!,
            prenom: compte.prenom!,
            email: compte.email!,
            username: compte.username!,
            password: compte.password!,
            roles: ['CLIENT'],
            clientId,
            // Ce compte est créé en même temps que la fiche Client : c'est son compte
            // fondateur, il voit donc tous les chantiers du client par défaut. Les
            // comptes ajoutés ensuite via "Mon équipe" restent "responsable de chantier"
            // (voir MonEquipeComponent, qui ne propose volontairement pas ce réglage).
            accesTousChantiers: true
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Client et compte utilisateur créés' });
                this.router.navigate(['/clients', clientId]);
            },
            error: () => {
                this.message.add({
                    severity: 'warn', summary: 'Client créé',
                    detail: "Le compte utilisateur n'a pas pu être créé (identifiant déjà utilisé ?). Vous pourrez le créer depuis Configuration > Utilisateurs."
                });
                this.router.navigate(['/clients', clientId]);
            }
        });
    }

    genererMotDePasse() {
        const majuscules = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const minuscules = 'abcdefghjkmnpqrstuvwxyz';
        const chiffres = '23456789';
        const speciaux = '!@#$%*?';
        const alphabet = majuscules + minuscules + chiffres + speciaux;
        const alea = (jeu: string) => jeu[Math.floor(Math.random() * jeu.length)];
        let mdp = alea(majuscules) + alea(minuscules) + alea(chiffres) + alea(speciaux);
        for (let i = mdp.length; i < 12; i++) {
            mdp += alea(alphabet);
        }
        mdp = mdp.split('').sort(() => Math.random() - 0.5).join('');
        this.compteForm.patchValue({ password: mdp });
        this.compteForm.controls.password.markAsTouched();
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
