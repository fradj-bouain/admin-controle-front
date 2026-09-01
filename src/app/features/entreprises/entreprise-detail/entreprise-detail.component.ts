import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Entreprise, AffectationEntrepriseChantier, RoleEntreprise } from '../models/entreprise.model';
import { EntrepriseService } from '../services/entreprise.service';
import { AffectationEntrepriseChantierService } from '../services/affectation-entreprise-chantier.service';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';
import { CorpsDeMetier, Pays, SalarieFonction, TypeContratSalarie, Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { DocumentEtat, DocumentItem, HistoriqueModification, TypeDocument } from 'src/app/features/documents/models/document.model';
import { DocumentService } from 'src/app/features/documents/services/document.service';
import { TypeDocumentService } from 'src/app/features/documents/services/type-document.service';
import { DocumentEtatService } from 'src/app/features/documents/services/document-etat.service';
import { AffectationSalarieChantier, Salarie, StatutAcces } from 'src/app/features/salaries/models/salarie.model';
import { SalarieService } from 'src/app/features/salaries/services/salarie.service';
import { AffectationSalarieChantierService } from 'src/app/features/salaries/services/affectation-salarie-chantier.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Message, MessagePlanifie, SendMessageRequest } from 'src/app/features/messagerie/models/message.model';
import { MessageService as MessagerieMessageService } from 'src/app/features/messagerie/services/message.service';
import { AuthService } from 'src/app/core/auth/auth.service';

interface LigneDocument {
    fichierUrl: string;
    fichier: File | null;
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

    // --- Vue Entreprise : édition de ses propres coordonnées (pas les informations
    // légales, verrouillées côté backend — voir EntrepriseController.modifier). ---
    editerCoordonnees = false;

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
        email2: ['', Validators.email],
        email3: ['', Validators.email],
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
    // Sous-traitants (STT1/STT2) rattachés à cette entreprise sur ses chantiers — lecture seule,
    // visible à tout le monde (SUPER_ADMIN comme Entreprise) : cette info manquait complètement
    // avant (demande client). Recalculé explicitement dans recalculerSousTraitants(), jamais une
    // getter (voir la note sur typesAFournir plus bas — un p-table peut aussi mal réagir à un
    // tableau qui change de référence sans changer de contenu).
    sousTraitants: Array<AffectationEntrepriseChantier & { nomChantierCalculee: string }> = [];
    // Panneau latéral (voir bouton "Sous-traitants" dans l'en-tête) — plus de carte dédiée
    // sur la page elle-même, même mécanique que "Contrôles" sur la fiche Chantier.
    afficherSousTraitants = false;
    roles: RoleEntreprise[] = ['PRINCIPALE', 'STT1', 'STT2'];
    affectationsChantierSelectionne: AffectationEntrepriseChantier[] = [];
    parentsDisponibles: Array<{ id: string; label: string }> = [];
    chantiersDisponibles: Chantier[] = [];
    afficherAffectation = false;
    // Raison sociale de l'entreprise "parente" (PRINCIPALE pour un STT1, STT1 pour un STT2)
    // pour chacune de MES affectations, resolue à partir des mêmes appels que
    // recalculerSousTraitants (tous les chantiers où j'interviens) — pas d'appel réseau
    // supplémentaire (demande client : afficher le lien d'appartenance sur la fiche entreprise).
    private parentNomParAffectationId: Record<string, string> = {};
    // Affectations chantier+rang choisies avant que l'entreprise existe (voir isNew) : pas
    // d'entrepriseId tant qu'elle n'est pas enregistrée, donc mises en attente ici et
    // envoyées une à une juste après la création (voir enregistrerAffectationsInitiales),
    // même principe que lignesDocument pour les documents à la création.
    affectationsInitiales: Array<{ chantierId: string; nomChantierCalculee: string; role: RoleEntreprise; affectationParenteId?: string; nomParenteCalculee?: string }> = [];

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
    // Regroupement de la checklist (voir audit UX) : plutôt qu'un flux plat où
    // obligatoires et optionnels se mélangent, on sépare "à fournir" (obligatoire
    // manquant, l'action à faire), "déjà fournis" (pour suivre le statut) et
    // "optionnels" (repliés par défaut, jamais montré comme "caché"). Recalculés
    // ensemble dans recalculerTypesPourEntreprise(), jamais via une getter — un
    // nouveau tableau à chaque cycle de détection de changement a déjà provoqué un
    // blocage du navigateur ailleurs dans cette même fiche (voir demanderDocument).
    typesAFournir: TypeDocument[] = [];
    typesDejaFournis: TypeDocument[] = [];
    typesOptionnelsRestants: TypeDocument[] = [];
    afficherOptionnels = false;
    nbObligatoiresTotal = 0;
    nbObligatoiresFournis = 0;
    pourcentageObligatoires = 0;
    documentsByType: Record<string, DocumentItem> = {};
    lignesDocument: Record<string, LigneDocument> = {};
    etats: DocumentEtat[] = [];
    etatsPourRefus: DocumentEtat[] = [];
    dialogRefuserVisible = false;
    documentARefuser: DocumentItem | null = null;
    dialogValiderVisible = false;
    documentAValider: DocumentItem | null = null;
    dialogApercuVisible = false;
    documentAPrevisualiser: DocumentItem | null = null;

    // --- Salariés (raccourci vers les salariés de cette entreprise) ---
    // identiteCalculee ajouté au chargement, pour permettre un p-columnFilter
    // texte simple sur "Prénom Nom" (colonne Identité affichée regroupée).
    // TOUJOURS l'ensemble complet de l'entreprise, jamais filtré par chantier — sert aux
    // indicateurs d'en-tête (nombre total de salariés, "N actifs") et à résoudre les noms
    // dans chargerSalariesClient (qui agrège PLUSIEURS chantiers à la fois, pas seulement
    // celui en contexte). Pour la liste affichée dans les cartes "Salariés", voir
    // salariesListeAffichee ci-dessous — bien distincte de celle-ci depuis la correction du
    // bug "salariés d'un autre chantier visibles ici" (voir chargerAffectationsSalarieContexte).
    // zoneCalculee (France/UE/Hors UE, demande client) : ajouté ici pour le même motif
    // qu'identiteCalculee — un p-columnFilter ne peut filtrer que sur un champ réel de la
    // ligne, pas sur un appel de méthode. Recalculé aussi depuis listerPays() (voir
    // recalculerZonesSalaries) au cas où les pays arrivent après les salariés.
    salaries: Array<Salarie & { identiteCalculee: string; zoneCalculee?: string }> = [];
    // Liste réellement affichée dans les cartes "Salariés" (compacte + tableau) — filtrée au
    // chantier en contexte quand il y en a un (règle validée "Entreprise + Chantier = contexte
    // d'affectation"), identique à `salaries` sinon. Ne jamais utiliser à la place de `salaries`
    // pour un total/comptage entreprise-wide (en-tête, chargerSalariesClient) : elle ne
    // représenterait alors qu'un seul chantier, silencieusement.
    salariesListeAffichee: Array<Salarie & { identiteCalculee: string; zoneCalculee?: string }> = [];
    afficherSalaries = false;

    // --- Vue Client (lecture seule) : salariés DE CETTE ENTREPRISE affectés à MES
    // chantiers, avec leur statut d'accès par chantier — voir retour client, un simple
    // décompte ne suffit pas, il doit savoir QUI travaille sur son chantier. Nécessite
    // les affectations (statutAcces n'existe que là, pas sur Salarie) : un aller par
    // chantier en commun (voir chargerSalariesClient), déjà scopés côté backend.
    typesContrat: TypeContratSalarie[] = [];
    fonctions: SalarieFonction[] = [];

    // Affectation (chantier courant, statut d'accès/EPI/badge/date de début) par salarié —
    // uniquement quand un chantier est en contexte (contexteChantierId) : sans lui, un
    // salarié peut avoir plusieurs affectations (un chantier chacune), aucune n'est LA bonne
    // réponse. Résolue via GET /chantiers/{id}/salaries (déjà scopé backend), filtrée à
    // cette entreprise — même requête que chargerSalariesClient, sans le multi-chantier.
    affectationParSalarieId: Record<string, AffectationSalarieChantier> = {};
    salariesSurMesChantiersClient: Array<{ salarieId: string; nom: string; contrat: string; chantierNom: string; statutAcces: StatutAcces }> = [];
    chargementSalariesClient = false;

    // --- Utilisateurs (comptes rattachés à cette entreprise) ---
    utilisateurs: Utilisateur[] = [];
    afficherUtilisateurs = false;
    // Utilisé uniquement par la vue Entreprise (auto-gestion de sa propre équipe, voir plus
    // bas .ent-layout) — la vue SUPER_ADMIN affiche désormais son formulaire "Ajouter" en
    // permanence, sans bouton dédié (voir prototype validé).
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

    // --- Historique des messages envoyés à cette entreprise (repliée par défaut, chargée à
    // la demande) — jusqu'ici seul un formulaire d'envoi existait sur cette fiche, aucune trace
    // consultable des messages déjà échangés. -->
    messagesHistorique: Message[] = [];
    afficherMessagesHistorique = false;
    private messagesHistoriqueCharges = false;

    // Chantier d'où vient l'admin, quand il a cliqué sur la ligne "entreprise × chantier"
    // précise depuis la liste fusionnée (voir EntrepriseListComponent) — renseigné via
    // ?chantierId=... dans l'URL. Sert à ne plus jamais montrer "les autres chantiers"
    // sur cette fiche (redondant avec la liste, qui sert déjà à choisir le bon) et à
    // rattacher les messages envoyés d'ici à CE chantier précis.
    contexteChantierId: string | null = null;

    get contexteChantierNom(): string | undefined {
        return this.contexteChantierId ? this.chantiers.find((c) => c.id === this.contexteChantierId)?.nom : undefined;
    }

    // L'affectation (entreprise × ce chantier précis) — porte l'email de contact propre
    // à cette relation, distinct de l'email principal de l'entreprise (voir emailContact
    // sur AffectationEntrepriseChantier, modèle validé).
    get affectationContexte(): AffectationEntrepriseChantier | undefined {
        return this.contexteChantierId ? this.mesAffectations.find((a) => a.chantierId === this.contexteChantierId) : undefined;
    }

    emailContactChantier = '';
    telephoneContactChantier = '';
    adresseContactChantier = '';
    enregistrementCoordonneesContactEnCours = false;

    enregistrerCoordonneesContact() {
        const affectation = this.affectationContexte;
        if (!affectation) {
            return;
        }
        this.enregistrementCoordonneesContactEnCours = true;
        this.affectationService.modifierCoordonneesContact(affectation.chantierId, affectation.id, {
            emailContact: this.emailContactChantier,
            telephoneContact: this.telephoneContactChantier,
            adresseContact: this.adresseContactChantier
        }).subscribe({
            next: () => {
                this.enregistrementCoordonneesContactEnCours = false;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Coordonnées de contact enregistrées' });
                this.chargerMesAffectations();
            },
            error: () => {
                this.enregistrementCoordonneesContactEnCours = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Enregistrement impossible' });
            }
        });
    }

    // --- Envoyer un message (panneau latéral, voir prototype validé sur la fiche Salarié) ---
    afficherComposeur = false;
    envoiMessageEnCours = false;
    // Renseigné uniquement quand le composeur a été ouvert via "Demander" sur une ou
    // plusieurs lignes de document (sélection groupée, voir demanderDocuments) — permet
    // au destinataire de déposer un fichier pour chacun directement depuis le message reçu
    // (voir message-detail-page).
    documentsDemandesEnCours: string[] = [];
    // Cases cochées dans la liste "À fournir" (voir ligneDocument), avant d'appuyer sur
    // "Demander la sélection" — se vide après l'envoi.
    documentsSelectionnesDemande = new Set<string>();
    tousUtilisateurs: Utilisateur[] = [];
    // Parité d'affichage avec le site legacy (logo, balises, bloc coordonnées) :
    // pas de colonne backend correspondante, rien n'est envoyé au serveur pour ce champ.
    fichierModeleNom: string | null = null;
    messageForm = this.fb.group({
        sujet: ['', Validators.required],
        contenu: [this.modeleParDefaut(), Validators.required],
        copieAdmin: [false]
    });

    get libellesDocumentsDemandes(): string[] {
        return this.documentsDemandesEnCours.map((id) => this.typesPourEntreprise.find((t) => t.id === id)?.libelle ?? id);
    }

    // Retirer un document de la demande en cours d'écriture — n'annule pas l'envoi, juste
    // cette référence-là (le message reste envoyable, sans ce document en moins dans la liste).
    retirerDocumentDemande(typeId: string) {
        this.documentsDemandesEnCours = this.documentsDemandesEnCours.filter((id) => id !== typeId);
    }

    toggleSelectionDocument(typeId: string) {
        if (this.documentsSelectionnesDemande.has(typeId)) {
            this.documentsSelectionnesDemande.delete(typeId);
        } else {
            this.documentsSelectionnesDemande.add(typeId);
        }
    }

    get toutSelectionneDemande(): boolean {
        return this.typesAFournir.length > 0 && this.typesAFournir.every((t) => this.documentsSelectionnesDemande.has(t.id));
    }

    toggleToutSelectionnerDemande() {
        if (this.toutSelectionneDemande) {
            this.documentsSelectionnesDemande.clear();
        } else {
            this.typesAFournir.forEach((t) => this.documentsSelectionnesDemande.add(t.id));
        }
    }

    demanderSelection() {
        this.demanderDocuments(this.typesAFournir.filter((t) => this.documentsSelectionnesDemande.has(t.id)));
    }

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
        private affectationSalarieService: AffectationSalarieChantierService,
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

    // --- Affichage lecture seule (Client/Contrôleur, et Entreprise pour ses informations
    // légales — l'Entreprise peut éditer ses propres coordonnées, voir editerCoordonnees) ---
    nomPays(id?: string): string {
        return this.pays.find((p) => p.id === id)?.nom ?? '—';
    }

    nomCorpsDeMetier(id?: string): string {
        return this.corpsDeMetiers.find((c) => c.id === id)?.libelle ?? '—';
    }

    // --- Bandeau d'en-tête SUPER_ADMIN (voir prototype validé) : reprend tel quel les
    // chiffres déjà calculés pour la carte Documents/Affectation/Salariés plus bas — aucune
    // donnée de plus à charger, juste remontée en haut de page. Même traitement que les
    // fiches Client et Chantier.
    get entrepriseInitiales(): string {
        const mots = (this.entreprise?.raisonSociale ?? '').trim().split(/\s+/).filter(Boolean);
        if (mots.length === 0) {
            return '?';
        }
        return mots.length === 1 ? mots[0].slice(0, 2).toUpperCase() : (mots[0][0] + mots[1][0]).toUpperCase();
    }

    get nbAffectationsActives(): number {
        return this.mesAffectations.filter((a) => a.statut === 'ACTIF').length;
    }

    initialesUtilisateur(u: Utilisateur): string {
        const p = (u.prenom || '').trim();
        const n = (u.nom || '').trim();
        return ((p[0] ?? '') + (n[0] ?? '')).toUpperCase() || '?';
    }

    annulerEditionCoordonnees() {
        if (this.entreprise) {
            this.coordonneesForm.patchValue(this.entreprise);
        }
        this.editerCoordonnees = false;
    }

    // --- Vue Entreprise (prototype validé) : indicateurs + navigation vers la source ---
    // Circonférence fixe de l'anneau SVG (viewBox 36x36, rayon 15.5 — voir brand.scss
    // .ent-stat-ring / .ent-doc-progress-ring) : 2πr ≈ 97.39.
    private readonly RING_CIRCONFERENCE = 2 * Math.PI * 15.5;

    ringDashoffset(pourcentage: number): number {
        const clamped = Math.min(100, Math.max(0, pourcentage || 0));
        return this.RING_CIRCONFERENCE * (1 - clamped / 100);
    }

    get nbSalariesActifs(): number {
        return this.salaries.filter((s) => s.statut === 'ACTIF').length;
    }

    get nbDocumentsExpirantBientot(): number {
        return this.typesDejaFournis.filter((t) => this.expireBientot(this.documentsByType[t.id])).length;
    }

    /** Sévérité visuelle d'une ligne document fournie (liseré + icône, voir .ent-doc-row dans
        brand.scss) — un document "En attente"/"Refusé"/expiré ne doit jamais paraître aussi
        conforme qu'un document réellement validé, même s'il a un fichier attaché. */
    documentSeverite(document: DocumentItem): 'ok' | 'missing' | 'danger' {
        if (this.estExpire(document) || document.statutValidation === 'REFUSE') {
            return 'danger';
        }
        if (document.statutValidation !== 'VALIDE' || this.expireBientot(document)) {
            return 'missing';
        }
        return 'ok';
    }

    /** Ancre de page (stat "Documents"/"Sous-traitants" du bandeau d'en-tête) plutôt qu'un
        changement de route — l'information est déjà sur cette page, un simple scroll suffit. */
    scrollVersSection(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    get isEntreprise(): boolean {
        return this.auth.hasRole('ENTREPRISE');
    }

    get isClient(): boolean {
        return this.auth.hasRole('CLIENT');
    }

    // --- Vue Client (lecture seule) : cette entreprise vue par un compte Client. Les
    // affectations viennent de la même source que la vue Entreprise (chargerMesAffectations,
    // GET /entreprises/{id}/chantiers) mais sont désormais filtrées côté backend au périmètre
    // du client appelant (voir EntrepriseController.listerChantiers) — pas de filtrage
    // supplémentaire à faire ici, mesAffectations = déjà "mes chantiers en commun". ---

    get roleClient(): string {
        const roles = [...new Set(this.mesAffectations.map((a) => a.role))];
        if (roles.length === 0) {
            return '—';
        }
        return roles.length === 1 ? roles[0] : 'Plusieurs rôles';
    }

    // Aperçus limités à 7 lignes (voir retour client) : le détail complet reste à un clic
    // via "Voir tout" → /chantiers ou /salaries, déjà scopés par le backend au périmètre
    // exact de ce compte (accès total ou responsable de chantier) — mesAffectations reste
    // inchangée et non tronquée pour la vue Entreprise (roleClient, sous-traitants, etc.).
    get mesAffectationsClientApercu(): Array<AffectationEntrepriseChantier & { nomChantierCalculee: string }> {
        return this.mesAffectations.slice(0, 7);
    }

    get salariesSurMesChantiersClientApercu(): Array<{ salarieId: string; nom: string; contrat: string; chantierNom: string; statutAcces: StatutAcces }> {
        return this.salariesSurMesChantiersClient.slice(0, 7);
    }

    libelleContrat(id?: string): string {
        return this.typesContrat.find((t) => t.id === id)?.libelle ?? '—';
    }

    libelleFonction(id?: string): string {
        return this.fonctions.find((f) => f.id === id)?.libelle ?? '—';
    }

    ngOnInit(): void {
        // Abonnement plutôt que snapshot ponctuel : cliquer un autre chantier depuis la liste
        // "Affectations" (voir template) revient sur CETTE MÊME fiche (même entrepriseId),
        // Angular réutilise alors l'instance du composant sans relancer ngOnInit — seul un
        // abonnement aux query params capte le changement de contexteChantierId et recharge
        // documents/historique/relances pour le nouveau chantier.
        this.route.queryParamMap.subscribe((params) => {
            const nouveauChantierId = params.get('chantierId');
            if (nouveauChantierId === this.contexteChantierId) {
                return;
            }
            this.contexteChantierId = nouveauChantierId;
            if (!this.entrepriseId) {
                // Premier chargement : chargerDocuments()/historique le liront eux-mêmes
                // plus bas via route.paramMap.subscribe, pas besoin de les redéclencher ici.
                return;
            }
            this.chargerDocuments();
            this.chargerSalaries(this.entrepriseId);
            this.emailContactChantier = this.affectationContexte?.emailContact ?? '';
            this.telephoneContactChantier = this.affectationContexte?.telephoneContact ?? '';
            this.adresseContactChantier = this.affectationContexte?.adresseContact ?? '';
            this.historiqueCharge = false;
            this.relancesChargees = false;
            this.messagesHistoriqueCharges = false;
            if (this.afficherHistorique) {
                this.documentService.historiqueParEntreprise(this.entrepriseId, this.contexteChantierId ?? undefined).subscribe((h) => {
                    this.historique = h;
                    this.historiqueCharge = true;
                });
            }
            if (this.afficherRelances) {
                this.documentService.relancesParEntreprise(this.entrepriseId, this.contexteChantierId ?? undefined).subscribe((r) => {
                    this.relances = r;
                    this.relancesChargees = true;
                });
            }
            if (this.afficherMessagesHistorique) {
                this.messagerieService.historique('ENTREPRISE', this.entrepriseId,
                    { chantierId: this.contexteChantierId ?? undefined }).subscribe((m) => {
                    this.messagesHistorique = m;
                    this.messagesHistoriqueCharges = true;
                });
            }
        });
        this.referenceDataService.listerPays().subscribe((pays) => {
            this.pays = pays;
            // Les salariés peuvent déjà être chargés à ce stade (ordre des appels non
            // garanti) : recalcule leur zoneCalculee (voir chargerSalaries) plutôt que de
            // les laisser figés sur "zone inconnue" jusqu'au prochain rechargement.
            this.salaries = this.salaries.map((s) => ({ ...s, zoneCalculee: this.zoneDuPays(s.nationalitePaysId) }));
            this.salariesListeAffichee = this.salariesListeAffichee.map((s) => ({ ...s, zoneCalculee: this.zoneDuPays(s.nationalitePaysId) }));
        });
        this.referenceDataService.listerCorpsDeMetier().subscribe((c) => (this.corpsDeMetiers = c));
        this.referenceDataService.listerTypeContratSalarie().subscribe((types) => (this.typesContrat = types));
        this.referenceDataService.listerSalarieFonction().subscribe((fonctions) => (this.fonctions = fonctions));
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
                if (this.isClient) {
                    this.chargerSalariesClient(id);
                }
            }
        });
    }

    /** Statut d'accès par chantier (voir salariesSurMesChantiersClient) : introuvable sur
        GET /salaries (qui ne renvoie qu'un "chantier actuel" en texte), donc un aller par
        chantier en commun sur GET /chantiers/{id}/salaries — déjà scopé Client côté
        backend (voir AffectationSalarieChantierController), pas de filtrage à refaire ici
        au-delà de "cette entreprise" (l'endpoint renvoie tous les salariés du chantier). */
    private chargerSalariesClient(entrepriseId: string) {
        this.chargementSalariesClient = true;
        this.affectationService.listerParEntreprise(entrepriseId).subscribe({
            next: (affectationsEntreprise) => {
                const chantierIds = [...new Set(affectationsEntreprise.map((a) => a.chantierId))];
                if (chantierIds.length === 0) {
                    this.salariesSurMesChantiersClient = [];
                    this.chargementSalariesClient = false;
                    return;
                }
                forkJoin(chantierIds.map((id) => this.affectationSalarieService.lister(id))).subscribe({
                    next: (listesParChantier) => {
                        const lignes: Array<{ salarieId: string; nom: string; contrat: string; chantierNom: string; statutAcces: StatutAcces }> = [];
                        listesParChantier.forEach((liste, i) => {
                            const chantierId = chantierIds[i];
                            liste.filter((a) => a.entrepriseId === entrepriseId).forEach((a) => {
                                const salarie = this.salaries.find((s) => s.id === a.salarieId);
                                lignes.push({
                                    salarieId: a.salarieId,
                                    nom: salarie ? `${salarie.prenom} ${salarie.nom}` : '—',
                                    contrat: this.libelleContrat(salarie?.typeContratId),
                                    chantierNom: this.nomChantier(chantierId),
                                    statutAcces: a.statutAcces
                                });
                            });
                        });
                        this.salariesSurMesChantiersClient = lignes;
                        this.chargementSalariesClient = false;
                    },
                    error: () => (this.chargementSalariesClient = false)
                });
            },
            error: () => (this.chargementSalariesClient = false)
        });
    }

    // Charge TOUJOURS l'ensemble complet (salaries) — en-têtes/chargerSalariesClient en ont
    // besoin non filtré. En plus, quand un chantier est en contexte (voir contexteChantierId),
    // charge séparément salariesListeAffichee filtrée à CE chantier pour les cartes "Salariés" —
    // deux appels distincts (pas de filtrage côté client à partir de `salaries`) car un salarié
    // de cette entreprise sur un AUTRE chantier ne doit jamais transiter, même un instant, par
    // le navigateur de quelqu'un qui n'est censé voir que ce chantier-ci.
    chargerSalaries(entrepriseId: string) {
        this.salarieService.lister(entrepriseId).subscribe((salaries) => {
            this.salaries = salaries.map((s) => ({ ...s, identiteCalculee: `${s.prenom} ${s.nom}`, zoneCalculee: this.zoneDuPays(s.nationalitePaysId) }));
            if (!this.contexteChantierId) {
                this.salariesListeAffichee = this.salaries;
            }
        });
        if (this.contexteChantierId) {
            this.salarieService.lister(entrepriseId, this.contexteChantierId).subscribe((salaries) => {
                this.salariesListeAffichee = salaries.map((s) => ({ ...s, identiteCalculee: `${s.prenom} ${s.nom}`, zoneCalculee: this.zoneDuPays(s.nationalitePaysId) }));
            });
        }
        this.chargerAffectationsSalarieContexte();
    }

    /** Statut d'accès/EPI/badge/date de début par salarié, pour LE chantier en contexte —
        voir affectationParSalarieId. Vide (aucune donnée "terrain" affichée) tant qu'aucun
        chantier n'est en contexte : sans lui, plusieurs affectations pourraient exister pour
        un même salarié et aucune ne serait LA bonne réponse. */
    private chargerAffectationsSalarieContexte() {
        this.affectationParSalarieId = {};
        if (!this.contexteChantierId || !this.entrepriseId) {
            return;
        }
        const chantierId = this.contexteChantierId;
        const entrepriseId = this.entrepriseId;
        this.affectationSalarieService.lister(chantierId).subscribe((affectations) => {
            const map: Record<string, AffectationSalarieChantier> = {};
            affectations.filter((a) => a.entrepriseId === entrepriseId).forEach((a) => (map[a.salarieId] = a));
            this.affectationParSalarieId = map;
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
            email2: value.email2 ?? undefined,
            email3: value.email3 ?? undefined,
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
                    forkJoin({
                        documents: this.enregistrerDocumentsInitiaux(entreprise.id).pipe(catchError(() => of('erreur'))),
                        affectations: this.enregistrerAffectationsInitiales(entreprise.id).pipe(catchError(() => of('erreur')))
                    }).subscribe(({ documents, affectations }) => {
                        if (documents === 'erreur' || affectations === 'erreur') {
                            const cible = documents === 'erreur' && affectations === 'erreur' ? 'de certains documents et affectations'
                                : documents === 'erreur' ? 'de certains documents' : 'de certaines affectations';
                            this.message.add({
                                severity: 'error', summary: 'Erreur',
                                detail: `Entreprise créée, mais l'enregistrement ${cible} a échoué.`
                            });
                        }
                        this.finaliserCreationEntreprise(entreprise.id);
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
                    this.coordonneesForm.patchValue(entreprise);
                    this.editerCoordonnees = false;
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
            this.recalculerSousTraitants();
            // Reflète les coordonnées de contact déjà enregistrées pour l'affectation du
            // contexte chantier courant (voir affectationContexte / enregistrerCoordonneesContact).
            this.emailContactChantier = this.affectationContexte?.emailContact ?? '';
            this.telephoneContactChantier = this.affectationContexte?.telephoneContact ?? '';
            this.adresseContactChantier = this.affectationContexte?.adresseContact ?? '';
        });
    }

    /** Sous-traitants directs (affectationParenteId = une de MES affectations) sur chacun de
        mes chantiers. GET /chantiers/{id}/entreprises est ouvert à l'entreprise affectée (voir
        AffectationEntrepriseChantierController), donc pas besoin de droits supplémentaires. */
    private recalculerSousTraitants() {
        if (this.mesAffectations.length === 0) {
            this.sousTraitants = [];
            return;
        }
        const mesAffectationIds = new Set(this.mesAffectations.map((a) => a.id));
        const chantierIds = [...new Set(this.mesAffectations.map((a) => a.chantierId))];
        forkJoin(chantierIds.map((id) => this.affectationService.lister(id))).subscribe((listesParChantier) => {
            const toutes = listesParChantier.flat();
            this.sousTraitants = toutes
                .filter((a) => a.affectationParenteId && mesAffectationIds.has(a.affectationParenteId))
                .map((a) => ({ ...a, nomChantierCalculee: this.nomChantier(a.chantierId) }));
            // Lien d'appartenance (voir nomRattachement) : la raison sociale du parent n'est
            // connue que via CETTE liste par chantier (toutes les affectations dessus), pas
            // via mesAffectations qui ne contient que les MIENNES.
            this.parentNomParAffectationId = {};
            for (const a of toutes) {
                this.parentNomParAffectationId[a.id] = a.raisonSocialeEntreprise ?? this.nomEntreprise(a.entrepriseId);
            }
        });
    }

    nomSousTraitant(affectation: AffectationEntrepriseChantier): string {
        return affectation.raisonSocialeEntreprise ?? this.nomEntreprise(affectation.entrepriseId);
    }

    /** "Rattachée à" (lien d'appartenance, demande client) : nom de l'entreprise PRINCIPALE
        pour un STT1, ou du STT1 pour un STT2 — "—" pour une PRINCIPALE (rien au-dessus) ou
        tant que recalculerSousTraitants n'a pas encore résolu le lot de chantiers concernés. */
    nomRattachement(affectation: AffectationEntrepriseChantier): string {
        if (!affectation.affectationParenteId) {
            return '—';
        }
        return this.parentNomParAffectationId[affectation.affectationParenteId] ?? '—';
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
        const affectationParenteId = value.role === 'PRINCIPALE' ? undefined : (value.affectationParenteId || undefined);

        // Entreprise pas encore créée (voir isNew) : rien à affecter côté serveur tant
        // qu'il n'y a pas d'entrepriseId — mis en attente, envoyé après la création
        // (voir enregistrerAffectationsInitiales).
        if (this.isNew) {
            this.affectationsInitiales.push({
                chantierId: value.chantierId!,
                nomChantierCalculee: this.nomChantier(value.chantierId!),
                role: value.role!,
                affectationParenteId,
                nomParenteCalculee: affectationParenteId
                    ? this.parentsDisponibles.find((p) => p.id === affectationParenteId)?.label
                    : undefined
            });
            this.affectationForm.reset({ chantierId: '', role: 'PRINCIPALE', affectationParenteId: '' });
            return;
        }

        this.affectationService.affecter(value.chantierId!, {
            entrepriseId: this.entrepriseId!,
            role: value.role!,
            affectationParenteId
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

    retirerAffectationInitiale(index: number) {
        this.affectationsInitiales.splice(index, 1);
    }

    /** Envoie les affectations mises en attente pendant la création (voir submitAffectation
        / isNew) juste après que l'entreprise obtienne un id — même principe que
        enregistrerDocumentsInitiaux. Séquentiel plutôt qu'un forkJoin : un STT1/STT2 peut
        dépendre d'une affectation créée juste avant dans le même lot (rattachée à une
        PRINCIPALE ajoutée dans ce même formulaire), donc l'ordre de saisie doit être respecté. */
    private enregistrerAffectationsInitiales(entrepriseId: string): Observable<unknown> {
        if (this.affectationsInitiales.length === 0) {
            return of(null);
        }
        return this.affectationsInitiales.reduce(
            (chaine, a) => chaine.pipe(switchMap(() => this.affectationService.affecter(a.chantierId, {
                entrepriseId,
                role: a.role,
                affectationParenteId: a.affectationParenteId
            }))),
            of(null) as Observable<unknown>
        );
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
        const zone = this.zoneDuPays(paysId);
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
            if (t.zoneRequise && t.zoneRequise !== zone) {
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
                this.lignesDocument[t.id] = { fichierUrl: '', fichier: null };
            }
        }
        this.typesAFournir = this.typesPourEntreprise.filter((t) => t.obligatoire && !this.documentsByType[t.id]);
        this.typesDejaFournis = this.typesPourEntreprise.filter((t) => this.documentsByType[t.id]);
        this.typesOptionnelsRestants = this.typesPourEntreprise.filter((t) => !t.obligatoire && !this.documentsByType[t.id]);
        this.nbObligatoiresTotal = this.typesPourEntreprise.filter((t) => t.obligatoire).length;
        this.nbObligatoiresFournis = this.nbObligatoiresTotal - this.typesAFournir.length;
        this.pourcentageObligatoires = this.nbObligatoiresTotal === 0 ? 100
            : Math.round((this.nbObligatoiresFournis / this.nbObligatoiresTotal) * 100);
    }

    private zoneDuPays(paysId: string | undefined): string | undefined {
        return paysId ? this.pays.find((p) => p.id === paysId)?.zone : undefined;
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

    // Signale un document déjà validé qui arrive à échéance, directement sur sa ligne —
    // avant, seul le système de Relances (configuré à part par l'admin) le rattrapait,
    // souvent des jours après (voir audit UX).
    private joursAvantExpiration(document: DocumentItem | undefined): number | null {
        if (!document?.dateExpiration) {
            return null;
        }
        const aujourdHui = new Date();
        aujourdHui.setHours(0, 0, 0, 0);
        const expiration = new Date(document.dateExpiration);
        expiration.setHours(0, 0, 0, 0);
        return Math.round((expiration.getTime() - aujourdHui.getTime()) / (1000 * 60 * 60 * 24));
    }

    expireBientot(document: DocumentItem | undefined): boolean {
        if (document?.statutValidation !== 'VALIDE') {
            return false;
        }
        const jours = this.joursAvantExpiration(document);
        return jours !== null && jours >= 0 && jours <= 30;
    }

    estExpire(document: DocumentItem | undefined): boolean {
        if (document?.statutValidation !== 'VALIDE') {
            return false;
        }
        const jours = this.joursAvantExpiration(document);
        return jours !== null && jours < 0;
    }

    libelleExpiration(document: DocumentItem | undefined): string {
        const jours = this.joursAvantExpiration(document);
        if (jours === null) {
            return '';
        }
        return jours === 0 ? "Expire aujourd'hui" : `Expire dans ${jours} jour(s)`;
    }

    onFichierChoisi(fichier: File | null, typeId: string) {
        this.lignesDocument[typeId].fichier = fichier;
        this.lignesDocument[typeId].fichierUrl = fichier ? fichier.name : '';
    }

    ouvrirApercu(document: DocumentItem) {
        this.documentAPrevisualiser = document;
        this.dialogApercuVisible = true;
    }

    onFiltreObligatoireChange() {
        this.recalculerTypesPourEntreprise();
    }

    onFiltreTexteChange() {
        this.recalculerTypesPourEntreprise();
    }

    // Remplace l'ancien "N documents cachés" (repli) et l'ancien filtre qui masquait
    // entièrement les documents manquants à l'administrateur (item 4 du cahier des
    // charges) : désormais l'admin voit "à fournir" (nécessaire pour créer/compléter
    // la fiche) mais pas les optionnels manquants, repliés dans leur propre groupe —
    // ça garde l'esprit de la règle (ne pas noyer l'admin sous les optionnels) sans
    // l'empêcher de voir ce qui est réellement requis. Voir typesAFournir/typesDejaFournis
    // /typesOptionnelsRestants, recalculés dans recalculerTypesPourEntreprise().

    // Point d'entrée pour demander un ou plusieurs documents manquants : un bouton
    // directement sur chaque ligne de la checklist (voir ligneDocument) pour une demande
    // rapide, ou une sélection groupée via les cases à cocher + "Demander la sélection"
    // (voir toggleSelectionDocument/demanderSelection) — un seul message pour plusieurs
    // documents à la fois, plutôt qu'un message par document.
    demanderDocuments(types: TypeDocument[]) {
        if (types.length === 0) {
            return;
        }
        const nomEntreprise = this.entreprise ? this.entreprise.raisonSociale : '';
        this.messageForm.patchValue({
            sujet: types.length === 1
                ? `Document à fournir — ${nomEntreprise}`
                : `${types.length} documents à fournir — ${nomEntreprise}`,
            contenu: this.modeleDemandeDocuments(types.map((t) => `<li>${t.libelle}</li>`).join(''))
        });
        this.documentsDemandesEnCours = types.map((t) => t.id);
        this.documentsSelectionnesDemande.clear();
        this.afficherComposeur = true;
    }

    // Recalcule le modèle par défaut au moment de l'ouverture (pas seulement à la
    // construction du composant, quand ni l'entreprise ni le contexte chantier ne sont
    // encore connus) — remplace le "afficherComposeur = true" en dur sur le bouton
    // "Nouveau message" pour que le sujet/contenu soient toujours à jour.
    ouvrirComposeur() {
        this.documentsDemandesEnCours = [];
        this.messageForm.patchValue({ sujet: '', contenu: this.modeleParDefaut() });
        this.afficherComposeur = true;
    }

    // Appelé sur (onHide) du panneau — couvre toutes les façons de le fermer (bouton
    // Annuler, croix, Échap, clic en dehors), pas seulement le bouton Annuler.
    fermerComposeur() {
        this.documentsDemandesEnCours = [];
    }

    // Date réelle du jour, pas le jeton [DATE] laissé tel quel — le destinataire ne doit
    // jamais voir un placeholder non résolu dans un message envoyé.
    private formaterDateAujourdhui(): string {
        return new Date().toLocaleDateString('fr-FR');
    }

    private modeleDemandeDocuments(listeDocumentsHtml: string): string {
        return `
<p><img src="assets/layout/images/admincontrol-logo.png" alt="ADMIN-CONTROL'BTP" style="max-width:200px;" /></p>
<p>Date :<br /><strong>${this.formaterDateAujourdhui()}</strong></p>
<p>Entreprise :<br /><strong>${this.entreprise ? this.entreprise.raisonSociale : '[ENTREPRISE_NOM]'}</strong></p>
${this.contexteChantierNom ? `<p>Chantier :<br /><strong>${this.contexteChantierNom}</strong></p>` : ''}
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
            .every((t) => !!this.lignesDocument[t.id]?.fichier);
    }

    private enregistrerDocumentsInitiaux(entrepriseId: string): Observable<unknown> {
        const appels = this.typesPourEntreprise
            .filter((t) => this.lignesDocument[t.id]?.fichier)
            .map((t) => {
                const ligne = this.lignesDocument[t.id];
                // Les dates de validité ne sont saisies que par l'administrateur, au moment
                // de la validation (voir confirmerValidation) — jamais au dépôt.
                return this.documentService.creer({ typeDocumentId: t.id, entrepriseId }, ligne.fichier);
            });
        return appels.length > 0 ? forkJoin(appels) : of(null);
    }

    renseignerDocument(type: TypeDocument) {
        const ligne = this.lignesDocument[type.id];
        this.documentService.creer({
            typeDocumentId: type.id,
            entrepriseId: this.entrepriseId!,
            // Chantier en contexte (voir contexteChantierId) : sans lui, le document reste
            // global à l'entreprise — voulu uniquement pour les documents d'identité déposés
            // hors de tout contexte chantier (ex: à la création de l'entreprise).
            chantierId: this.contexteChantierId ?? undefined
        }, ligne.fichier).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Document enregistré' });
                this.chargerDocuments();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Enregistrement impossible' })
        });
    }

    // --- Validation (dates de validité saisies par l'administrateur, voir item 5) ---

    ouvrirValidation(document: DocumentItem) {
        this.documentAValider = document;
        this.dialogValiderVisible = true;
    }

    get typeDuDocumentAValider(): TypeDocument | undefined {
        return this.documentAValider ? this.types.find((t) => t.id === this.documentAValider!.typeDocumentId) : undefined;
    }

    confirmerValidation(dates: { dateDebutValidite: Date | null; dateExpiration: Date | null }) {
        if (!this.documentAValider) {
            return;
        }
        this.documentService.valider(this.documentAValider.id, {
            dateDebutValidite: dates.dateDebutValidite ? this.toIsoDate(dates.dateDebutValidite) : undefined,
            dateExpiration: dates.dateExpiration ? this.toIsoDate(dates.dateExpiration) : undefined
        }).subscribe({
            next: () => {
                this.documentAValider = null;
                this.chargerDocuments();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Validation impossible' })
        });
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
            this.documentService.historiqueParEntreprise(this.entrepriseId!, this.contexteChantierId ?? undefined).subscribe((h) => {
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
            this.documentService.relancesParEntreprise(this.entrepriseId!, this.contexteChantierId ?? undefined).subscribe((r) => {
                this.relances = r;
                this.relancesChargees = true;
            });
        }
    }

    // --- Historique des messages ---

    basculerMessagesHistorique() {
        this.afficherMessagesHistorique = !this.afficherMessagesHistorique;
        if (this.afficherMessagesHistorique && !this.messagesHistoriqueCharges) {
            this.messagerieService.historique('ENTREPRISE', this.entrepriseId!,
                { chantierId: this.contexteChantierId ?? undefined }).subscribe((m) => {
                this.messagesHistorique = m;
                this.messagesHistoriqueCharges = true;
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
<p>Date :<br /><strong>${this.formaterDateAujourdhui()}</strong></p>
<p>Entreprise :<br /><strong>${this.entreprise ? this.entreprise.raisonSociale : '[ENTREPRISE_NOM]'}</strong></p>
${this.contexteChantierNom ? `<p>Chantier :<br /><strong>${this.contexteChantierNom}</strong></p>` : ''}
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
        const ajouter = (type: SendMessageRequest['destinataireType'], id: string, avecReferenceDocument: boolean) => {
            cibles.set(`${type}:${id}`, {
                destinataireType: type, destinataireId: id, sujet: value.sujet!, contenu: value.contenu!,
                // La référence document n'a de sens que pour le vrai destinataire (l'entreprise
                // qui doit déposer le(s) fichier(s)) — pas pour la copie informative à l'admin.
                typeDocumentIds: avecReferenceDocument && this.documentsDemandesEnCours.length > 0 ? this.documentsDemandesEnCours : undefined,
                // Chantier d'où le message a été composé (voir contexteChantierId) — rattache
                // le message à CE chantier précis dans l'historique, pas seulement à
                // l'entreprise en général.
                chantierId: this.contexteChantierId ?? undefined
            });
        };
        ajouter('ENTREPRISE', this.entrepriseId, true);
        if (value.copieAdmin) {
            this.tousUtilisateurs.filter((u) => u.roles.includes('SUPER_ADMIN')).forEach((u) => ajouter('UTILISATEUR', u.id, false));
        }

        this.envoiMessageEnCours = true;
        forkJoin(Array.from(cibles.values()).map((requete) => this.messagerieService.envoyer(requete))).subscribe({
            next: () => {
                this.envoiMessageEnCours = false;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Message envoyé' });
                this.messageForm.reset({ sujet: '', contenu: this.modeleParDefaut(), copieAdmin: false });
                this.afficherComposeur = false;
                this.documentsDemandesEnCours = [];
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
