import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable, forkJoin, of } from 'rxjs';
import { AffectationSalarieChantier, Salarie } from '../models/salarie.model';
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
import { MessagePlanifie, SendMessageRequest } from 'src/app/features/messagerie/models/message.model';
import { MessageService as MessagerieMessageService } from 'src/app/features/messagerie/services/message.service';
import { Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';

interface LigneDocument {
    dateDebutValidite: Date | null;
    dateExpiration: Date | null;
    fichierUrl: string;
}

@Component({
    selector: 'app-salarie-detail',
    templateUrl: './salarie-detail.component.html',
    providers: [MessageService, ConfirmationService]
})
export class SalarieDetailComponent implements OnInit {

    isNew = true;
    saving = false;
    salarieId: string | null = null;
    salarie: Salarie | null = null;

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
    mesAffectations: AffectationSalarieChantier[] = [];
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
    documentsByType: Record<string, DocumentItem> = {};
    lignesDocument: Record<string, LigneDocument> = {};
    // Cases cochées sur les documents manquants, pour "Demander à l'entreprise"
    // (voir demanderDocumentsSelectionnes) — repart de zéro à chaque envoi.
    typesDemandesSelection: Record<string, boolean> = {};
    etats: DocumentEtat[] = [];
    etatsPourRefus: DocumentEtat[] = [];
    dialogRefuserVisible = false;
    documentARefuser: DocumentItem | null = null;

    // --- Historique des documents (repliée par défaut, chargée à la demande) ---
    historique: HistoriqueModification[] = [];
    afficherHistorique = false;
    private historiqueCharge = false;

    // --- Relances (repliée par défaut, chargée à la demande) ---
    relances: MessagePlanifie[] = [];
    afficherRelances = false;
    private relancesChargees = false;

    // --- Envoyer un message (composeur inline, replié par défaut) ---
    afficherComposeur = false;
    envoiMessageEnCours = false;
    utilisateurs: Utilisateur[] = [];
    // Parité d'affichage avec le site legacy (logo, balises, bloc coordonnées) :
    // pas de colonne backend correspondante, rien n'est envoyé au serveur pour ce champ.
    fichierModeleNom: string | null = null;
    messageForm = this.fb.group({
        sujet: ['', Validators.required],
        contenu: [this.modeleParDefaut(), Validators.required],
        copieAdmin: [false]
    });

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
        private message: MessageService
    ) {
        this.affectationForm.controls.chantierId.valueChanges.subscribe((chantierId) => this.onChantierChange(chantierId));
    }

    ngOnInit(): void {
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
            this.typesPourSalarie = types.filter((t) => t.cible === 'SALARIE');
            for (const t of this.typesPourSalarie) {
                if (!this.lignesDocument[t.id]) {
                    this.lignesDocument[t.id] = { dateDebutValidite: null, dateExpiration: null, fichierUrl: '' };
                }
            }
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
        this.salarieService.obtenir(id).subscribe((s) => {
            this.salarie = s;
            this.coordonneesForm.patchValue(s);
        });
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
        if (this.isNew && !this.documentsObligatoiresComplets()) {
            this.message.add({
                severity: 'error',
                summary: 'Documents obligatoires manquants',
                detail: 'Renseignez tous les documents obligatoires avant de créer ce salarié.'
            });
            return;
        }
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
            this.mesAffectations = [...affectations].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));
            this.recalculerChantiersDisponibles();
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

    chargerDocuments(salarieId: string) {
        this.documentService.listerParSalarie(salarieId).subscribe((documents) => {
            this.documents = documents;
            this.documentsByType = {};
            for (const d of documents) {
                this.documentsByType[d.typeDocumentId] = d;
            }
            for (const t of this.typesPourSalarie) {
                if (!this.lignesDocument[t.id]) {
                    this.lignesDocument[t.id] = { dateDebutValidite: null, dateExpiration: null, fichierUrl: '' };
                }
            }
        });
    }

    get typesPourSalarieFiltres(): TypeDocument[] {
        const texte = this.filtreTexte.trim().toLowerCase();
        return this.typesPourSalarie
            .filter((t) => {
                if (this.afficherObligatoireSeulement && !t.obligatoire) {
                    return false;
                }
                if (texte && !t.libelle.toLowerCase().includes(texte)) {
                    return false;
                }
                return true;
            })
            // Validés et en attente (déjà fournis) remontent au-dessus des
            // refusés et des documents manquants.
            .sort((a, b) => this.prioriteStatutDocument(a) - this.prioriteStatutDocument(b));
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

    get nbDocumentsManquants(): number {
        return this.typesPourSalarie.filter((t) => !this.documentsByType[t.id]).length;
    }

    get nbTypesDemandesSelection(): number {
        return Object.values(this.typesDemandesSelection).filter(Boolean).length;
    }

    demanderDocumentsSelectionnes() {
        const idsSelectionnes = Object.keys(this.typesDemandesSelection).filter((id) => this.typesDemandesSelection[id]);
        const libelles = this.typesPourSalarie.filter((t) => idsSelectionnes.includes(t.id)).map((t) => t.libelle);
        if (libelles.length === 0) {
            return;
        }
        const listeHtml = libelles.map((l) => `<li>${l}</li>`).join('');
        this.messageForm.patchValue({
            sujet: `Documents à fournir — ${this.salarie ? this.salarie.prenom + ' ' + this.salarie.nom : ''}`,
            contenu: this.modeleDemandeDocuments(listeHtml)
        });
        this.typesDemandesSelection = {};
        this.afficherComposeur = true;
    }

    private modeleDemandeDocuments(listeDocumentsHtml: string): string {
        return `
<p><img src="assets/layout/images/admincontrol-logo.png" alt="ADMIN-CONTROL'BTP" style="max-width:200px;" /></p>
<p>Date :<br /><strong>[DATE]</strong></p>
<p>Salarié :<br /><strong>${this.salarie ? this.salarie.prenom + ' ' + this.salarie.nom : '[SALARIE_NOM]'}</strong></p>
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
            .every((t) => !!this.lignesDocument[t.id]?.fichierUrl);
    }

    private enregistrerDocumentsInitiaux(salarieId: string): Observable<unknown> {
        const appels = this.typesPourSalarie
            .filter((t) => this.lignesDocument[t.id]?.fichierUrl)
            .map((t) => {
                const ligne = this.lignesDocument[t.id];
                return this.documentService.creer({
                    typeDocumentId: t.id,
                    salarieId,
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
            salarieId: this.salarieId!,
            fichierUrl: ligne.fichierUrl || undefined,
            dateDebutValidite: ligne.dateDebutValidite ? this.toIsoDate(ligne.dateDebutValidite) : undefined,
            dateExpiration: ligne.dateExpiration ? this.toIsoDate(ligne.dateExpiration) : undefined
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Document enregistré' });
                this.chargerDocuments(this.salarieId!);
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Enregistrement impossible' })
        });
    }

    valider(document: DocumentItem) {
        this.documentService.valider(document.id).subscribe({ next: () => this.chargerDocuments(this.salarieId!) });
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
            this.documentService.historiqueParSalarie(this.salarieId!).subscribe((h) => {
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
            this.documentService.relancesParSalarie(this.salarieId!).subscribe((r) => {
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
<p>Salarié :<br /><strong>${this.salarie ? this.salarie.prenom + ' ' + this.salarie.nom : '[SALARIE_NOM]'}</strong></p>
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
        const ajouter = (type: SendMessageRequest['destinataireType'], id: string) => {
            cibles.set(`${type}:${id}`, { destinataireType: type, destinataireId: id, sujet: value.sujet!, contenu: value.contenu! });
        };
        ajouter('ENTREPRISE', this.salarie.entrepriseEmployeurId);
        if (value.copieAdmin) {
            this.utilisateurs.filter((u) => u.roles.includes('SUPER_ADMIN')).forEach((u) => ajouter('UTILISATEUR', u.id));
        }

        this.envoiMessageEnCours = true;
        forkJoin(Array.from(cibles.values()).map((requete) => this.messagerieService.envoyer(requete))).subscribe({
            next: () => {
                this.envoiMessageEnCours = false;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Message envoyé à l\'entreprise employeuse' });
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
        this.router.navigate(['/salaries']);
    }
}
