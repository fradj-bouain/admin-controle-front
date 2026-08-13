import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Chantier, RecurrenceControles } from '../models/chantier.model';
import { ChantierService } from '../services/chantier.service';
import { ChantierUtilisateurService } from '../services/chantier-utilisateur.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { Pays, Utilisateur, ControleTiers, TypeContratSalarie } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Salarie, AffectationSalarieChantier } from 'src/app/features/salaries/models/salarie.model';
import { SalarieService } from 'src/app/features/salaries/services/salarie.service';
import { AffectationSalarieChantierService } from 'src/app/features/salaries/services/affectation-salarie-chantier.service';
import { AffectationEntrepriseChantier, Entreprise, RoleEntreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { AffectationEntrepriseChantierService } from 'src/app/features/entreprises/services/affectation-entreprise-chantier.service';
import { Controle } from 'src/app/features/controles/models/controle.model';
import { ControleService } from 'src/app/features/controles/services/controle.service';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-chantier-detail',
    templateUrl: './chantier-detail.component.html',
    providers: [MessageService, ConfirmationService]
})
export class ChantierDetailComponent implements OnInit {

    isNew = true;
    saving = false;
    loading = false;
    chantierId: string | null = null;
    chantier: Chantier | null = null;

    clients: Client[] = [];
    pays: Pays[] = [];
    utilisateurs: Utilisateur[] = [];
    salaries: Salarie[] = [];
    entreprises: Entreprise[] = [];
    typesContrat: TypeContratSalarie[] = [];
    controleTiersListe: ControleTiers[] = [];

    recurrences: RecurrenceControles[] = ['AUCUNE', 'HEBDOMADAIRE', 'MENSUEL', 'TRIMESTRIEL', 'ANNUEL'];

    coordonneesForm = this.fb.group({
        clientId: ['', Validators.required],
        ipsAllowed: [''],
        nom: ['', Validators.required],
        prestation: [''],
        adresse: ['', Validators.required],
        adresse2: [''],
        adresse3: [''],
        ville: ['', Validators.required],
        paysId: ['', Validators.required],
        dateDebut: [null as Date | null, Validators.required],
        dateFinPrevue: [null as Date | null]
    });

    responsableForm = this.fb.group({
        chefChantierUtilisateurId: [''],
        salarieResponsableId: ['']
    });

    // --- Sections secondaires repliées par défaut ---
    afficherStatistiques = false;
    afficherControles = false;
    afficherUtilisateurs = false;
    afficherEntreprises = false;
    afficherSalaries = false;

    // --- Contrôles ---
    controles: Controle[] = [];
    controlesForm = this.fb.group({
        recurrenceControles: ['AUCUNE' as RecurrenceControles],
        dateProchainControle: [null as Date | null]
    });
    nouveauControleForm = this.fb.group({
        dateControle: [new Date(), Validators.required],
        remarques: [''],
        controleTiersId: [''],
        termine: [false]
    });

    // --- Utilisateurs du Back Office ---
    chantierUtilisateurIds: string[] = [];
    nouvelUtilisateurId = '';

    // --- Utilisateurs du client assignés à ce chantier (item 2) : un compte Client ne
    // voit QUE les chantiers où il a été explicitement assigné ici. Sans aucune
    // assignation, il ne voit aucun chantier (accès strictement opt-in).
    afficherUtilisateursClient = false;
    nouvelUtilisateurClientId = '';

    // --- Entreprises affectées ---
    // nomEntrepriseCalculee ajouté au chargement, pour permettre un p-columnFilter
    // texte simple sur le nom de l'entreprise (le champ brut n'a que entrepriseId).
    affectationsEntreprise: Array<AffectationEntrepriseChantier & { nomEntrepriseCalculee: string }> = [];
    entreprisesDisponibles: Entreprise[] = [];
    roles: RoleEntreprise[] = ['PRINCIPALE', 'STT1', 'STT2'];
    parentsDisponibles: Array<{ id: string; label: string }> = [];
    affecterEntrepriseForm = this.fb.group({
        entrepriseId: ['', Validators.required],
        role: ['PRINCIPALE' as RoleEntreprise, Validators.required],
        affectationParenteId: ['']
    });

    // --- Salariés affectés ---
    // nomSalarieCalculee/contratCalculee ajoutés au chargement, pour permettre des
    // p-columnFilter simples (les champs bruts n'ont que salarieId).
    affectationsSalarie: Array<AffectationSalarieChantier & { nomSalarieCalculee: string; contratCalculee: string }> = [];
    salariesDisponibles: Salarie[] = [];
    affecterSalarieForm = this.fb.group({
        salarieId: ['', Validators.required],
        affectationEntrepriseChantierId: ['', Validators.required]
    });

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private chantierService: ChantierService,
        private chantierUtilisateurService: ChantierUtilisateurService,
        private clientService: ClientService,
        private referenceDataService: ReferenceDataService,
        private utilisateurService: UtilisateurService,
        private salarieService: SalarieService,
        private entrepriseService: EntrepriseService,
        private affectationEntrepriseService: AffectationEntrepriseChantierService,
        private affectationSalarieService: AffectationSalarieChantierService,
        private controleService: ControleService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        public auth: AuthService
    ) {
        this.affecterEntrepriseForm.controls.role.valueChanges.subscribe((role) => {
            this.recalculerParentsDisponibles();
            const parenteControl = this.affecterEntrepriseForm.controls.affectationParenteId;
            if (role === 'PRINCIPALE') {
                parenteControl.clearValidators();
                parenteControl.setValue('');
            } else {
                parenteControl.setValidators(Validators.required);
            }
            parenteControl.updateValueAndValidity();
        });
    }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    get isEntreprise(): boolean {
        return this.auth.hasRole('ENTREPRISE');
    }

    get isControleur(): boolean {
        return this.auth.hasRole('CONTROLEUR');
    }

    // --- Vue Entreprise (lecture seule) : indicateurs propres à SA situation sur ce
    // chantier, jamais les stats globales qui mélangent toutes les entreprises. ---

    get monAffectationEntreprise(): (AffectationEntrepriseChantier & { nomEntrepriseCalculee: string }) | undefined {
        return this.affectationsEntreprise.find((a) => a.entrepriseId === this.auth.entrepriseId);
    }

    /** Sous-traitants directs (affectationParenteId = ma propre affectation) sur CE
        chantier précisément — à ne pas confondre avec la liste "tous chantiers confondus"
        de la fiche entreprise. */
    get mesSousTraitantsIci(): Array<AffectationEntrepriseChantier & { nomEntrepriseCalculee: string }> {
        const monId = this.monAffectationEntreprise?.id;
        return monId ? this.affectationsEntreprise.filter((a) => a.affectationParenteId === monId) : [];
    }

    get mesAffectationsSalarie(): Array<AffectationSalarieChantier & { nomSalarieCalculee: string; contratCalculee: string }> {
        return this.affectationsSalarie.filter((a) => a.entrepriseId === this.auth.entrepriseId);
    }

    get mesSalariesStats(): { accorde: number; total: number } {
        const mes = this.mesAffectationsSalarie;
        return { accorde: mes.filter((a) => a.statutAcces === 'ACCORDE').length, total: mes.length };
    }

    /** raisonSocialeEntreprise est embarqué dans la réponse d'affectation côté backend —
        une Entreprise n'a pas le droit de consulter la fiche d'une autre entreprise, donc
        nomEntreprise(id) (qui cherche dans this.entreprises, réduit à sa propre fiche pour
        ce rôle) ne résoudrait jamais le nom d'un sous-traitant. */
    nomEntrepriseAffectation(a: AffectationEntrepriseChantier): string {
        return a.raisonSocialeEntreprise ?? this.nomEntreprise(a.entrepriseId);
    }

    nomPays(id?: string): string {
        return this.pays.find((p) => p.id === id)?.nom ?? '—';
    }

    nomClient(id?: string): string {
        return this.clients.find((c) => c.id === id)?.raisonSociale ?? '—';
    }

    get lienMaps(): string {
        if (!this.chantier) {
            return '#';
        }
        const q = [this.chantier.adresse, this.chantier.ville].filter(Boolean).join(', ');
        return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    }

    /** Comptes Client rattachés au client de CE chantier — seuls candidats pertinents
        pour une assignation ici (inutile de proposer les comptes d'un autre client). */
    get utilisateursClientDuChantier(): Utilisateur[] {
        if (!this.chantier) {
            return [];
        }
        return this.utilisateurs.filter((u) => u.clientId === this.chantier!.clientId);
    }

    /** Parmi les assignations de ce chantier, celles qui concernent un compte Client
        (le reste, potentiellement des comptes internes, reste dans "Utilisateurs du
        Back Office" — même table chantier_utilisateur, affichage simplement séparé). */
    get utilisateursClientAssignes(): Utilisateur[] {
        return this.utilisateursClientDuChantier.filter((u) => this.chantierUtilisateurIds.includes(u.id));
    }

    ngOnInit(): void {
        this.clientService.lister().subscribe((clients) => (this.clients = clients));
        this.referenceDataService.listerPays().subscribe((pays) => (this.pays = pays));
        this.referenceDataService.listerTypeContratSalarie().subscribe((types) => (this.typesContrat = types));
        this.referenceDataService.listerControleTiers().subscribe((tiers) => (this.controleTiersListe = tiers));
        this.utilisateurService.lister().subscribe((utilisateurs) => (this.utilisateurs = utilisateurs));
        this.salarieService.lister().subscribe((salaries) => {
            this.salaries = salaries;
            this.recalculerSalariesDisponibles();
        });
        this.entrepriseService.lister().subscribe((entreprises) => {
            this.entreprises = entreprises;
            this.recalculerEntreprisesDisponibles();
        });

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.chantierId = id;
            this.isNew = !id;
            if (id) {
                this.loading = true;
                this.chargerChantier(id);
                this.chargerControles(id);
                this.chargerUtilisateurs(id);
                this.chargerAffectationsEntreprise(id);
                this.chargerAffectationsSalarie(id);
            } else {
                const preselectionne = this.route.snapshot.queryParamMap.get('clientId');
                if (preselectionne) {
                    this.coordonneesForm.patchValue({ clientId: preselectionne });
                }
            }
        });
    }

    private chargerChantier(id: string) {
        this.chantierService.obtenir(id).subscribe({
            next: (c) => {
                this.chantier = c;
                this.coordonneesForm.patchValue({
                    ...c,
                    dateDebut: c.dateDebut ? new Date(c.dateDebut) : null,
                    dateFinPrevue: c.dateFinPrevue ? new Date(c.dateFinPrevue) : null
                });
                this.responsableForm.patchValue({
                    chefChantierUtilisateurId: c.chefChantierUtilisateurId ?? '',
                    salarieResponsableId: c.salarieResponsableId ?? ''
                });
                this.controlesForm.patchValue({
                    recurrenceControles: c.recurrenceControles ?? 'AUCUNE',
                    dateProchainControle: c.dateProchainControle ? new Date(c.dateProchainControle) : null
                });
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    // --- Détail du chantier ---

    submitCoordonnees() {
        if (this.coordonneesForm.invalid) {
            this.coordonneesForm.markAllAsTouched();
            return;
        }
        const value = this.coordonneesForm.getRawValue();
        const payload = {
            clientId: value.clientId!,
            nom: value.nom!,
            prestation: value.prestation ?? undefined,
            adresse: value.adresse ?? undefined,
            adresse2: value.adresse2 ?? undefined,
            adresse3: value.adresse3 ?? undefined,
            ville: value.ville ?? undefined,
            paysId: value.paysId ?? undefined,
            ipsAllowed: value.ipsAllowed ?? undefined,
            dateDebut: value.dateDebut ? this.toIsoDate(value.dateDebut) : undefined,
            dateFinPrevue: value.dateFinPrevue ? this.toIsoDate(value.dateFinPrevue) : undefined
        };
        this.saving = true;
        if (this.isNew) {
            this.chantierService.creer(payload).subscribe({
                next: (chantier) => this.router.navigate(['/chantiers', chantier.id]),
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
                }
            });
        } else {
            this.chantierService.modifier(this.chantierId!, payload).subscribe({
                next: (chantier) => {
                    this.saving = false;
                    this.chantier = chantier;
                    this.message.add({ severity: 'success', summary: 'Succès', detail: 'Chantier modifié' });
                },
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' });
                }
            });
        }
    }

    confirmerBasculeStatut() {
        if (!this.chantier) {
            return;
        }
        const chantier = this.chantier;
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (chantier.statut === 'ACTIF' ? 'désactiver' : 'activer') + ' ce chantier ?',
            accept: () => {
                const obs = chantier.statut === 'ACTIF'
                    ? this.chantierService.desactiver(chantier.id)
                    : this.chantierService.activer(chantier.id);
                obs.subscribe({
                    next: (c) => (this.chantier = c),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    // --- Responsable du chantier ---

    affecterResponsable() {
        const value = this.responsableForm.getRawValue();
        if (value.chefChantierUtilisateurId) {
            this.chantierService.affecterChefChantier(this.chantierId!, value.chefChantierUtilisateurId).subscribe({
                next: (c) => { this.chantier = c; this.message.add({ severity: 'success', summary: 'Succès', detail: 'Chef de chantier affecté' }); },
                error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
            });
        }
        if (value.salarieResponsableId) {
            this.chantierService.affecterSalarieResponsable(this.chantierId!, value.salarieResponsableId).subscribe({
                next: (c) => { this.chantier = c; this.message.add({ severity: 'success', summary: 'Succès', detail: 'Salarié responsable affecté' }); },
                error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
            });
        }
    }

    // --- Statistiques (calculées côté client à partir des affectations déjà chargées) ---

    get statsSalariesParContrat(): Array<{ libelle: string; total: number }> {
        const salariesAffectesIds = new Set(this.affectationsSalarie.map((a) => a.salarieId));
        const salariesAffectes = this.salaries.filter((s) => salariesAffectesIds.has(s.id));
        return this.typesContrat.map((t) => ({
            libelle: t.libelle,
            total: salariesAffectes.filter((s) => s.typeContratId === t.id).length
        })).filter((s) => s.total > 0);
    }

    get statsSalariesParStatutAcces(): { accorde: number; refuse: number; enAttente: number; total: number } {
        return {
            accorde: this.affectationsSalarie.filter((a) => a.statutAcces === 'ACCORDE').length,
            refuse: this.affectationsSalarie.filter((a) => a.statutAcces === 'REFUSE').length,
            enAttente: this.affectationsSalarie.filter((a) => a.statutAcces === 'EN_ATTENTE').length,
            total: this.affectationsSalarie.length
        };
    }

    get statsEntreprises(): { total: number; actif: number; inactif: number } {
        const entreprisesAffecteesIds = new Set(this.affectationsEntreprise.map((a) => a.entrepriseId));
        const entreprisesAffectees = this.entreprises.filter((e) => entreprisesAffecteesIds.has(e.id));
        return {
            total: entreprisesAffectees.length,
            actif: entreprisesAffectees.filter((e) => e.actif).length,
            inactif: entreprisesAffectees.filter((e) => !e.actif).length
        };
    }

    // --- Contrôles ---

    chargerControles(chantierId: string) {
        this.controleService.lister(chantierId).subscribe((controles) => (this.controles = controles));
    }

    submitControlesConfig() {
        const value = this.controlesForm.getRawValue();
        this.chantierService.definirControles(this.chantierId!, {
            recurrenceControles: value.recurrenceControles ?? undefined,
            dateProchainControle: value.dateProchainControle ? this.toIsoDate(value.dateProchainControle) : undefined
        }).subscribe({
            next: (c) => { this.chantier = c; this.message.add({ severity: 'success', summary: 'Succès', detail: 'Contrôles mis à jour' }); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    submitNouveauControle() {
        if (this.nouveauControleForm.invalid) {
            this.nouveauControleForm.markAllAsTouched();
            return;
        }
        const value = this.nouveauControleForm.getRawValue();
        this.controleService.creer({
            chantierId: this.chantierId!,
            dateControle: this.toIsoDate(value.dateControle!),
            remarques: value.remarques ?? undefined,
            controleTiersId: value.controleTiersId || undefined,
            termine: value.termine ?? false
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Contrôle créé' });
                this.nouveauControleForm.reset({ dateControle: new Date(), remarques: '', controleTiersId: '', termine: false });
                this.chargerControles(this.chantierId!);
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    // --- Utilisateurs du Back Office ---

    chargerUtilisateurs(chantierId: string) {
        this.chantierUtilisateurService.lister(chantierId).subscribe((liste) => {
            this.chantierUtilisateurIds = liste.map((u) => u.utilisateurId);
        });
    }

    nomUtilisateur(id: string): string {
        const u = this.utilisateurs.find((x) => x.id === id);
        return u ? `${u.prenom} ${u.nom}` : id;
    }

    affecterUtilisateur() {
        if (!this.nouvelUtilisateurId) {
            return;
        }
        this.chantierUtilisateurService.accorder(this.chantierId!, this.nouvelUtilisateurId).subscribe({
            next: () => {
                this.nouvelUtilisateurId = '';
                this.chargerUtilisateurs(this.chantierId!);
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    revoquerUtilisateur(utilisateurId: string) {
        this.chantierUtilisateurService.revoquer(this.chantierId!, utilisateurId).subscribe({
            next: () => this.chargerUtilisateurs(this.chantierId!),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    // --- Utilisateurs du client assignés à ce chantier (item 2) : même mécanisme que
    // "Utilisateurs du Back Office" ci-dessus (table chantier_utilisateur), juste un
    // dropdown filtré aux comptes Client de CE client, pour une bonne expérience de
    // gestion. Un compte Client sans aucune assignation ne voit aucun chantier ; chaque
    // assignation ici lui ouvre l'accès à ce chantier précis (accès strictement opt-in).

    affecterUtilisateurClient() {
        if (!this.nouvelUtilisateurClientId) {
            return;
        }
        this.chantierUtilisateurService.accorder(this.chantierId!, this.nouvelUtilisateurClientId).subscribe({
            next: () => {
                this.nouvelUtilisateurClientId = '';
                this.chargerUtilisateurs(this.chantierId!);
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    // --- Entreprises affectées ---

    chargerAffectationsEntreprise(chantierId: string) {
        this.affectationEntrepriseService.lister(chantierId).subscribe((affectations) => {
            this.affectationsEntreprise = affectations.map((a) => ({ ...a, nomEntrepriseCalculee: this.nomEntreprise(a.entrepriseId) }));
            this.recalculerEntreprisesDisponibles();
            this.recalculerParentsDisponibles();
        });
    }

    private recalculerEntreprisesDisponibles() {
        // Une entreprise déjà affectée à ce chantier reste sélectionnable : elle peut
        // porter plusieurs rôles sur le même chantier (ex : Principale ET STT1). Le
        // backend refuse uniquement un doublon exact (même entreprise, même rôle).
        this.entreprisesDisponibles = this.entreprises;
    }

    private recalculerParentsDisponibles() {
        const role = this.affecterEntrepriseForm.value.role;
        const roleParentAttendu = role === 'STT1' ? 'PRINCIPALE' : role === 'STT2' ? 'STT1' : null;
        this.parentsDisponibles = roleParentAttendu
            ? this.affectationsEntreprise
                .filter((a) => a.role === roleParentAttendu)
                .map((a) => ({ id: a.id, label: this.nomEntreprise(a.entrepriseId) }))
            : [];
    }

    nomEntreprise(id: string): string {
        return this.entreprises.find((e) => e.id === id)?.raisonSociale ?? id;
    }

    submitAffecterEntreprise() {
        if (this.affecterEntrepriseForm.invalid) {
            this.affecterEntrepriseForm.markAllAsTouched();
            return;
        }
        const value = this.affecterEntrepriseForm.getRawValue();
        this.affectationEntrepriseService.affecter(this.chantierId!, {
            entrepriseId: value.entrepriseId!,
            role: value.role!,
            affectationParenteId: value.role === 'PRINCIPALE' ? undefined : (value.affectationParenteId || undefined)
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Entreprise affectée' });
                this.affecterEntrepriseForm.reset({ entrepriseId: '', role: 'PRINCIPALE', affectationParenteId: '' });
                this.chargerAffectationsEntreprise(this.chantierId!);
            },
            error: (err) => this.message.add({
                severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Affectation impossible'
            })
        });
    }

    desactiverAffectationEntreprise(affectation: AffectationEntrepriseChantier) {
        this.affectationEntrepriseService.desactiver(this.chantierId!, affectation.id).subscribe({
            next: () => this.chargerAffectationsEntreprise(this.chantierId!),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    entrepriseStatSalaries(affectationEntrepriseChantierId: string): number {
        return this.affectationsSalarie.filter((a) => a.affectationEntrepriseChantierId === affectationEntrepriseChantierId).length;
    }

    // --- Salariés affectés ---

    chargerAffectationsSalarie(chantierId: string) {
        this.affectationSalarieService.lister(chantierId).subscribe((affectations) => {
            this.affectationsSalarie = affectations.map((a) => ({
                ...a,
                nomSalarieCalculee: this.nomSalarie(a.salarieId),
                contratCalculee: this.contratDuSalarie(a.salarieId)
            }));
            this.recalculerSalariesDisponibles();
        });
    }

    private recalculerSalariesDisponibles() {
        const idsAffectes = new Set(this.affectationsSalarie.map((a) => a.salarieId));
        this.salariesDisponibles = this.salaries.filter((s) => !idsAffectes.has(s.id));
    }

    nomSalarie(id: string): string {
        const s = this.salaries.find((x) => x.id === id);
        return s ? `${s.prenom} ${s.nom}` : id;
    }

    libelleContrat(id?: string): string {
        return this.typesContrat.find((t) => t.id === id)?.libelle ?? '—';
    }

    contratDuSalarie(salarieId: string): string {
        const salarie = this.salaries.find((s) => s.id === salarieId);
        return this.libelleContrat(salarie?.typeContratId);
    }

    submitAffecterSalarie() {
        if (this.affecterSalarieForm.invalid) {
            this.affecterSalarieForm.markAllAsTouched();
            return;
        }
        const value = this.affecterSalarieForm.getRawValue();
        this.affectationSalarieService.affecter(this.chantierId!, {
            salarieId: value.salarieId!,
            affectationEntrepriseChantierId: value.affectationEntrepriseChantierId!
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Salarié affecté' });
                this.affecterSalarieForm.reset({ salarieId: '', affectationEntrepriseChantierId: '' });
                this.chargerAffectationsSalarie(this.chantierId!);
            },
            error: (err) => this.message.add({
                severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Affectation impossible'
            })
        });
    }

    accorderAcces(affectation: AffectationSalarieChantier) {
        this.affectationSalarieService.accorderAcces(this.chantierId!, affectation.id).subscribe({
            next: () => this.chargerAffectationsSalarie(this.chantierId!),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    refuserAcces(affectation: AffectationSalarieChantier) {
        this.affectationSalarieService.refuserAcces(this.chantierId!, affectation.id).subscribe({
            next: () => this.chargerAffectationsSalarie(this.chantierId!),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    private toIsoDate(date: Date): string {
        return date.toISOString().substring(0, 10);
    }

    retour() {
        this.router.navigate(['/chantiers']);
    }
}
