import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
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
import { DocumentEtat, DocumentItem, TypeDocument } from 'src/app/features/documents/models/document.model';
import { DocumentService } from 'src/app/features/documents/services/document.service';
import { TypeDocumentService } from 'src/app/features/documents/services/type-document.service';
import { DocumentEtatService } from 'src/app/features/documents/services/document-etat.service';

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
    documentsByType: Record<string, DocumentItem> = {};
    lignesDocument: Record<string, LigneDocument> = {};
    etats: DocumentEtat[] = [];
    etatsPourRefus: DocumentEtat[] = [];
    dialogRefuserVisible = false;
    documentARefuser: DocumentItem | null = null;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private salarieService: SalarieService,
        private affectationSalarieService: AffectationSalarieChantierService,
        private entrepriseService: EntrepriseService,
        private affectationEntrepriseService: AffectationEntrepriseChantierService,
        private chantierService: ChantierService,
        private referenceDataService: ReferenceDataService,
        private documentService: DocumentService,
        private typeDocumentService: TypeDocumentService,
        private documentEtatService: DocumentEtatService,
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
        this.chantierService.lister().subscribe((chantiers) => {
            this.chantiers = chantiers;
            this.recalculerChantiersDisponibles();
        });
        this.typeDocumentService.lister().subscribe((types) => {
            this.types = types;
            this.typesPourSalarie = types.filter((t) => t.cible === 'SALARIE');
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
        this.saving = true;
        if (this.isNew) {
            this.salarieService.creer(payload).subscribe({
                next: (salarie) => this.router.navigate(['/salaries', salarie.id]),
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
            this.mesAffectations = affectations;
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
        this.affectationEntrepriseService.lister(chantierId).subscribe((affectations) => {
            this.affectationsEntrepriseDuChantier = affectations.filter((a) => a.statut === 'ACTIF');
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
        return this.afficherObligatoireSeulement
            ? this.typesPourSalarie.filter((t) => t.obligatoire)
            : this.typesPourSalarie;
    }

    get nbDocumentsManquants(): number {
        return this.typesPourSalarie.filter((t) => !this.documentsByType[t.id]).length;
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

    retour() {
        this.router.navigate(['/salaries']);
    }
}
