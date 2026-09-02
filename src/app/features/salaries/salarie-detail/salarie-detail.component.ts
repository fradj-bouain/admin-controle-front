import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable, forkJoin, of } from 'rxjs';
import { AffectationSalarieChantier, Salarie, StatutAcces } from '../models/salarie.model';
import { SalarieService } from '../services/salarie.service';
import { AffectationSalarieChantierService } from '../services/affectation-salarie-chantier.service';
import { Entreprise, AffectationEntrepriseChantier } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { AffectationEntrepriseChantierService } from 'src/app/features/entreprises/services/affectation-entreprise-chantier.service';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';
import { Pays, SalarieFonction, TypeContratSalarie } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { DocumentEtat, DocumentItem, HistoriqueModification, TypeDocument } from 'src/app/features/documents/models/document.model';
import { DocumentService } from 'src/app/features/documents/services/document.service';
import { TypeDocumentService } from 'src/app/features/documents/services/type-document.service';
import { DocumentEtatService } from 'src/app/features/documents/services/document-etat.service';
import { Message, MessagePlanifie, SendMessageRequest } from 'src/app/features/messagerie/models/message.model';
import { MessageService as MessagerieMessageService } from 'src/app/features/messagerie/services/message.service';
import { Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { SectionNavItem } from 'src/app/shared/components/section-nav/section-nav.component';

interface LigneDocument {
    fichierUrl: string;
    fichier: File | null;
}


@Component({
    selector: 'app-salarie-detail',
    templateUrl: './salarie-detail.component.html',
    providers: [MessageService, ConfirmationService]
})
export class SalarieDetailComponent implements OnInit {

    isNew = true;
    saving = false;
    loading = false;
    salarieId: string | null = null;
    salarie: Salarie | null = null;
    dialogBadgeVisible = false;

    pays: Pays[] = [];
    fonctions: SalarieFonction[] = [];
    entreprises: Entreprise[] = [];
    typesContrat: TypeContratSalarie[] = [];

    coordonneesForm = this.fb.group({
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        nationalitePaysId: [''],
        fonctionId: ['', Validators.required],
        entrepriseEmployeurId: ['', Validators.required],
        typeContratId: ['', Validators.required]
    });

    // --- Affectation à un chantier ---
    chantiers: Chantier[] = [];
    // nomChantierCalculee ajouté au chargement, pour permettre un p-columnFilter
    // texte simple sur le nom du chantier (le champ brut n'a que chantierId).
    mesAffectations: Array<AffectationSalarieChantier & { nomChantierCalculee: string }> = [];
    chantiersDisponibles: Chantier[] = [];
    affectationsEntrepriseDuChantier: AffectationEntrepriseChantier[] = [];

    affectationForm = this.fb.group({
        chantierId: ['', Validators.required],
        affectationEntrepriseChantierId: ['', Validators.required]
    });

    // --- Documents (check-list, repliée par défaut) ---
    documents: DocumentItem[] = [];
    types: TypeDocument[] = [];
    typesPourSalarie: TypeDocument[] = [];
    afficherDocuments = false;
    afficherObligatoireSeulement = false;
    filtreTexte = '';
    // Regroupement de la checklist (voir audit UX) : plutôt qu'un flux plat où
    // obligatoires et optionnels se mélangent, on sépare "à fournir" (obligatoire
    // manquant, l'action à faire), "déjà fournis" (pour suivre le statut) et
    // "optionnels" (repliés par défaut, jamais montré comme "caché"). Recalculés
    // ensemble dans recalculerTypesPourSalarie(), jamais via une getter — un
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

    // --- Historique des documents (repliée par défaut, chargée à la demande) ---
    historique: HistoriqueModification[] = [];
    afficherHistorique = false;
    private historiqueCharge = false;

    // --- Relances (repliée par défaut, chargée à la demande) ---
    relances: MessagePlanifie[] = [];
    afficherRelances = false;
    private relancesChargees = false;

    // --- Historique des messages envoyés à l'entreprise employeuse à propos de ce salarié
    // (repliée par défaut, chargée à la demande) — voir MessageService.historique côté
    // backend, filtré par salarieId (toujours renseigné depuis envoyerMessage ci-dessous). ---
    messagesHistorique: Message[] = [];
    afficherMessagesHistorique = false;
    private messagesHistoriqueCharges = false;

    // --- Rang de l'entreprise (Principale/STT1/STT2) sur le chantier actuel (affectationEnCours)
    // — résolu via AffectationEntrepriseChantier.role, absent de AffectationSalarieChantier
    // (qui ne référence qu'un affectationEntrepriseChantierId, voir modèle). ---
    rangSocieteActuel: string | null = null;

    // --- Accès réel au chantier actuel (voir carte "Accès au chantier actuel") : recalculé
    // à partir des documents obligatoires de CE salarié VALIDÉS PAR L'ADMIN, spécifiquement
    // pour affectationEnCours.chantierId — indépendant de contexteChantierId (qui suit la
    // navigation de l'admin, pas forcément le même chantier que l'affectation en cours).
    // Un refus explicite (statutAcces === REFUSE) reste prioritaire : l'admin garde la main
    // pour bloquer un accès même si les documents sont conformes. Ancien comportement :
    // la carte reflétait tel quel le bouton Accorder/Refuser cliqué manuellement, sans lien
    // avec les documents — pouvait afficher "Accordé" alors que rien n'était fourni/validé. ---
    accesChantierActuelCalcule: StatutAcces | null = null;

    // Chantier d'où vient l'admin, quand il a cliqué sur la ligne "salarié × chantier"
    // précise depuis la liste fusionnée (voir SalarieListComponent) — renseigné via
    // ?chantierId=... dans l'URL. Sert à ne plus jamais montrer "les autres chantiers"
    // sur cette fiche (redondant avec la liste, qui sert déjà à choisir le bon) et à
    // rattacher les messages envoyés d'ici à CE chantier précis.
    contexteChantierId: string | null = null;

    get contexteChantierNom(): string | undefined {
        return this.contexteChantierId ? this.chantiers.find((c) => c.id === this.contexteChantierId)?.nom : undefined;
    }

    // --- Envoyer un message (panneau latéral, voir prototype validé) ---
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
    utilisateurs: Utilisateur[] = [];
    // Parité d'affichage avec le site legacy (logo, balises, bloc coordonnées) :
    // pas de colonne backend correspondante, rien n'est envoyé au serveur pour ce champ.
    fichierModeleNom: string | null = null;
    messageForm = this.fb.group({
        sujet: ['', Validators.required],
        contenu: [this.modeleParDefaut(), Validators.required],
        copieAdmin: [false]
    });

    get entrepriseEmployeuse(): Entreprise | undefined {
        return this.salarie ? this.entreprises.find((e) => e.id === this.salarie!.entrepriseEmployeurId) : undefined;
    }

    get libellesDocumentsDemandes(): string[] {
        return this.documentsDemandesEnCours.map((id) => this.typesPourSalarie.find((t) => t.id === id)?.libelle ?? id);
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

    // Même mécanique que ci-dessus, pour les documents optionnels — retour client : le
    // bouton "Demander la sélection" n'était visible que dans la section "À fournir", donc
    // invisible dès qu'on cochait uniquement des optionnels (aucun obligatoire manquant).
    get toutSelectionneOptionnelsDemande(): boolean {
        return this.typesOptionnelsRestants.length > 0 && this.typesOptionnelsRestants.every((t) => this.documentsSelectionnesDemande.has(t.id));
    }

    toggleToutSelectionnerOptionnelsDemande() {
        if (this.toutSelectionneOptionnelsDemande) {
            this.typesOptionnelsRestants.forEach((t) => this.documentsSelectionnesDemande.delete(t.id));
        } else {
            this.typesOptionnelsRestants.forEach((t) => this.documentsSelectionnesDemande.add(t.id));
        }
    }

    // Couvre "À fournir" ET "Documents optionnels" — un document coché dans l'une ou
    // l'autre section part dans la même demande groupée (voir retour client : le bouton
    // ne regardait auparavant que les obligatoires manquants).
    demanderSelection() {
        const types = [...this.typesAFournir, ...this.typesOptionnelsRestants]
            .filter((t) => this.documentsSelectionnesDemande.has(t.id));
        this.demanderDocuments(types);
    }

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private salarieService: SalarieService,
        private affectationSalarieService: AffectationSalarieChantierService,
        private entrepriseService: EntrepriseService,
        private affectationEntrepriseService: AffectationEntrepriseChantierService,
        private utilisateurService: UtilisateurService,
        private chantierService: ChantierService,
        private referenceDataService: ReferenceDataService,
        private documentService: DocumentService,
        private typeDocumentService: TypeDocumentService,
        private documentEtatService: DocumentEtatService,
        private messagerieService: MessagerieMessageService,
        private confirmation: ConfirmationService,
        private message: MessageService,
        public auth: AuthService
    ) {
        this.affectationForm.controls.chantierId.valueChanges.subscribe((chantierId) => this.onChantierChange(chantierId));
        // Recalcule les documents obligatoires (ex. Titre de séjour) dès que la
        // nationalité change, y compris à la création avant tout enregistrement.
        this.coordonneesForm.controls.nationalitePaysId.valueChanges.subscribe(() => this.recalculerTypesPourSalarie());
    }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    // Navigation entre blocs (voir SectionNavComponent, demande client — prototype validé) :
    // "Historique" et "Nouveau message" n'y figurent pas, ce sont des panneaux latéraux
    // (basculerHistorique/ouvrirComposeur), pas des blocs à scroller — déjà leurs propres
    // boutons dans l'en-tête.
    get sectionsNavSalarie(): SectionNavItem[] {
        if (this.isNew) {
            return [];
        }
        return [
            { id: 'admin-coordonnees-salarie', label: 'Coordonnées', icon: 'user' },
            { id: 'admin-documents-salarie', label: 'Documents', icon: 'folder' },
            { id: 'admin-relances-salarie', label: 'Relances', icon: 'send' }
        ];
    }

    get isEntreprise(): boolean {
        return this.auth.hasRole('ENTREPRISE');
    }

    get isClient(): boolean {
        return this.auth.hasRole('CLIENT');
    }

    // --- Vue Client (lecture seule) : ce salarié vu par un compte Client. mesAffectations
    // vient de la même source que la vue Entreprise (chargerMesAffectations, GET
    // /salaries/{id}/chantiers) mais désormais scopée côté backend au périmètre du client
    // appelant (voir SalarieController.listerChantiers) — pas de filtrage supplémentaire ici.
    get mesAffectationsClientApercu(): Array<AffectationSalarieChantier & { nomChantierCalculee: string }> {
        return this.mesAffectations.slice(0, 7);
    }

    // --- Vue Entreprise (même design que la fiche entreprise, voir .ent-* dans brand.scss) ---
    nomFonction(id?: string): string {
        return this.fonctions.find((f) => f.id === id)?.libelle ?? '—';
    }

    nomTypeContrat(id?: string): string {
        return this.typesContrat.find((t) => t.id === id)?.libelle ?? '—';
    }

    /** Affectation en cours (pas de dateFin) parmi mesAffectations, déjà chargées pour cette
        page — pas besoin d'un aller-retour serveur supplémentaire (contrairement à la liste,
        obtenir() ne renvoie pas Salarie.chantierActuel). */
    get affectationEnCours(): (AffectationSalarieChantier & { nomChantierCalculee: string }) | undefined {
        return this.mesAffectations.find((a) => !a.dateFin);
    }

    // Bandeau d'en-tête SUPER_ADMIN (voir prototype validé) : mêmes 3 indicateurs déjà
    // utilisés par le bandeau vue Entreprise ci-dessus, juste remontés pour ce rôle aussi.
    get salarieInitiales(): string {
        const p = (this.salarie?.prenom ?? '').trim();
        const n = (this.salarie?.nom ?? '').trim();
        return ((p[0] ?? '') + (n[0] ?? '')).toUpperCase() || '?';
    }

    /** Initiales de l'aperçu à la création (voir prototype validé) — lues directement sur
        le formulaire encore non enregistré, contrairement à salarieInitiales ci-dessus. */
    get previewInitiales(): string {
        const p = (this.coordonneesForm.controls.prenom.value ?? '').trim();
        const n = (this.coordonneesForm.controls.nom.value ?? '').trim();
        return ((p[0] ?? '') + (n[0] ?? '')).toUpperCase() || '?';
    }

    private readonly RING_CIRCONFERENCE = 2 * Math.PI * 15.5;

    ringDashoffset(pourcentage: number): number {
        const clamped = Math.min(100, Math.max(0, pourcentage || 0));
        return this.RING_CIRCONFERENCE * (1 - clamped / 100);
    }

    get nbDocumentsExpirantBientot(): number {
        return this.typesDejaFournis.filter((t) => this.expireBientot(this.documentsByType[t.id])).length;
    }

    documentSeverite(document: DocumentItem): 'ok' | 'missing' | 'danger' {
        if (this.estExpire(document) || document.statutValidation === 'REFUSE') {
            return 'danger';
        }
        if (document.statutValidation !== 'VALIDE' || this.expireBientot(document)) {
            return 'missing';
        }
        return 'ok';
    }

    scrollVersSection(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    ngOnInit(): void {
        // Abonnement plutôt que snapshot ponctuel : deux lignes de la liste fusionnée peuvent
        // pointer vers le MÊME salarieId (même salarié, chantiers différents) — Angular
        // réutilise alors l'instance du composant sans relancer ngOnInit — seul un abonnement
        // aux query params capte le changement de contexteChantierId et recharge
        // documents/historique/relances pour le nouveau chantier.
        this.route.queryParamMap.subscribe((params) => {
            const nouveauChantierId = params.get('chantierId');
            if (nouveauChantierId === this.contexteChantierId) {
                return;
            }
            this.contexteChantierId = nouveauChantierId;
            if (!this.salarieId) {
                // Premier chargement : chargerDocuments()/historique le liront eux-mêmes
                // plus bas via route.paramMap.subscribe, pas besoin de les redéclencher ici.
                return;
            }
            this.chargerDocuments(this.salarieId);
            this.historiqueCharge = false;
            this.relancesChargees = false;
            this.messagesHistoriqueCharges = false;
            if (this.afficherHistorique) {
                this.documentService.historiqueParSalarie(this.salarieId, this.contexteChantierId ?? undefined).subscribe((h) => {
                    this.historique = h;
                    this.historiqueCharge = true;
                });
            }
            if (this.afficherRelances) {
                this.documentService.relancesParSalarie(this.salarieId, this.contexteChantierId ?? undefined).subscribe((r) => {
                    this.relances = r;
                    this.relancesChargees = true;
                });
            }
            if (this.afficherMessagesHistorique && this.salarie) {
                this.messagerieService.historique('ENTREPRISE', this.salarie.entrepriseEmployeurId,
                    { chantierId: this.contexteChantierId ?? undefined, salarieId: this.salarieId ?? undefined }).subscribe((m) => {
                    this.messagesHistorique = m;
                    this.messagesHistoriqueCharges = true;
                });
            }
        });
        this.referenceDataService.listerPays().subscribe((pays) => (this.pays = pays));
        this.referenceDataService.listerSalarieFonction().subscribe((fonctions) => (this.fonctions = fonctions));
        this.referenceDataService.listerTypeContratSalarie().subscribe((types) => (this.typesContrat = types));
        this.entrepriseService.lister().subscribe((entreprises) => (this.entreprises = entreprises));
        this.utilisateurService.lister().subscribe((utilisateurs) => (this.utilisateurs = utilisateurs));
        this.chantierService.lister().subscribe((chantiers) => {
            this.chantiers = chantiers;
            this.recalculerChantiersDisponibles();
        });
        this.typeDocumentService.lister().subscribe((types) => {
            this.types = types;
            this.recalculerTypesPourSalarie();
            this.recalculerAccesChantierActuel();
        });
        this.documentEtatService.lister().subscribe((etats) => {
            this.etats = etats;
            this.etatsPourRefus = etats.filter((e) => !e.valideLeDocument);
        });

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.salarieId = id;
            this.isNew = !id;
            if (id) {
                this.loading = true;
                this.chargerSalarie(id);
                this.chargerMesAffectations(id);
                this.chargerDocuments(id);
            } else {
                const preselectionnee = this.route.snapshot.queryParamMap.get('entrepriseId');
                if (preselectionnee) {
                    this.coordonneesForm.patchValue({ entrepriseEmployeurId: preselectionnee });
                }
            }
        });
    }

    private chargerSalarie(id: string) {
        this.salarieService.obtenir(id).subscribe({
            next: (s) => {
                this.salarie = s;
                this.coordonneesForm.patchValue(s);
                this.recalculerTypesPourSalarie();
                this.recalculerAccesChantierActuel();
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    /** Filtre les types de documents "SALARIE" par pays précis ou zone (FRANCE/UE/HORS_UE)
        ciblés, évalués contre la nationalité du salarié — ex : Titre de séjour obligatoire
        uniquement pour les salariés de nationalité Hors UE. */
    private recalculerTypesPourSalarie() {
        // Lu depuis le formulaire (pas this.salarie) : reste à jour dès que la nationalité
        // change dans l'UI, y compris à la création avant tout enregistrement.
        const paysId = this.coordonneesForm.value.nationalitePaysId || undefined;
        const zone = this.zoneDuPays(paysId);
        const texte = this.filtreTexte.trim().toLowerCase();
        this.typesPourSalarie = this.types.filter((t) => {
            if (t.cible !== 'SALARIE') {
                return false;
            }
            if (t.paysId && t.paysId !== paysId) {
                return false;
            }
            if (t.zoneRequise && t.zoneRequise !== zone) {
                return false;
            }
            if (this.afficherObligatoireSeulement && !t.obligatoire) {
                return false;
            }
            if (texte && !t.libelle.toLowerCase().includes(texte)) {
                return false;
            }
            return true;
        });
        // Validés et en attente (déjà fournis) remontent au-dessus des refusés
        // et des documents manquants, pour repérer d'un coup d'œil ce qui reste à traiter.
        this.typesPourSalarie.sort((a, b) => this.prioriteStatutDocument(a) - this.prioriteStatutDocument(b));
        for (const t of this.typesPourSalarie) {
            if (!this.lignesDocument[t.id]) {
                this.lignesDocument[t.id] = { fichierUrl: '', fichier: null };
            }
        }
        this.typesAFournir = this.typesPourSalarie.filter((t) => t.obligatoire && !this.documentsByType[t.id]);
        this.typesDejaFournis = this.typesPourSalarie.filter((t) => this.documentsByType[t.id]);
        this.typesOptionnelsRestants = this.typesPourSalarie.filter((t) => !t.obligatoire && !this.documentsByType[t.id]);
        this.nbObligatoiresTotal = this.typesPourSalarie.filter((t) => t.obligatoire).length;
        this.nbObligatoiresFournis = this.nbObligatoiresTotal - this.typesAFournir.length;
        this.pourcentageObligatoires = this.nbObligatoiresTotal === 0 ? 100
            : Math.round((this.nbObligatoiresFournis / this.nbObligatoiresTotal) * 100);
    }

    onFiltreTexteChange() {
        this.recalculerTypesPourSalarie();
    }

    onFiltreObligatoireChange() {
        this.recalculerTypesPourSalarie();
    }

    private zoneDuPays(paysId: string | undefined): string | undefined {
        return paysId ? this.pays.find((p) => p.id === paysId)?.zone : undefined;
    }

    nomEntreprise(id: string): string {
        return this.entreprises.find((e) => e.id === id)?.raisonSociale ?? id;
    }

    // --- Coordonnées ---

    submitCoordonnees() {
        if (this.coordonneesForm.invalid) {
            this.coordonneesForm.markAllAsTouched();
            return;
        }
        const value = this.coordonneesForm.getRawValue();
        const payload = {
            nom: value.nom!,
            prenom: value.prenom!,
            nationalitePaysId: value.nationalitePaysId || undefined,
            entrepriseEmployeurId: value.entrepriseEmployeurId!,
            typeContratId: value.typeContratId || undefined,
            fonctionId: value.fonctionId || undefined
        };
        // Plus de blocage à la création sur les documents obligatoires : la fiche peut être
        // créée vide (par le SUPER_ADMIN ou l'entreprise), les documents sont ajoutés après,
        // sur la fiche existante — documentsObligatoiresComplets() reste utilisé uniquement
        // pour l'indicateur visuel (bordure rouge) sur les lignes de documents manquants.
        this.saving = true;
        if (this.isNew) {
            this.salarieService.creer(payload).subscribe({
                next: (salarie) => {
                    this.enregistrerDocumentsInitiaux(salarie.id).subscribe({
                        next: () => this.router.navigate(['/salaries', salarie.id]),
                        error: () => {
                            this.message.add({
                                severity: 'error', summary: 'Erreur',
                                detail: 'Salarié créé, mais l\'enregistrement de certains documents a échoué.'
                            });
                            this.router.navigate(['/salaries', salarie.id]);
                        }
                    });
                },
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
                }
            });
        } else {
            this.salarieService.modifier(this.salarieId!, payload).subscribe({
                next: (salarie) => {
                    this.saving = false;
                    this.salarie = salarie;
                    this.message.add({ severity: 'success', summary: 'Succès', detail: 'Salarié modifié' });
                },
                error: () => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' });
                }
            });
        }
    }

    confirmerBasculeStatut() {
        if (!this.salarie) {
            return;
        }
        const salarie = this.salarie;
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (salarie.statut === 'ACTIF' ? 'désactiver' : 'activer') + ' ce salarié ?',
            accept: () => {
                const obs = salarie.statut === 'ACTIF'
                    ? this.salarieService.desactiver(salarie.id)
                    : this.salarieService.activer(salarie.id);
                obs.subscribe({
                    next: (s) => (this.salarie = s),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    // --- Affectation à un chantier ---

    chargerMesAffectations(salarieId: string) {
        this.affectationSalarieService.listerParSalarie(salarieId).subscribe((affectations) => {
            this.mesAffectations = [...affectations]
                .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut))
                .map((a) => ({ ...a, nomChantierCalculee: this.nomChantier(a.chantierId) }));
            this.recalculerChantiersDisponibles();
            this.recalculerRangSociete();
            this.recalculerAccesChantierActuel();
        });
    }

    /** Rang de l'entreprise (Principale/STT1/STT2) sur le chantier actuel — voir
        rangSocieteActuel. Résolu via GET /chantiers/{id}/entreprises (déjà existant),
        en cherchant l'affectation dont l'id correspond à affectationEnCours.affectationEntrepriseChantierId
        (AffectationSalarieChantier ne porte que cet id, jamais le rôle directement). */
    private recalculerRangSociete() {
        const affectation = this.affectationEnCours;
        if (!affectation) {
            this.rangSocieteActuel = null;
            return;
        }
        this.affectationEntrepriseService.lister(affectation.chantierId).subscribe((affectationsEntreprise) => {
            this.rangSocieteActuel = affectationsEntreprise
                .find((a) => a.id === affectation.affectationEntrepriseChantierId)?.role ?? null;
        });
    }

    /** Voir accesChantierActuelCalcule. Un refus explicite reste prioritaire ; sinon Accordé
        seulement si tous les documents obligatoires de ce salarié sont VALIDÉS (pas seulement
        déposés) pour affectationEnCours.chantierId précisément. */
    private recalculerAccesChantierActuel() {
        const affectation = this.affectationEnCours;
        if (!affectation || !this.salarieId) {
            this.accesChantierActuelCalcule = null;
            return;
        }
        if (affectation.statutAcces === 'REFUSE') {
            this.accesChantierActuelCalcule = 'REFUSE';
            return;
        }
        const paysId = this.salarie?.nationalitePaysId;
        const zone = this.zoneDuPays(paysId);
        const typesObligatoires = this.types.filter((t) =>
            t.cible === 'SALARIE' && t.obligatoire
            && (!t.paysId || t.paysId === paysId)
            && (!t.zoneRequise || t.zoneRequise === zone));
        this.documentService.listerParSalarieEtChantier(this.salarieId, affectation.chantierId).subscribe((documents) => {
            const idsValides = new Set(documents.filter((d) => d.statutValidation === 'VALIDE').map((d) => d.typeDocumentId));
            const tousValides = typesObligatoires.every((t) => idsValides.has(t.id));
            this.accesChantierActuelCalcule = tousValides ? 'ACCORDE' : 'EN_ATTENTE';
        });
    }

    private recalculerChantiersDisponibles() {
        const idsAffectes = new Set(this.mesAffectations.map((a) => a.chantierId));
        this.chantiersDisponibles = this.chantiers.filter((c) => !idsAffectes.has(c.id));
    }

    nomChantier(id: string): string {
        return this.chantiers.find((c) => c.id === id)?.nom ?? id;
    }

    nomEntrepriseAffectation(affectationEntrepriseChantierId: string): string {
        const affectation = this.affectationsEntrepriseDuChantier.find((a) => a.id === affectationEntrepriseChantierId);
        return affectation ? this.nomEntreprise(affectation.entrepriseId) : affectationEntrepriseChantierId;
    }

    private onChantierChange(chantierId: string | null) {
        this.affectationForm.patchValue({ affectationEntrepriseChantierId: '' }, { emitEvent: false });
        if (!chantierId) {
            this.affectationsEntrepriseDuChantier = [];
            return;
        }
        // Le salarié ne peut être affecté que via SON entreprise employeuse — pas
        // via une autre entreprise du même chantier (Principale/STT1/STT2/sous-
        // traitants). On restreint donc le choix aux affectations de son employeur,
        // au lieu de lister toutes les entreprises présentes sur le chantier.
        const entrepriseEmployeurId = this.salarie?.entrepriseEmployeurId ?? this.coordonneesForm.value.entrepriseEmployeurId;
        this.affectationEntrepriseService.lister(chantierId).subscribe((affectations) => {
            this.affectationsEntrepriseDuChantier = affectations
                .filter((a) => a.statut === 'ACTIF' && a.entrepriseId === entrepriseEmployeurId);
            if (this.affectationsEntrepriseDuChantier.length === 1) {
                this.affectationForm.patchValue({ affectationEntrepriseChantierId: this.affectationsEntrepriseDuChantier[0].id });
            }
        });
    }

    submitAffectation() {
        if (this.affectationForm.invalid) {
            this.affectationForm.markAllAsTouched();
            return;
        }
        const value = this.affectationForm.getRawValue();
        this.affectationSalarieService.affecter(value.chantierId!, {
            salarieId: this.salarieId!,
            affectationEntrepriseChantierId: value.affectationEntrepriseChantierId!
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Chantier affecté' });
                this.affectationForm.reset({ chantierId: '', affectationEntrepriseChantierId: '' });
                this.chargerMesAffectations(this.salarieId!);
            },
            error: (err) => this.message.add({
                severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Affectation impossible'
            })
        });
    }

    accorderAcces(affectation: AffectationSalarieChantier) {
        this.affectationSalarieService.accorderAcces(affectation.chantierId, affectation.id).subscribe({
            next: () => this.chargerMesAffectations(this.salarieId!),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    refuserAcces(affectation: AffectationSalarieChantier) {
        this.affectationSalarieService.refuserAcces(affectation.chantierId, affectation.id).subscribe({
            next: () => this.chargerMesAffectations(this.salarieId!),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    // --- Documents ---

    // Chantier en contexte (voir contexteChantierId) : la checklist devient celle de CE
    // chantier précis (documents indépendants d'un chantier à l'autre), au lieu de la
    // checklist globale du salarié — sinon deux chantiers différents affichaient et
    // permettaient de valider/refuser la MÊME ligne, un même document apparaissant
    // identique partout (bug signalé).
    chargerDocuments(salarieId: string) {
        const documents$ = this.contexteChantierId
            ? this.documentService.listerParSalarieEtChantier(salarieId, this.contexteChantierId)
            : this.documentService.listerParSalarie(salarieId);
        documents$.subscribe((documents) => {
            this.documents = documents;
            this.documentsByType = {};
            for (const d of documents) {
                this.documentsByType[d.typeDocumentId] = d;
            }
            this.recalculerTypesPourSalarie();
        });
    }

    // Remplace l'ancien "N documents cachés" (repli) et l'ancien filtre qui masquait
    // entièrement les documents manquants à l'administrateur (item 4 du cahier des
    // charges) : désormais l'admin voit "à fournir" (nécessaire pour créer/compléter
    // la fiche) mais pas les optionnels manquants, repliés dans leur propre groupe —
    // ça garde l'esprit de la règle (ne pas noyer l'admin sous les optionnels) sans
    // l'empêcher de voir ce qui est réellement requis. Voir typesAFournir/typesDejaFournis
    // /typesOptionnelsRestants, recalculés dans recalculerTypesPourSalarie().

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

    // Point d'entrée pour demander un ou plusieurs documents manquants : un bouton
    // directement sur chaque ligne de la checklist (voir ligneDocument) pour une demande
    // rapide, ou une sélection groupée via les cases à cocher + "Demander la sélection"
    // (voir toggleSelectionDocument/demanderSelection) — un seul message pour plusieurs
    // documents à la fois, plutôt qu'un message par document.
    demanderDocuments(types: TypeDocument[]) {
        if (types.length === 0) {
            return;
        }
        const nomSalarie = this.salarie ? this.salarie.prenom + ' ' + this.salarie.nom : '';
        this.messageForm.patchValue({
            sujet: types.length === 1
                ? `Document à fournir — ${nomSalarie}`
                : `${types.length} documents à fournir — ${nomSalarie}`,
            contenu: this.modeleDemandeDocuments(types.map((t) => `<li>${t.libelle}</li>`).join(''))
        });
        this.documentsDemandesEnCours = types.map((t) => t.id);
        this.documentsSelectionnesDemande.clear();
        this.afficherComposeur = true;
    }

    // Recalcule le modèle par défaut au moment de l'ouverture (pas seulement à la
    // construction du composant, quand ni le salarié ni le contexte chantier ne sont
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
<p>Salarié :<br /><strong>${this.salarie ? this.salarie.prenom + ' ' + this.salarie.nom : '[SALARIE_NOM]'}</strong></p>
${this.contexteChantierNom ? `<p>Chantier :<br /><strong>${this.contexteChantierNom}</strong></p>` : ''}
<p><br /></p>
<p>Madame, Monsieur,</p>
<p><br /></p>
<p>Merci de nous transmettre les documents suivants pour ce salarié :</p>
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
        return this.typesPourSalarie
            .filter((t) => t.obligatoire)
            .every((t) => !!this.lignesDocument[t.id]?.fichier);
    }

    private enregistrerDocumentsInitiaux(salarieId: string): Observable<unknown> {
        const appels = this.typesPourSalarie
            .filter((t) => this.lignesDocument[t.id]?.fichier)
            .map((t) => {
                const ligne = this.lignesDocument[t.id];
                // Les dates de validité ne sont saisies que par l'administrateur, au moment
                // de la validation (voir confirmerValidation) — jamais au dépôt.
                return this.documentService.creer({ typeDocumentId: t.id, salarieId }, ligne.fichier);
            });
        return appels.length > 0 ? forkJoin(appels) : of(null);
    }

    renseignerDocument(type: TypeDocument) {
        const ligne = this.lignesDocument[type.id];
        this.documentService.creer({
            typeDocumentId: type.id,
            salarieId: this.salarieId!,
            // Chantier en contexte (voir contexteChantierId) : sans lui, le document reste
            // global au salarié — c'est voulu uniquement pour les documents d'identité
            // déposés hors de tout contexte chantier (ex: à la création du salarié).
            chantierId: this.contexteChantierId ?? undefined
        }, ligne.fichier).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Document enregistré' });
                this.chargerDocuments(this.salarieId!);
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
                this.chargerDocuments(this.salarieId!);
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
                this.chargerDocuments(this.salarieId!);
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Refus impossible' })
        });
    }

    private toIsoDate(date: Date): string {
        return date.toISOString().substring(0, 10);
    }

    // --- Historique des documents ---

    basculerHistorique() {
        this.afficherHistorique = !this.afficherHistorique;
        if (this.afficherHistorique && !this.historiqueCharge) {
            this.documentService.historiqueParSalarie(this.salarieId!, this.contexteChantierId ?? undefined).subscribe((h) => {
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

    // Icône par action (voir panneau Historique, présentation "fil d'activité" plutôt que
    // tableau brut — demande explicite : "plus clair à comprendre").
    iconeAction(action: string): string {
        const icones: Record<string, string> = {
            CREATION: 'pi-upload', VALIDATION: 'pi-check-circle', REFUS: 'pi-times-circle', SUPPRESSION: 'pi-trash'
        };
        return icones[action] ?? 'pi-circle';
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
            this.documentService.relancesParSalarie(this.salarieId!, this.contexteChantierId ?? undefined).subscribe((r) => {
                this.relances = r;
                this.relancesChargees = true;
            });
        }
    }

    // --- Historique des messages ---

    basculerMessagesHistorique() {
        this.afficherMessagesHistorique = !this.afficherMessagesHistorique;
        if (this.afficherMessagesHistorique && !this.messagesHistoriqueCharges && this.salarie) {
            this.messagerieService.historique('ENTREPRISE', this.salarie.entrepriseEmployeurId,
                { chantierId: this.contexteChantierId ?? undefined, salarieId: this.salarieId ?? undefined }).subscribe((m) => {
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
<p>Salarié :<br /><strong>${this.salarie ? this.salarie.prenom + ' ' + this.salarie.nom : '[SALARIE_NOM]'}</strong></p>
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
        if (this.messageForm.invalid || !this.salarie) {
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
                // Toujours renseigné (pas seulement pour une demande de document) — sert à
                // l'historique des messages de la fiche Salarié (voir basculerMessagesHistorique),
                // qui filtre par salarieId pour ne montrer que les messages de CE salarié précis
                // parmi tous ceux envoyés à son entreprise employeuse.
                salarieId: this.salarieId ?? undefined,
                // Chantier d'où le message a été composé (voir contexteChantierId) — rattache
                // le message à CE chantier précis dans l'historique, pas seulement à
                // l'entreprise/au salarié en général.
                chantierId: this.contexteChantierId ?? undefined
            });
        };
        ajouter('ENTREPRISE', this.salarie.entrepriseEmployeurId, true);
        if (value.copieAdmin) {
            this.utilisateurs.filter((u) => u.roles.includes('SUPER_ADMIN')).forEach((u) => ajouter('UTILISATEUR', u.id, false));
        }

        this.envoiMessageEnCours = true;
        forkJoin(Array.from(cibles.values()).map((requete) => this.messagerieService.envoyer(requete))).subscribe({
            next: () => {
                this.envoiMessageEnCours = false;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Message envoyé à l\'entreprise employeuse' });
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
        this.router.navigate(['/salaries']);
    }
}
