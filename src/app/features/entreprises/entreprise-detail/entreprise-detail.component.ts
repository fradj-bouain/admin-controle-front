import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Entreprise, AffectationEntrepriseChantier, RoleEntreprise } from '../models/entreprise.model';
import { EntrepriseService } from '../services/entreprise.service';
import { AffectationEntrepriseChantierService } from '../services/affectation-entreprise-chantier.service';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';
import { CorpsDeMetier, Pays } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';
import { DocumentItem, TypeDocument } from 'src/app/features/documents/models/document.model';
import { DocumentService } from 'src/app/features/documents/services/document.service';
import { TypeDocumentService } from 'src/app/features/documents/services/type-document.service';

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
    entrepriseId: string | null = null;
    entreprise: Entreprise | null = null;

    pays: Pays[] = [];
    corpsDeMetiers: CorpsDeMetier[] = [];

    coordonneesForm = this.fb.group({
        raisonSociale: ['', Validators.required],
        corpsDeMetierId: [''],
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
        responsableSignataireAgrement: [''],
        commentaire: ['']
    });

    // --- Affectation à un chantier ---
    chantiers: Chantier[] = [];
    entreprises: Entreprise[] = [];
    mesAffectations: AffectationEntrepriseChantier[] = [];
    roles: RoleEntreprise[] = ['PRINCIPALE', 'STT1', 'STT2'];
    affectationsChantierSelectionne: AffectationEntrepriseChantier[] = [];
    parentsDisponibles: Array<{ id: string; label: string }> = [];
    chantiersDisponibles: Chantier[] = [];

    affectationForm = this.fb.group({
        chantierId: ['', Validators.required],
        role: ['PRINCIPALE' as RoleEntreprise, Validators.required],
        affectationParenteId: ['']
    });

    // --- Documents (check-list de tous les types configurés) ---
    documents: DocumentItem[] = [];
    types: TypeDocument[] = [];
    typesPourEntreprise: TypeDocument[] = [];
    afficherObligatoireSeulement = false;
    documentsByType: Record<string, DocumentItem> = {};
    lignesDocument: Record<string, LigneDocument> = {};

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
        private confirmation: ConfirmationService,
        private message: MessageService
    ) {
        this.affectationForm.controls.chantierId.valueChanges.subscribe((chantierId) => this.onChantierChange(chantierId));
        this.affectationForm.controls.role.valueChanges.subscribe(() => this.recalculerParentsDisponibles());
    }

    ngOnInit(): void {
        this.referenceDataService.listerPays().subscribe((pays) => (this.pays = pays));
        this.referenceDataService.listerCorpsDeMetier().subscribe((c) => (this.corpsDeMetiers = c));
        this.chantierService.lister().subscribe((chantiers) => {
            this.chantiers = chantiers;
            this.recalculerChantiersDisponibles();
        });
        this.entrepriseService.lister().subscribe((entreprises) => (this.entreprises = entreprises));
        this.typeDocumentService.lister().subscribe((types) => {
            this.types = types;
            this.recalculerTypesPourEntreprise();
        });

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.entrepriseId = id;
            this.isNew = !id;
            if (id) {
                this.chargerEntreprise(id);
                this.chargerMesAffectations();
                this.chargerDocuments();
            }
        });
    }

    private chargerEntreprise(id: string) {
        this.entrepriseService.obtenir(id).subscribe((e) => {
            this.entreprise = e;
            this.coordonneesForm.patchValue(e);
            this.recalculerTypesPourEntreprise();
        });
    }

    // --- Coordonnées ---

    submitCoordonnees() {
        if (this.coordonneesForm.invalid) {
            this.coordonneesForm.markAllAsTouched();
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
                next: (entreprise) => this.router.navigate(['/entreprises', entreprise.id]),
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
            return true;
        });
        for (const t of this.typesPourEntreprise) {
            if (!this.lignesDocument[t.id]) {
                this.lignesDocument[t.id] = { dateDebutValidite: null, dateExpiration: null, fichierUrl: '' };
            }
        }
    }

    onFiltreObligatoireChange() {
        this.recalculerTypesPourEntreprise();
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

    refuser(document: DocumentItem) {
        this.documentService.refuser(document.id).subscribe({ next: () => this.chargerDocuments() });
    }

    private toIsoDate(date: Date): string {
        return date.toISOString().substring(0, 10);
    }

    retour() {
        this.router.navigate(['/entreprises']);
    }
}
