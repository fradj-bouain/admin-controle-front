import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService as PrimeMessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { Chantier, RecurrenceControles } from '../models/chantier.model';
import { ChantierService } from '../services/chantier.service';
import { ChantierUtilisateurService } from '../services/chantier-utilisateur.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { CorpsDeMetier, Pays, Utilisateur, ControleTiers, TypeContratSalarie } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Salarie, AffectationSalarieChantier } from 'src/app/features/salaries/models/salarie.model';
import { SalarieService } from 'src/app/features/salaries/services/salarie.service';
import { AffectationSalarieChantierService } from 'src/app/features/salaries/services/affectation-salarie-chantier.service';
import { AffectationEntrepriseChantier, Entreprise, RoleEntreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { AffectationEntrepriseChantierService } from 'src/app/features/entreprises/services/affectation-entreprise-chantier.service';
import { Controle, RapportControle } from 'src/app/features/controles/models/controle.model';
import { ControleService } from 'src/app/features/controles/services/controle.service';
import { DocumentChantierSupplementaire, DocumentItem, TypeDocument } from 'src/app/features/documents/models/document.model';
import { DocumentService } from 'src/app/features/documents/services/document.service';
import { TypeDocumentService } from 'src/app/features/documents/services/type-document.service';
import { DocumentChantierSupplementaireService } from 'src/app/features/documents/services/document-chantier-supplementaire.service';
import { Message } from 'src/app/features/messagerie/models/message.model';
import { MessageService } from 'src/app/features/messagerie/services/message.service';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-chantier-detail',
    templateUrl: './chantier-detail.component.html',
    providers: [PrimeMessageService, ConfirmationService]
})
export class ChantierDetailComponent implements OnInit {

    isNew = true;
    saving = false;
    loading = false;
    chantierId: string | null = null;
    chantier: Chantier | null = null;

    clients: Client[] = [];
    pays: Pays[] = [];
    corpsDeMetiers: CorpsDeMetier[] = [];
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

    // --- Sections secondaires repliées par défaut (Statistiques exclue : toujours visible) ---
    afficherControles = false;
    afficherUtilisateurs = false;
    afficherEntreprises = false;
    afficherSalaries = false;
    // IPs autorisées : champ technique rarement utilisé au quotidien (retour utilisateur,
    // même traitement que Client.section-tracker) — replié par défaut dans le formulaire.
    afficherOptionsAvancees = false;

    // --- Contrôles ---
    // controleTiersNomCalcule ajouté au chargement, pour permettre un p-columnFilter
    // texte simple sur "Effectué par" (le champ brut n'a que controleTiersId).
    controles: Array<Controle & { controleTiersNomCalcule: string }> = [];
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
    // nomEntrepriseCalculee/nomParenteCalculee ajoutés au chargement, pour permettre un
    // p-columnFilter texte simple (les champs bruts n'ont que des id) et afficher le
    // rattachement en toutes lettres dans sa propre colonne (voir prototype v2 validé).
    // zoneCalculee (France/UE/Hors UE, demande client) : résolue via le paysId du SIÈGE de
    // l'entreprise affectée (this.entreprises), même principe qu'identiteCalculee — un
    // p-columnFilter ne peut filtrer que sur un champ réel de la ligne.
    affectationsEntreprise: Array<AffectationEntrepriseChantier & { nomEntrepriseCalculee: string; nomParenteCalculee: string; zoneCalculee?: string }> = [];
    entreprisesDisponibles: Entreprise[] = [];
    roles: RoleEntreprise[] = ['PRINCIPALE', 'STT1', 'STT2'];
    parentsDisponibles: Array<{ id: string; label: string }> = [];
    affecterEntrepriseForm = this.fb.group({
        entrepriseId: ['', Validators.required],
        role: ['PRINCIPALE' as RoleEntreprise, Validators.required],
        affectationParenteId: ['']
    });

    // Créer une entreprise inconnue directement depuis cette page (demande client : ne
    // pas devoir quitter la fiche Chantier pour créer puis revenir affecter) — seule
    // raisonSociale est requise côté backend (voir CreateEntrepriseRequest), les autres
    // champs ici sont ceux qui comptent le plus tôt possible (corps de métier = documents
    // obligatoires demandés ensuite). Une fois créée, sélectionnée automatiquement dans
    // affecterEntrepriseForm.entrepriseId — il ne reste plus qu'à choisir le rôle et
    // cliquer "Affecter", déjà juste en dessous.
    dialogCreationEntrepriseVisible = false;
    creationEntrepriseEnCours = false;
    nouvelleEntrepriseForm = this.fb.group({
        raisonSociale: ['', Validators.required],
        corpsDeMetierId: [''],
        ville: [''],
        paysId: ['']
    });

    // --- Coordonnées de contact par affectation (email/téléphone/adresse propres à CE
    // chantier, distincts des coordonnées principales de l'entreprise) — édition directe
    // depuis cette page (bouton dans la table ci-dessus) plutôt que d'obliger à ouvrir la
    // fiche Entreprise avec le bon ?chantierId=... dans l'URL pour la retrouver (voir
    // retour utilisateur : trop de détours pour un besoin courant).
    dialogCoordonneesVisible = false;
    affectationCoordonneesEnEdition: AffectationEntrepriseChantier | null = null;
    enregistrementCoordonneesEnCours = false;
    coordonneesContactForm = this.fb.group({
        emailContact: [''],
        telephoneContact: [''],
        adresseContact: ['']
    });

    // --- Salariés affectés ---
    // nomSalarieCalculee/contratCalculee/nomEntrepriseCalculee ajoutés au chargement, pour
    // permettre des p-columnFilter simples et afficher l'entreprise employeuse en colonne
    // (absente jusqu'ici, voir prototype v2 validé).
    affectationsSalarie: Array<AffectationSalarieChantier & { nomSalarieCalculee: string; contratCalculee: string; nomEntrepriseCalculee: string }> = [];
    salariesDisponibles: Salarie[] = [];
    affecterSalarieForm = this.fb.group({
        salarieId: ['', Validators.required],
        affectationEntrepriseChantierId: ['', Validators.required]
    });

    // --- Vue Client (lecture seule) : conformité documentaire agrégée sur toutes les
    // entreprises et tous les salariés affectés à CE chantier. Aucun endpoint backend
    // ne renvoie ça en un seul appel (même limite que EntrepriseDetail/SalarieDetail/
    // Dashboard) — recalculé ici en répétant, par entité, le même calcul que ces pages.
    chargementDocumentsClient = false;
    typesDocument: TypeDocument[] = [];
    statDocumentsClient: { fournis: number; total: number; pourcentage: number } | null = null;
    documentsATraiterClient: Array<{
        typeLibelle: string; cible: 'ENTREPRISE' | 'SALARIE'; entiteNom: string; raison: string;
        severite: 'warn' | 'danger'; entrepriseId?: string; salarieId?: string
    }> = [];
    // Contrairement aux autres blocs (Entreprises/Salariés/Contrôles), ce bloc agrège
    // plusieurs entités (toutes les entreprises ET tous les salariés du chantier) : il
    // n'existe aucune page de registre équivalente vers laquelle renvoyer un "Voir tout"
    // (GET /documents exige un salarié OU une entreprise précis, jamais "tout mon
    // périmètre"). Dépassé 7, on déplie donc sur place plutôt que de renvoyer vers une
    // page qui ne montrerait qu'une partie de l'information.
    afficherTousDocumentsClient = false;
    // Messages envoyés avec ce chantier en référence (voir Message.chantierId côté
    // backend) — les messages automatiques (relances, notifications) le renseignent
    // toujours ; un message rédigé à la main peut ne pas l'être selon comment il a été
    // envoyé, cette liste n'est donc pas garantie exhaustive.
    messagesChantierClient: Message[] = [];
    rapportsChantierClient: RapportControle[] = [];

    // --- Documents supplémentaires demandés EN PLUS sur ce chantier (au-delà des types
    // obligatoires globaux, qui s'appliquent déjà partout sans configuration ici) — voir
    // DocumentChantierSupplementaire, modèle validé pour que chaque chantier puisse avoir
    // ses propres exigences documentaires en plus des communs.
    documentsSupplementaires: DocumentChantierSupplementaire[] = [];
    nouveauTypeSupplementaireId = '';

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
        private documentService: DocumentService,
        private typeDocumentService: TypeDocumentService,
        private documentChantierSupplementaireService: DocumentChantierSupplementaireService,
        private messagerieService: MessageService,
        private confirmation: ConfirmationService,
        private message: PrimeMessageService,
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

    get isClient(): boolean {
        return this.auth.hasRole('CLIENT');
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

    // --- Vue Client (lecture seule) : ce chantier tel que le voit un compte Client
    // (accès total ou responsable de chantier — déjà scopé côté backend, voir
    // ChantierService.listerIdsAccessiblesPourClient ; aucun filtrage de périmètre à
    // refaire ici). Remplace les blocs de gestion (Responsable/Contrôles/Utilisateurs/
    // Entreprises affectées/Salariés affectés) par une vue de consultation pratique. ---

    get entreprisesActivesClient(): Array<AffectationEntrepriseChantier & { nomEntrepriseCalculee: string }> {
        return this.affectationsEntreprise.filter((a) => a.statut === 'ACTIF');
    }

    // Aperçu limité à 7 lignes (voir retour client) : le détail complet reste à un clic,
    // via "Voir tout" → /entreprises, déjà scopé par le backend au périmètre exact de ce
    // compte (accès total = toutes les entreprises du client, responsable = uniquement
    // celles de ses chantiers assignés) — aucun paramètre de filtrage à ajouter ici.
    get entreprisesActivesClientApercu(): Array<AffectationEntrepriseChantier & { nomEntrepriseCalculee: string }> {
        return this.entreprisesActivesClient.slice(0, 7);
    }

    get statControlesClient(): { termines: number; total: number } {
        return { termines: this.controles.filter((c) => c.termine).length, total: this.controles.length };
    }

    // Aperçu limité à 7 lignes — "Voir tout" → /controles, déjà scopé par le backend.
    get controlesClientApercu(): Controle[] {
        return this.controles.slice(0, 7);
    }

    get documentsATraiterClientApercu(): typeof this.documentsATraiterClient {
        return this.afficherTousDocumentsClient ? this.documentsATraiterClient : this.documentsATraiterClient.slice(0, 7);
    }

    /** Répartition des salariés affectés par entreprise — le "graphique" de la vue
        Client (barres horizontales), triée par effectif décroissant. */
    get salariesParEntrepriseClient(): Array<{ entrepriseId: string; nom: string; total: number }> {
        const counts = new Map<string, number>();
        this.affectationsSalarie.forEach((a) => {
            const id = a.entrepriseId ?? '';
            counts.set(id, (counts.get(id) ?? 0) + 1);
        });
        return [...counts.entries()]
            .map(([entrepriseId, total]) => ({ entrepriseId, nom: this.nomEntreprise(entrepriseId), total }))
            .sort((a, b) => b.total - a.total);
    }

    get maxSalariesParEntrepriseClient(): number {
        return Math.max(1, ...this.salariesParEntrepriseClient.map((s) => s.total));
    }

    private readonly palierBarChart = ['#3B6FA0', '#B5691C', '#2F8558', '#B9862B', '#7A470F'];
    couleurBarChart(index: number): string {
        return this.palierBarChart[index % this.palierBarChart.length];
    }

    /** Liste nominative des salariés affectés à ce chantier — le client doit pouvoir
        savoir QUI travaille sur son chantier, pas seulement combien (voir retour client :
        le graphique par entreprise ci-dessus ne suffit pas). Triée par entreprise puis nom. */
    get salariesSurChantierClient(): Array<AffectationSalarieChantier & { nomSalarieCalculee: string; contratCalculee: string; nomEntrepriseCalculee: string }> {
        return this.affectationsSalarie
            .map((a) => ({ ...a, nomEntrepriseCalculee: this.nomEntreprise(a.entrepriseId ?? '') }))
            .sort((a, b) => a.nomEntrepriseCalculee.localeCompare(b.nomEntrepriseCalculee) || a.nomSalarieCalculee.localeCompare(b.nomSalarieCalculee));
    }

    // Aperçu limité à 7 lignes — "Voir tout" → /salaries, déjà scopé par le backend
    // (accès total = tous les salariés du client, responsable = uniquement ceux affectés
    // à ses chantiers assignés).
    get salariesSurChantierClientApercu(): Array<AffectationSalarieChantier & { nomSalarieCalculee: string; contratCalculee: string; nomEntrepriseCalculee: string }> {
        return this.salariesSurChantierClient.slice(0, 7);
    }

    /** Comptes Client de mon équipe visibles sur CE chantier : soit "accès total" (ils
        n'apparaissent jamais dans chantier_utilisateur, voir Utilisateur.accesTousChantiers,
        donc à inclure explicitement), soit explicitement assignés ici. */
    get equipeClientSurCeChantier(): Array<{ utilisateur: Utilisateur; accesTousChantiers: boolean }> {
        if (!this.chantier) {
            return [];
        }
        const clientId = this.chantier.clientId;
        return this.utilisateurs
            .filter((u) => u.clientId === clientId)
            .filter((u) => u.accesTousChantiers || this.chantierUtilisateurIds.includes(u.id))
            .map((u) => ({ utilisateur: u, accesTousChantiers: !!u.accesTousChantiers }));
    }

    initialesUtilisateur(u: Utilisateur): string {
        const p = (u.prenom || '').trim();
        const n = (u.nom || '').trim();
        return ((p[0] ?? '') + (n[0] ?? '')).toUpperCase() || '?';
    }

    initialesUtilisateurId(id: string): string {
        const u = this.utilisateurs.find((x) => x.id === id);
        return u ? this.initialesUtilisateur(u) : '?';
    }

    /** Rapport envoyé pour ce contrôle, s'il existe — un contrôle terminé n'a pas
        forcément de rapport encore rédigé/envoyé. */
    rapportDuControle(controleId: string): RapportControle | undefined {
        return this.rapportsChantierClient.find((r) => r.controleId === controleId && !!r.dateEnvoi);
    }

    nomControleTiers(id?: string): string {
        return this.controleTiersListe.find((t) => t.id === id)?.nom ?? '—';
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

    /** Phrase de durée sous la période (vue Client) : "01/03/2026 → en cours" seul ne
        donne aucune idée du RYTHME du chantier — cette ligne répond à "depuis quand" /
        "pour combien de temps encore" en une phrase, plutôt que de laisser le client
        calculer la soustraction lui-même. */
    get dureeChantierTexte(): string {
        if (!this.chantier?.dateDebut) {
            return '';
        }
        const debut = new Date(this.chantier.dateDebut);
        if (this.chantier.dateFinPrevue) {
            const fin = new Date(this.chantier.dateFinPrevue);
            const jours = Math.round((fin.getTime() - debut.getTime()) / 86400000);
            if (jours <= 0) {
                return '';
            }
            const mois = Math.round(jours / 30);
            return mois >= 1 ? `Durée prévue : environ ${mois} mois` : `Durée prévue : ${jours} jour(s)`;
        }
        const aujourdHui = new Date();
        const joursEcoules = Math.round((aujourdHui.getTime() - debut.getTime()) / 86400000);
        if (joursEcoules < 0) {
            return 'Démarrage à venir';
        }
        const mois = Math.floor(joursEcoules / 30);
        return mois >= 1 ? `En cours depuis ${mois} mois` : `En cours depuis ${joursEcoules} jour(s)`;
    }

    /** Comptes Client rattachés au client de CE chantier — seuls candidats pertinents
        pour une assignation ici (inutile de proposer les comptes d'un autre client).
        Champ recalculé explicitement (jamais une getter) : un getter réévalué à chaque
        cycle de détection de changement, combiné à un p-dropdown filtrable, produit une
        nouvelle référence de tableau en continu — PrimeNG perd alors la sélection/le
        filtre en cours (déjà rencontré ailleurs dans cette fiche, voir mesAffectations/
        affectationsEntreprise, jamais des getters pour la même raison). */
    utilisateursClientDuChantier: Utilisateur[] = [];

    /** Parmi les assignations de ce chantier, celles qui concernent un compte Client
        (le reste, potentiellement des comptes internes, reste dans "Utilisateurs du
        Back Office" — même table chantier_utilisateur, affichage simplement séparé). */
    utilisateursClientAssignes: Utilisateur[] = [];

    private recalculerUtilisateursClient() {
        this.utilisateursClientDuChantier = this.chantier
            ? this.utilisateurs.filter((u) => u.clientId === this.chantier!.clientId)
            : [];
        this.utilisateursClientAssignes = this.utilisateursClientDuChantier
            .filter((u) => this.chantierUtilisateurIds.includes(u.id));
    }

    ngOnInit(): void {
        this.clientService.lister().subscribe((clients) => (this.clients = clients));
        this.referenceDataService.listerPays().subscribe((pays) => (this.pays = pays));
        this.referenceDataService.listerCorpsDeMetier().subscribe((c) => (this.corpsDeMetiers = c));
        this.referenceDataService.listerTypeContratSalarie().subscribe((types) => (this.typesContrat = types));
        this.referenceDataService.listerControleTiers().subscribe((tiers) => (this.controleTiersListe = tiers));
        this.utilisateurService.lister().subscribe((utilisateurs) => {
            this.utilisateurs = utilisateurs;
            this.recalculerUtilisateursClient();
        });
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
                if (this.isClient) {
                    this.chargerDocumentsClient(id);
                    this.chargerMessagesClient(id);
                    this.chargerRapportsClient(id);
                }
                if (this.isSuperAdmin) {
                    this.chargerDocumentsSupplementaires(id);
                }
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
                this.recalculerUtilisateursClient();
                this.coordonneesForm.patchValue({
                    ...c,
                    dateDebut: c.dateDebut ? new Date(c.dateDebut) : null,
                    dateFinPrevue: c.dateFinPrevue ? new Date(c.dateFinPrevue) : null
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

    // --- Responsable du chantier : étoile ★ directement dans les listes Utilisateurs du
    // Back Office / Salariés (plus de carte séparée avec ses propres menus déroulants —
    // ils répétaient exactement les mêmes personnes que ces listes gèrent déjà, signalé
    // comme redondant). Un clic sur l'étoile de la personne déjà désignée la retire ;
    // sur une autre personne, la désignation se déplace. Les deux désignations (un
    // utilisateur ET un salarié) restent indépendantes, comme avant. ---

    estResponsableUtilisateur(utilisateurId: string): boolean {
        return this.chantier?.chefChantierUtilisateurId === utilisateurId;
    }

    toggleResponsableUtilisateur(utilisateurId: string) {
        const obs = this.estResponsableUtilisateur(utilisateurId)
            ? this.chantierService.retirerChefChantier(this.chantierId!)
            : this.chantierService.affecterChefChantier(this.chantierId!, utilisateurId);
        obs.subscribe({
            next: (c) => (this.chantier = c),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    estResponsableSalarie(salarieId: string): boolean {
        return this.chantier?.salarieResponsableId === salarieId;
    }

    toggleResponsableSalarie(salarieId: string) {
        const obs = this.estResponsableSalarie(salarieId)
            ? this.chantierService.retirerSalarieResponsable(this.chantierId!)
            : this.chantierService.affecterSalarieResponsable(this.chantierId!, salarieId);
        obs.subscribe({
            next: (c) => (this.chantier = c),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    // Remonté dans le bandeau d'en-tête (voir chantier-hero-stats) pour rester visible sans
    // déplier Utilisateurs du Back Office ou Salariés — priorité à l'utilisateur s'il y a
    // les deux, un compte Back Office étant le contact le plus probable pour un contrôle.
    get nomResponsableCalcule(): string | null {
        if (this.chantier?.chefChantierUtilisateurId) {
            return this.nomUtilisateur(this.chantier.chefChantierUtilisateurId);
        }
        if (this.chantier?.salarieResponsableId) {
            const s = this.salaries.find((sal) => sal.id === this.chantier!.salarieResponsableId);
            return s ? `${s.prenom} ${s.nom}` : null;
        }
        return null;
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

    // --- Bandeau d'en-tête SUPER_ADMIN (voir prototype validé) : reprend tel quel le
    // calcul déjà fait pour la carte "Statistiques" plus bas — aucune donnée de plus à
    // charger, juste remontée en haut de page. ---

    get prochainControleEnRetard(): boolean {
        return !!this.chantier?.dateProchainControle && new Date(this.chantier.dateProchainControle) < new Date();
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
        this.controleService.lister(chantierId).subscribe((controles) => {
            this.controles = controles.map((c) => ({ ...c, controleTiersNomCalcule: this.nomControleTiers(c.controleTiersId) }));
        });
    }

    // Aperçu limité (voir carte Contrôles, colonne latérale) — même convention que les
    // autres aperçus de cette page (7 lignes), le détail complet reste sur /controles.
    get controlesApercu(): Array<Controle & { controleTiersNomCalcule: string }> {
        return [...this.controles]
            .sort((a, b) => b.dateControle.localeCompare(a.dateControle))
            .slice(0, 7);
    }

    /** Statut à 3 couleurs (voir prototype v2 validé) : un contrôle non terminé dont la
        date est déjà passée est "En retard", pas juste "Non" au même titre qu'un contrôle
        simplement pas encore dû — distinction absente jusqu'ici. */
    statutControle(controle: Controle): { label: string; severity: 'success' | 'danger' | 'info' } {
        if (controle.termine) {
            return { label: 'Terminé', severity: 'success' };
        }
        if (new Date(controle.dateControle) < new Date()) {
            return { label: 'En retard', severity: 'danger' };
        }
        return { label: 'À venir', severity: 'info' };
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
            this.recalculerUtilisateursClient();
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
            this.affectationsEntreprise = affectations.map((a) => ({
                ...a,
                nomEntrepriseCalculee: this.nomEntreprise(a.entrepriseId),
                // Colonne "Rattachée à" (voir prototype v2 validé) : écrit noir sur blanc le
                // nom de l'entreprise parente plutôt qu'une indentation visuelle à deviner —
                // résolu dans CE lot d'affectations, this.affectationsEntreprise n'est pas
                // encore réassigné à ce stade de la fonction.
                nomParenteCalculee: a.affectationParenteId
                    ? this.nomEntreprise(affectations.find((p) => p.id === a.affectationParenteId)?.entrepriseId ?? '')
                    : '',
                zoneCalculee: this.zoneDuPays(this.entreprises.find((e) => e.id === a.entrepriseId)?.paysId)
            }));
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

    ouvrirCreationEntreprise() {
        this.nouvelleEntrepriseForm.reset();
        this.dialogCreationEntrepriseVisible = true;
    }

    submitNouvelleEntreprise() {
        if (this.nouvelleEntrepriseForm.invalid) {
            this.nouvelleEntrepriseForm.markAllAsTouched();
            return;
        }
        const value = this.nouvelleEntrepriseForm.getRawValue();
        this.creationEntrepriseEnCours = true;
        this.entrepriseService.creer({
            raisonSociale: value.raisonSociale!,
            corpsDeMetierId: value.corpsDeMetierId || undefined,
            ville: value.ville || undefined,
            paysId: value.paysId || undefined
        }).subscribe({
            next: (entreprise) => {
                this.creationEntrepriseEnCours = false;
                this.dialogCreationEntrepriseVisible = false;
                this.entreprises = [...this.entreprises, entreprise];
                this.recalculerEntreprisesDisponibles();
                this.affecterEntrepriseForm.patchValue({ entrepriseId: entreprise.id });
                this.message.add({ severity: 'success', summary: 'Succès', detail: `Entreprise "${entreprise.raisonSociale}" créée — choisissez son rôle puis affectez-la.` });
            },
            error: () => {
                this.creationEntrepriseEnCours = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
            }
        });
    }

    desactiverAffectationEntreprise(affectation: AffectationEntrepriseChantier) {
        this.affectationEntrepriseService.desactiver(this.chantierId!, affectation.id).subscribe({
            next: () => this.chargerAffectationsEntreprise(this.chantierId!),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
        });
    }

    ouvrirCoordonneesContact(affectation: AffectationEntrepriseChantier) {
        this.affectationCoordonneesEnEdition = affectation;
        this.coordonneesContactForm.setValue({
            emailContact: affectation.emailContact ?? '',
            telephoneContact: affectation.telephoneContact ?? '',
            adresseContact: affectation.adresseContact ?? ''
        });
        this.dialogCoordonneesVisible = true;
    }

    submitCoordonneesContact() {
        const affectation = this.affectationCoordonneesEnEdition;
        if (!affectation) {
            return;
        }
        const value = this.coordonneesContactForm.getRawValue();
        this.enregistrementCoordonneesEnCours = true;
        this.affectationEntrepriseService.modifierCoordonneesContact(this.chantierId!, affectation.id, {
            emailContact: value.emailContact ?? '',
            telephoneContact: value.telephoneContact ?? '',
            adresseContact: value.adresseContact ?? ''
        }).subscribe({
            next: () => {
                this.enregistrementCoordonneesEnCours = false;
                this.dialogCoordonneesVisible = false;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Coordonnées de contact enregistrées' });
                this.chargerAffectationsEntreprise(this.chantierId!);
            },
            error: () => {
                this.enregistrementCoordonneesEnCours = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Enregistrement impossible' });
            }
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
                contratCalculee: this.contratDuSalarie(a.salarieId),
                nomEntrepriseCalculee: this.nomEntreprise(a.entrepriseId ?? '')
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

    // --- Vue Client : conformité documentaire agrégée sur ce chantier ---

    private chargerDocumentsClient(chantierId: string) {
        this.chargementDocumentsClient = true;
        forkJoin({
            types: this.typeDocumentService.lister(),
            affEnt: this.affectationEntrepriseService.lister(chantierId),
            affSal: this.affectationSalarieService.lister(chantierId),
            supplementaires: this.documentChantierSupplementaireService.lister(chantierId)
        }).subscribe({
            next: ({ types, affEnt, affSal, supplementaires }) => {
                this.typesDocument = types;
                const entrepriseIds = [...new Set(affEnt.filter((a) => a.statut === 'ACTIF').map((a) => a.entrepriseId))];
                const salarieIds = [...new Set(affSal.map((a) => a.salarieId))];
                // Documents demandés EN PLUS sur CE chantier, au-delà des types obligatoires
                // globaux — voir DocumentChantierSupplementaire (modèle validé).
                const typesSupplementairesIds = new Set(supplementaires.map((s) => s.typeDocumentId));

                forkJoin({
                    // Documents propres à CE chantier uniquement (instance indépendante des
                    // documents globaux de l'entreprise et de ses autres chantiers) — plus
                    // documentService.listerParEntreprise(id) qui mélangeait tous les chantiers.
                    docsEnt: entrepriseIds.length
                        ? forkJoin(entrepriseIds.map((id) => this.documentService.listerParEntrepriseEtChantier(id, chantierId)))
                        : of([] as DocumentItem[][]),
                    docsSal: salarieIds.length
                        ? forkJoin(salarieIds.map((id) => this.documentService.listerParSalarie(id)))
                        : of([] as DocumentItem[][])
                }).subscribe({
                    next: ({ docsEnt, docsSal }) => {
                        this.calculerConformiteClient(entrepriseIds, docsEnt, salarieIds, docsSal, typesSupplementairesIds);
                        this.chargementDocumentsClient = false;
                    },
                    error: () => (this.chargementDocumentsClient = false)
                });
            },
            error: () => (this.chargementDocumentsClient = false)
        });
    }

    /** Même calcul que EntrepriseDetail.recalculerTypesPourEntreprise / SalarieDetail.
        recalculerTypesPourSalarie / Dashboard.chargerDashboardEntreprise, appliqué à
        chaque entreprise et chaque salarié de ce chantier puis fusionné : documents
        obligatoires manquants d'abord (plus urgent), puis ceux qui expirent sous 30 jours.
        Côté entreprise, "obligatoire sur ce chantier" = type obligatoire=true globalement
        OU listé dans document_chantier_supplementaire pour CE chantier (voir modèle validé) ;
        côté salarié, chantierId n'est pas encore branché ici (documents salarié restent
        globaux pour l'instant — un scoping par chantier symétrique reste possible plus
        tard, hors du périmètre demandé ici). */
    private calculerConformiteClient(
        entrepriseIds: string[], docsEnt: DocumentItem[][],
        salarieIds: string[], docsSal: DocumentItem[][],
        typesSupplementairesIds: Set<string>
    ) {
        let totalObligatoires = 0;
        let totalFournis = 0;
        type LigneATraiter = {
            typeLibelle: string; cible: 'ENTREPRISE' | 'SALARIE'; entiteNom: string; raison: string;
            entrepriseId?: string; salarieId?: string;
        };
        const manquants: Array<LigneATraiter & { severite: 'danger' }> = [];
        const expirants: Array<LigneATraiter & { severite: 'warn' }> = [];

        entrepriseIds.forEach((entrepriseId, i) => {
            const entreprise = this.entreprises.find((e) => e.id === entrepriseId);
            if (!entreprise) {
                return;
            }
            const documentsByType: Record<string, DocumentItem> = {};
            (docsEnt[i] ?? []).forEach((d) => (documentsByType[d.typeDocumentId] = d));
            const typesPourEntreprise = this.typesDocument.filter((t) => {
                if (t.cible !== 'ENTREPRISE') {
                    return false;
                }
                if (t.corpsDeMetierId && t.corpsDeMetierId !== entreprise.corpsDeMetierId) {
                    return false;
                }
                if (t.paysId && t.paysId !== entreprise.paysId) {
                    return false;
                }
                return true;
            });
            const obligatoires = typesPourEntreprise.filter((t) => t.obligatoire || typesSupplementairesIds.has(t.id));
            totalObligatoires += obligatoires.length;
            obligatoires.forEach((t) => {
                const doc = documentsByType[t.id];
                if (!doc) {
                    manquants.push({
                        typeLibelle: t.libelle, cible: 'ENTREPRISE', entiteNom: entreprise.raisonSociale,
                        raison: 'Document manquant', severite: 'danger', entrepriseId
                    });
                    return;
                }
                totalFournis++;
                const jours = doc.statutValidation === 'VALIDE' ? this.joursAvantExpiration(doc.dateExpiration) : null;
                if (jours !== null && jours >= 0 && jours <= 30) {
                    expirants.push({
                        typeLibelle: t.libelle, cible: 'ENTREPRISE', entiteNom: entreprise.raisonSociale,
                        raison: jours === 0 ? "Expire aujourd'hui" : `Expire dans ${jours} jour(s)`,
                        severite: 'warn', entrepriseId
                    });
                }
            });
        });

        salarieIds.forEach((salarieId, i) => {
            const salarie = this.salaries.find((s) => s.id === salarieId);
            if (!salarie) {
                return;
            }
            // Nom de l'entreprise embarqué (entre parenthèses) : plusieurs entreprises
            // peuvent intervenir sur ce chantier, "quel salarié" doit rester non ambigu
            // sans devoir cliquer pour le découvrir (voir retour client).
            const nomSalarie = `${salarie.prenom} ${salarie.nom} (${this.nomEntreprise(salarie.entrepriseEmployeurId)})`;
            const documentsByType: Record<string, DocumentItem> = {};
            (docsSal[i] ?? []).forEach((d) => (documentsByType[d.typeDocumentId] = d));
            const zone = this.zoneDuPays(salarie.nationalitePaysId);
            const typesPourSalarie = this.typesDocument.filter((t) => {
                if (t.cible !== 'SALARIE') {
                    return false;
                }
                if (t.paysId && t.paysId !== salarie.nationalitePaysId) {
                    return false;
                }
                if (t.zoneRequise && t.zoneRequise !== zone) {
                    return false;
                }
                return true;
            });
            const obligatoires = typesPourSalarie.filter((t) => t.obligatoire);
            totalObligatoires += obligatoires.length;
            obligatoires.forEach((t) => {
                const doc = documentsByType[t.id];
                if (!doc) {
                    manquants.push({
                        typeLibelle: t.libelle, cible: 'SALARIE', entiteNom: nomSalarie,
                        raison: 'Document manquant', severite: 'danger', salarieId
                    });
                    return;
                }
                totalFournis++;
                const jours = doc.statutValidation === 'VALIDE' ? this.joursAvantExpiration(doc.dateExpiration) : null;
                if (jours !== null && jours >= 0 && jours <= 30) {
                    expirants.push({
                        typeLibelle: t.libelle, cible: 'SALARIE', entiteNom: nomSalarie,
                        raison: jours === 0 ? "Expire aujourd'hui" : `Expire dans ${jours} jour(s)`,
                        severite: 'warn', salarieId
                    });
                }
            });
        });

        this.documentsATraiterClient = [...manquants, ...expirants];
        this.statDocumentsClient = {
            fournis: totalFournis, total: totalObligatoires,
            pourcentage: totalObligatoires === 0 ? 100 : Math.round((totalFournis / totalObligatoires) * 100)
        };
    }

    private joursAvantExpiration(dateExpiration?: string | null): number | null {
        if (!dateExpiration) {
            return null;
        }
        const aujourdHui = new Date();
        aujourdHui.setHours(0, 0, 0, 0);
        const expiration = new Date(dateExpiration);
        expiration.setHours(0, 0, 0, 0);
        return Math.round((expiration.getTime() - aujourdHui.getTime()) / (1000 * 60 * 60 * 24));
    }

    // --- Documents supplémentaires sur ce chantier (SUPER_ADMIN) ---

    /** Types éligibles à ajouter : cible ENTREPRISE, pas déjà obligatoire partout (redondant),
        pas déjà listé pour ce chantier. Champ recalculé explicitement (jamais une getter, voir
        utilisateursClientDuChantier ci-dessus pour la même raison) : lié à un p-dropdown
        FILTRABLE — une getter réévaluée à chaque cycle de détection de changement y produit
        une nouvelle référence de tableau en continu, ce qui a bloqué le navigateur en boucle
        infinie sur cette même fiche (plantage signalé sur "Ajouter un chantier" : le
        formulaire de création lui-même était intact, c'est cette carte, affichée juste après
        la redirection vers la fiche du chantier créé, qui gelait la page). */
    typesSupplementairesDisponibles: TypeDocument[] = [];

    private chargerDocumentsSupplementaires(chantierId: string) {
        forkJoin({
            types: this.typeDocumentService.lister(),
            supplementaires: this.documentChantierSupplementaireService.lister(chantierId)
        }).subscribe(({ types, supplementaires }) => {
            this.typesDocument = types;
            this.documentsSupplementaires = supplementaires;
            this.recalculerTypesSupplementairesDisponibles();
        });
    }

    private recalculerTypesSupplementairesDisponibles() {
        const dejaListes = new Set(this.documentsSupplementaires.map((s) => s.typeDocumentId));
        this.typesSupplementairesDisponibles = this.typesDocument.filter((t) => t.cible === 'ENTREPRISE' && !t.obligatoire && !dejaListes.has(t.id));
    }

    libelleTypeDocument(typeDocumentId: string): string {
        return this.typesDocument.find((t) => t.id === typeDocumentId)?.libelle ?? typeDocumentId;
    }

    ajouterDocumentSupplementaire() {
        if (!this.nouveauTypeSupplementaireId || !this.chantierId) {
            return;
        }
        this.documentChantierSupplementaireService.ajouter(this.chantierId, this.nouveauTypeSupplementaireId).subscribe({
            next: () => {
                this.nouveauTypeSupplementaireId = '';
                this.chargerDocumentsSupplementaires(this.chantierId!);
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Document ajouté à ce chantier' });
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Ajout impossible' })
        });
    }

    retirerDocumentSupplementaire(id: string) {
        if (!this.chantierId) {
            return;
        }
        this.documentChantierSupplementaireService.retirer(this.chantierId, id).subscribe({
            next: () => this.chargerDocumentsSupplementaires(this.chantierId!),
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
        });
    }

    private zoneDuPays(paysId?: string): string | undefined {
        return paysId ? this.pays.find((p) => p.id === paysId)?.zone : undefined;
    }

    // --- Vue Client : messages et rapports liés à ce chantier ---

    private chargerMessagesClient(chantierId: string) {
        this.messagerieService.boiteReception().subscribe((messages) => {
            this.messagesChantierClient = messages
                .filter((m) => m.chantierId === chantierId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5);
        });
    }

    private chargerRapportsClient(chantierId: string) {
        this.controleService.listerRapports(chantierId).subscribe((rapports) => (this.rapportsChantierClient = rapports));
    }

    retour() {
        this.router.navigate(['/chantiers']);
    }
}
