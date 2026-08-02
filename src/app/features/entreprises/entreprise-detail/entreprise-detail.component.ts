import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable, forkJoin, of } from 'rxjs';
import { Entreprise, AffectationEntrepriseChantier, RoleEntreprise } from '../models/entreprise.model';
import { EntrepriseService } from '../services/entreprise.service';
import { AffectationEntrepriseChantierService } from '../services/affectation-entreprise-chantier.service';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';
import { CorpsDeMetier, Pays, Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { DocumentEtat, DocumentItem, HistoriqueModification, TypeDocument } from 'src/app/features/documents/models/document.model';
import { DocumentService } from 'src/app/features/documents/services/document.service';
import { TypeDocumentService } from 'src/app/features/documents/services/type-document.service';
import { DocumentEtatService } from 'src/app/features/documents/services/document-etat.service';
import { Salarie } from 'src/app/features/salaries/models/salarie.model';
import { SalarieService } from 'src/app/features/salaries/services/salarie.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { MessagePlanifie, SendMessageRequest } from 'src/app/features/messagerie/models/message.model';
import { MessageService as MessagerieMessageService } from 'src/app/features/messagerie/services/message.service';
import { AuthService } from 'src/app/core/auth/auth.service';

interface LigneDocument {
    dateDebutValidite: Date | null;
    dateExpiration: Date | null;
    fichierUrl: string;
}

@Component({
    selector: 'app-entreprise-detail',
    templateUrl: './entreprise-detail.component.html',
    providers: [MessageService, ConfirmationService]
})
export class EntrepriseDetailComponent implements OnInit {

    isNew = true;
    saving = false;
    loading = false;
    entrepriseId: string | null = null;
    entreprise: Entreprise | null = null;

    pays: Pays[] = [];
    corpsDeMetiers: CorpsDeMetier[] = [];

    coordonneesForm = this.fb.group({
        raisonSociale: ['', Validators.required],
        corpsDeMetierId: ['', Validators.required],
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
        responsableSignataireAgrement: [''],
        commentaire: ['']
    });

    // --- Affectation à un chantier ---
    chantiers: Chantier[] = [];
    entreprises: Entreprise[] = [];
    // nomChantierCalculee ajouté au chargement, pour permettre un p-columnFilter
    // texte simple sur le nom du chantier (le champ brut n'a que chantierId).
    mesAffectations: Array<AffectationEntrepriseChantier & { nomChantierCalculee: string }> = [];
    roles: RoleEntreprise[] = ['PRINCIPALE', 'STT1', 'STT2'];
    affectationsChantierSelectionne: AffectationEntrepriseChantier[] = [];
    parentsDisponibles: Array<{ id: string; label: string }> = [];
    chantiersDisponibles: Chantier[] = [];
    afficherAffectation = false;

    affectationForm = this.fb.group({
        chantierId: ['', Validators.required],
        role: ['PRINCIPALE' as RoleEntreprise, Validators.required],
        affectationParenteId: ['']
    });

    // --- Documents (check-list de tous les types configurés) ---
    documents: DocumentItem[] = [];
    types: TypeDocument[] = [];
    typesPourEntreprise: TypeDocument[] = [];
    afficherDocuments = false;
    afficherObligatoireSeulement = false;
    filtreTexte = '';
    documentsByType: Record<string, DocumentItem> = {};
    lignesDocument: Record<string, LigneDocument> = {};
    // Cases cochées sur les documents manquants, pour "Demander à l'entreprise"
    // (voir demanderDocumentsSelectionnes) — repart de zéro à chaque envoi.
    typesDemandesSelection: Record<string, boolean> = {};
    etats: DocumentEtat[] = [];
    etatsPourRefus: DocumentEtat[] = [];
    dialogRefuserVisible = false;
    documentARefuser: DocumentItem | null = null;

    // --- Salariés (raccourci vers les salariés de cette entreprise) ---
    // identiteCalculee ajouté au chargement, pour permettre un p-columnFilter
    // texte simple sur "Prénom Nom" (colonne Identité affichée regroupée).
    salaries: Array<Salarie & { identiteCalculee: string }> = [];
    afficherSalaries = false;

    // --- Utilisateurs (comptes rattachés à cette entreprise) ---
    utilisateurs: Utilisateur[] = [];
    afficherUtilisateurs = false;
    afficherFormulaireUtilisateur = false;
    nouveauCompteForm = this.fb.group({
        prenom: ['', Validators.required],
        nom: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        username: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]]
    });

    // --- Historique des documents (repliée par défaut, chargée à la demande) ---
    historique: HistoriqueModification[] = [];
    afficherHistorique = false;
    private historiqueCharge = false;

    // --- Relances (repliée par défaut, chargée à la demande) ---
    relances: MessagePlanifie[] = [];
    afficherRelances = false;
    private relancesChargees = false;

    // --- Envoyer un message (composeur inline, même modèle que Messagerie > Nouveau message) ---
    afficherComposeur = false;
    envoiMessageEnCours = false;
    tousUtilisateurs: Utilisateur[] = [];
    // Parité d'affichage avec le site legacy (logo, balises, bloc coordonnées) :
    // pas de colonne backend correspondante, rien n'est envoyé au serveur pour ce champ.
    fichierModeleNom: string | null = null;
    messageForm = this.fb.group({
        sujet: ['', Validators.required],
        contenu: [this.modeleParDefaut(), Validators.required],
        copieAdmin: [false]
    });

    // --- Compte utilisateur créé en même temps que l'entreprise (gain de temps
    // legacy : plus besoin d'un aller-retour par Configuration > Utilisateurs) ---
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
        private entrepriseService: EntrepriseService,
        private affectationService: AffectationEntrepriseChantierService,
        private chantierService: ChantierService,
        private referenceDataService: ReferenceDataService,
        private documentService: DocumentService,
        private typeDocumentService: TypeDocumentService,
        private documentEtatService: DocumentEtatService,
        private salarieService: SalarieService,
        private utilisateurService: UtilisateurService,
        private messagerieService: MessagerieMessageService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        public auth: AuthService
    ) {
        this.affectationForm.controls.chantierId.valueChanges.subscribe((chantierId) => this.onChantierChange(chantierId));
        this.affectationForm.controls.role.valueChanges.subscribe((role) => {
            this.recalculerParentsDisponibles();
            const parenteControl = this.affectationForm.controls.affectationParenteId;
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

    ngOnInit(): void {
        this.referenceDataService.listerPays().subscribe((pays) => (this.pays = pays));
        this.referenceDataService.listerCorpsDeMetier().subscribe((c) => (this.corpsDeMetiers = c));
        this.chantierService.lister().subscribe((chantiers) => {
            this.chantiers = chantiers;
            this.recalculerChantiersDisponibles();
        });
        this.entrepriseService.lister().subscribe((entreprises) => (this.entreprises = entreprises));
        this.utilisateurService.lister().subscribe((utilisateurs) => (this.tousUtilisateurs = utilisateurs));
        this.typeDocumentService.lister().subscribe((types) => {
            this.types = types;
            this.recalculerTypesPourEntreprise();
        });
        this.documentEtatService.lister().subscribe((etats) => {
            this.etats = etats;
            this.etatsPourRefus = etats.filter((e) => !e.valideLeDocument);
        });

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.entrepriseId = id;
            this.isNew = !id;
            if (id) {
                this.loading = true;
                this.chargerEntreprise(id);
                this.chargerMesAffectations();
                this.chargerDocuments();
                this.chargerSalaries(id);
                this.chargerUtilisateurs(id);
            }
        });
    }

    chargerSalaries(entrepriseId: string) {
        this.salarieService.lister(entrepriseId).subscribe((salaries) => {
            this.salaries = salaries.map((s) => ({ ...s, identiteCalculee: `${s.prenom} ${s.nom}` }));
        });
    }

    private chargerEntreprise(id: string) {
        this.entrepriseService.obtenir(id).subscribe({
            next: (e) => {
                this.entreprise = e;
                this.coordonneesForm.patchValue(e);
                this.recalculerTypesPourEntreprise();
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    // --- Coordonnées ---

    submitCoordonnees() {
        if (this.coordonneesForm.invalid) {
            this.coordonneesForm.markAllAsTouched();
            return;
        }
        if (this.isNew && this.creerCompteUtilisateur && this.compteForm.invalid) {
            this.compteForm.markAllAsTouched();
            return;
        }
        if (this.isNew && !this.documentsObligatoiresComplets()) {
            this.message.add({
                severity: 'error',
                summary: 'Documents obligatoires manquants',
                detail: 'Renseignez tous les documents obligatoires avant de créer cette entreprise.'
            });
            return;
        }
        const value = this.coordonneesForm.getRawValue();
        const payload = {
            raisonSociale: value.raisonSociale!,
            corpsDeMetierId: value.corpsDeMetierId ?? undefined,
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
            responsableSignataireAgrement: value.responsableSignataireAgrement ?? undefined,
            commentaire: value.commentaire ?? undefined
        };
        this.saving = true;
        if (this.isNew) {
            this.entrepriseService.creer(payload).subscribe({
                next: (entreprise) => {
                    this.enregistrerDocumentsInitiaux(entreprise.id).subscribe({
                        next: () => this.finaliserCreationEntreprise(entreprise.id),
                        error: () => {
                            this.message.add({
                                severity: 'error', summary: 'Erreur',
                                detail: "Entreprise créée, mais l'enregistrement de certains documents a échoué."
                            });
                            this.finaliserCreationEntreprise(entreprise.id);
                        }
                    });
                },
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
                }
            });
        } else {
            this.entrepriseService.modifier(this.entrepriseId!, payload).subscribe({
                next: (entreprise) => {
                    this.saving = false;
                    this.entreprise = entreprise;
                    this.message.add({ severity: 'success', summary: 'Succès', detail: 'Entreprise modifiée' });
                },
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' });
                }
            });
        }
    }

    private finaliserCreationEntreprise(entrepriseId: string) {
        if (!this.creerCompteUtilisateur) {
            this.router.navigate(['/entreprises', entrepriseId]);
            return;
        }
        const compte = this.compteForm.getRawValue();
        this.utilisateurService.creer({
            nom: compte.nom!,
            prenom: compte.prenom!,
            email: compte.email!,
            username: compte.username!,
            password: compte.password!,
            roles: ['ENTREPRISE'],
            entrepriseId
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Entreprise et compte utilisateur créés' });
                this.router.navigate(['/entreprises', entrepriseId]);
            },
            error: () => {
                // L'entreprise existe déjà : on n'annule pas la navigation, on
                // signale juste que le compte reste à créer manuellement.
                this.message.add({
                    severity: 'warn', summary: 'Entreprise créée',
                    detail: "Le compte utilisateur n'a pas pu être créé (identifiant déjà utilisé ?). Vous pourrez le créer depuis Configuration > Utilisateurs."
                });
                this.router.navigate(['/entreprises', entrepriseId]);
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
        if (!this.entreprise) {
            return;
        }
        const entreprise = this.entreprise;
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (entreprise.actif ? 'désactiver' : 'activer') + ' cette entreprise ?',
            accept: () => {
                const obs = entreprise.actif
                    ? this.entrepriseService.desactiver(entreprise.id)
                    : this.entrepriseService.activer(entreprise.id);
                obs.subscribe({
                    next: (e) => (this.entreprise = e),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    // --- Affectation à un chantier ---

    chargerMesAffectations() {
        this.affectationService.listerParEntreprise(this.entrepriseId!).subscribe((affectations) => {
            this.mesAffectations = [...affectations]
                .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut))
                .map((a) => ({ ...a, nomChantierCalculee: this.nomChantier(a.chantierId) }));
            this.recalculerChantiersDisponibles();
        });
    }

    private recalculerChantiersDisponibles() {
        // Un chantier où cette entreprise est déjà affectée reste sélectionnable :
        // elle peut porter plusieurs rôles sur le même chantier (ex : Principale ET
        // STT1). Le backend refuse uniquement un doublon exact (même rôle).
        this.chantiersDisponibles = this.chantiers;
    }

    nomChantier(id: string): string {
        return this.chantiers.find((c) => c.id === id)?.nom ?? id;
    }

    nomEntreprise(id: string): string {
        return this.entreprises.find((e) => e.id === id)?.raisonSociale ?? id;
    }

    private onChantierChange(chantierId: string | null) {
        this.affectationForm.patchValue({ affectationParenteId: '' }, { emitEvent: false });
        if (!chantierId) {
            this.affectationsChantierSelectionne = [];
            this.recalculerParentsDisponibles();
            return;
        }
        this.affectationService.lister(chantierId).subscribe((affectations) => {
            this.affectationsChantierSelectionne = affectations;
            this.recalculerParentsDisponibles();
        });
    }

    private recalculerParentsDisponibles() {
        const role = this.affectationForm.value.role;
        const roleParentAttendu = role === 'STT1' ? 'PRINCIPALE' : role === 'STT2' ? 'STT1' : null;
        this.parentsDisponibles = roleParentAttendu
            ? this.affectationsChantierSelectionne
                .filter((a) => a.role === roleParentAttendu)
                .map((a) => ({ id: a.id, label: this.nomEntreprise(a.entrepriseId) }))
            : [];
    }

    submitAffectation() {
        if (this.affectationForm.invalid) {
            this.affectationForm.markAllAsTouched();
            return;
        }
        const value = this.affectationForm.getRawValue();
        this.affectationService.affecter(value.chantierId!, {
            entrepriseId: this.entrepriseId!,
            role: value.role!,
            affectationParenteId: value.role === 'PRINCIPALE' ? undefined : (value.affectationParenteId || undefined)
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Chantier affecté' });
                this.affectationForm.reset({ chantierId: '', role: 'PRINCIPALE', affectationParenteId: '' });
                this.chargerMesAffectations();
            },
            error: (err) => this.message.add({
                severity: 'error', summary: 'Erreur',
                detail: err?.error?.message ?? 'Affectation impossible'
            })
        });
    }

    desactiverAffectation(affectation: AffectationEntrepriseChantier) {
        this.affectationService.desactiver(affectation.chantierId, affectation.id).subscribe({
            next: () => this.chargerMesAffectations(),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    // --- Documents (check-list) ---

    chargerDocuments() {
        this.documentService.listerParEntreprise(this.entrepriseId!).subscribe((documents) => {
            this.documents = documents;
            this.documentsByType = {};
            for (const d of documents) {
                this.documentsByType[d.typeDocumentId] = d;
            }
            this.recalculerTypesPourEntreprise();
        });
    }

    private recalculerTypesPourEntreprise() {
        const corpsDeMetierId = this.entreprise?.corpsDeMetierId;
        const paysId = this.entreprise?.paysId;
        const texte = this.filtreTexte.trim().toLowerCase();
        this.typesPourEntreprise = this.types.filter((t) => {
            if (t.cible !== 'ENTREPRISE') {
                return false;
            }
            if (this.afficherObligatoireSeulement && !t.obligatoire) {
                return false;
            }
            if (t.corpsDeMetierId && t.corpsDeMetierId !== corpsDeMetierId) {
                return false;
            }
            if (t.paysId && t.paysId !== paysId) {
                return false;
            }
            if (texte && !t.libelle.toLowerCase().includes(texte)) {
                return false;
            }
            return true;
        });
        // Validés et en attente (déjà fournis) remontent au-dessus des refusés
        // et des documents manquants, pour repérer d'un coup d'œil ce qui reste à traiter.
        this.typesPourEntreprise.sort((a, b) => this.prioriteStatutDocument(a) - this.prioriteStatutDocument(b));
        for (const t of this.typesPourEntreprise) {
            if (!this.lignesDocument[t.id]) {
                this.lignesDocument[t.id] = { dateDebutValidite: null, dateExpiration: null, fichierUrl: '' };
            }
        }
    }

    private prioriteStatutDocument(type: TypeDocument): number {
        const document = this.documentsByType[type.id];
        if (!document) {
            return 3;
        }
        switch (document.statutValidation) {
            case 'VALIDE': return 0;
            case 'EN_ATTENTE': return 1;
            default: return 2;
        }
    }

    onFichierChoisi(event: Event, typeId: string) {
        const input = event.target as HTMLInputElement;
        const fichier = input.files?.[0] ?? null;
        // Pas encore d'espace de stockage réel côté serveur (voir fichierUrl) :
        // on garde seulement le nom du fichier choisi, en attendant qu'un
        // véritable dépôt de fichiers existe.
        this.lignesDocument[typeId].fichierUrl = fichier ? fichier.name : '';
    }

    onFiltreObligatoireChange() {
        this.recalculerTypesPourEntreprise();
    }

    onFiltreTexteChange() {
        this.recalculerTypesPourEntreprise();
    }

    get nbDocumentsManquants(): number {
        return this.typesPourEntreprise.filter((t) => !this.documentsByType[t.id]).length;
    }

    get nbTypesDemandesSelection(): number {
        return Object.values(this.typesDemandesSelection).filter(Boolean).length;
    }

    demanderDocumentsSelectionnes() {
        const idsSelectionnes = Object.keys(this.typesDemandesSelection).filter((id) => this.typesDemandesSelection[id]);
        const libelles = this.typesPourEntreprise.filter((t) => idsSelectionnes.includes(t.id)).map((t) => t.libelle);
        if (libelles.length === 0) {
            return;
        }
        const listeHtml = libelles.map((l) => `<li>${l}</li>`).join('');
        this.messageForm.patchValue({
            sujet: `Documents à fournir — ${this.entreprise ? this.entreprise.raisonSociale : ''}`,
            contenu: this.modeleDemandeDocuments(listeHtml)
        });
        this.typesDemandesSelection = {};
        this.afficherComposeur = true;
    }

    private modeleDemandeDocuments(listeDocumentsHtml: string): string {
        return `
<p><img src="assets/layout/images/admincontrol-logo.png" alt="ADMIN-CONTROL'BTP" style="max-width:200px;" /></p>
<p>Date :<br /><strong>[DATE]</strong></p>
<p>Entreprise :<br /><strong>${this.entreprise ? this.entreprise.raisonSociale : '[ENTREPRISE_NOM]'}</strong></p>
<p><br /></p>
<p>Madame, Monsieur,</p>
<p><br /></p>
<p>Merci de nous transmettre les documents suivants :</p>
<ul>${listeDocumentsHtml}</ul>
<p><br /></p>
<p>Cordialement.</p>
<p>L'équipe ADMIN-CONTROL'BTP</p>
<p><br /></p>
<p>Service gestion et traitement centralisé : +33 (0)5 35 54 23 58<br />E-mail : suivi.chantier.control.btp@gmail.com</p>
<p>Réception des appels : du lundi au vendredi de 08h30 à 12h00</p>
`.trim();
    }

    documentsObligatoiresComplets(): boolean {
        return this.typesPourEntreprise
            .filter((t) => t.obligatoire)
            .every((t) => !!this.lignesDocument[t.id]?.fichierUrl);
    }

    private enregistrerDocumentsInitiaux(entrepriseId: string): Observable<unknown> {
        const appels = this.typesPourEntreprise
            .filter((t) => this.lignesDocument[t.id]?.fichierUrl)
            .map((t) => {
                const ligne = this.lignesDocument[t.id];
                return this.documentService.creer({
                    typeDocumentId: t.id,
                    entrepriseId,
                    fichierUrl: ligne.fichierUrl || undefined,
                    dateDebutValidite: ligne.dateDebutValidite ? this.toIsoDate(ligne.dateDebutValidite) : undefined,
                    dateExpiration: ligne.dateExpiration ? this.toIsoDate(ligne.dateExpiration) : undefined
                });
            });
        return appels.length > 0 ? forkJoin(appels) : of(null);
    }

    renseignerDocument(type: TypeDocument) {
        const ligne = this.lignesDocument[type.id];
        this.documentService.creer({
            typeDocumentId: type.id,
            entrepriseId: this.entrepriseId!,
            fichierUrl: ligne.fichierUrl || undefined,
            dateDebutValidite: ligne.dateDebutValidite ? this.toIsoDate(ligne.dateDebutValidite) : undefined,
            dateExpiration: ligne.dateExpiration ? this.toIsoDate(ligne.dateExpiration) : undefined
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Document enregistré' });
                this.chargerDocuments();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Enregistrement impossible' })
        });
    }

    valider(document: DocumentItem) {
        this.documentService.valider(document.id).subscribe({ next: () => this.chargerDocuments() });
    }

    libelleEtat(documentEtatId?: string): string {
        if (!documentEtatId) {
            return '—';
        }
        return this.etats.find((e) => e.id === documentEtatId)?.titre ?? documentEtatId;
    }

    ouvrirRefus(document: DocumentItem) {
        this.documentARefuser = document;
        this.dialogRefuserVisible = true;
    }

    confirmerRefus(documentEtatId: string) {
        if (!this.documentARefuser) {
            return;
        }
        this.documentService.refuser(this.documentARefuser.id, documentEtatId).subscribe({
            next: () => {
                this.documentARefuser = null;
                this.chargerDocuments();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Refus impossible' })
        });
    }

    private toIsoDate(date: Date): string {
        return date.toISOString().substring(0, 10);
    }

    // --- Utilisateurs ---

    chargerUtilisateurs(entrepriseId: string) {
        this.utilisateurService.lister().subscribe((utilisateurs) => {
            this.utilisateurs = utilisateurs.filter((u) => u.entrepriseId === entrepriseId);
        });
    }

    ajouterUtilisateur() {
        if (this.nouveauCompteForm.invalid) {
            this.nouveauCompteForm.markAllAsTouched();
            return;
        }
        const compte = this.nouveauCompteForm.getRawValue();
        this.utilisateurService.creer({
            nom: compte.nom!,
            prenom: compte.prenom!,
            email: compte.email!,
            username: compte.username!,
            password: compte.password!,
            roles: ['ENTREPRISE'],
            entrepriseId: this.entrepriseId!
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Compte utilisateur créé' });
                this.nouveauCompteForm.reset();
                this.afficherFormulaireUtilisateur = false;
                this.chargerUtilisateurs(this.entrepriseId!);
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible (identifiant déjà utilisé ?)' })
        });
    }

    genererMotDePasseCompte() {
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
        this.nouveauCompteForm.patchValue({ password: mdp });
        this.nouveauCompteForm.controls.password.markAsTouched();
    }

    // --- Historique des documents ---

    basculerHistorique() {
        this.afficherHistorique = !this.afficherHistorique;
        if (this.afficherHistorique && !this.historiqueCharge) {
            this.documentService.historiqueParEntreprise(this.entrepriseId!).subscribe((h) => {
                this.historique = h;
                this.historiqueCharge = true;
            });
        }
    }

    libelleDocumentHistorique(h: HistoriqueModification): string {
        return (h.details?.['typeDocumentLibelle'] as string) ?? '—';
    }

    libelleAction(action: string): string {
        const labels: Record<string, string> = {
            CREATION: 'Créé', VALIDATION: 'Validé', REFUS: 'Refusé', SUPPRESSION: 'Supprimé'
        };
        return labels[action] ?? action;
    }

    severiteAction(action: string): string {
        const severites: Record<string, string> = {
            CREATION: 'info', VALIDATION: 'success', REFUS: 'danger', SUPPRESSION: 'danger'
        };
        return severites[action] ?? 'info';
    }

    detailHistorique(h: HistoriqueModification): string {
        const d = h.details || {};
        if (h.action === 'REFUS' && d['motif']) {
            return `Motif : ${d['motif']}`;
        }
        if (d['ancienStatut']) {
            return `${d['ancienStatut']} → ${d['nouveauStatut']}`;
        }
        return '—';
    }

    // --- Relances ---

    basculerRelances() {
        this.afficherRelances = !this.afficherRelances;
        if (this.afficherRelances && !this.relancesChargees) {
            this.documentService.relancesParEntreprise(this.entrepriseId!).subscribe((r) => {
                this.relances = r;
                this.relancesChargees = true;
            });
        }
    }

    // --- Envoyer un message (composeur inline, même modèle que Messagerie > Nouveau message) ---

    // Parité d'affichage avec le modèle de courrier du site legacy (logo,
    // balises, bloc coordonnées) : contenu de départ éditable, pas une valeur
    // figée envoyée telle quelle — l'utilisateur le personnalise avant l'envoi.
    private modeleParDefaut(): string {
        return `
<p><img src="assets/layout/images/admincontrol-logo.png" alt="ADMIN-CONTROL'BTP" style="max-width:200px;" /></p>
<p>Date :<br /><strong>[DATE]</strong></p>
<p>Entreprise :<br /><strong>${this.entreprise ? this.entreprise.raisonSociale : '[ENTREPRISE_NOM]'}</strong></p>
<p><br /></p>
<p>Madame, Monsieur,</p>
<p><br /></p>
<p>Cordialement.</p>
<p>L'équipe ADMIN-CONTROL'BTP</p>
<p><br /></p>
<p>Service gestion et traitement centralisé : +33 (0)5 35 54 23 58<br />E-mail : suivi.chantier.control.btp@gmail.com</p>
<p>Réception des appels : du lundi au vendredi de 08h30 à 12h00</p>
`.trim();
    }

    envoyerMessage() {
        if (this.messageForm.invalid || !this.entrepriseId) {
            this.messageForm.markAllAsTouched();
            return;
        }
        const value = this.messageForm.getRawValue();

        const cibles = new Map<string, SendMessageRequest>();
        const ajouter = (type: SendMessageRequest['destinataireType'], id: string) => {
            cibles.set(`${type}:${id}`, { destinataireType: type, destinataireId: id, sujet: value.sujet!, contenu: value.contenu! });
        };
        ajouter('ENTREPRISE', this.entrepriseId);
        if (value.copieAdmin) {
            this.tousUtilisateurs.filter((u) => u.roles.includes('SUPER_ADMIN')).forEach((u) => ajouter('UTILISATEUR', u.id));
        }

        this.envoiMessageEnCours = true;
        forkJoin(Array.from(cibles.values()).map((requete) => this.messagerieService.envoyer(requete))).subscribe({
            next: () => {
                this.envoiMessageEnCours = false;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Message envoyé' });
                this.messageForm.reset({ sujet: '', contenu: this.modeleParDefaut(), copieAdmin: false });
                this.afficherComposeur = false;
            },
            error: () => {
                this.envoiMessageEnCours = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Envoi impossible' });
            }
        });
    }

    retour() {
        this.router.navigate(['/entreprises']);
    }
}
