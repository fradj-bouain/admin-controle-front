import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CibleDocument, CreateDocumentEtatRequest, DocumentEtat, DocumentItem, TypeDocument } from '../models/document.model';
import { TypeDocumentService } from '../services/type-document.service';
import { DocumentService } from '../services/document.service';
import { DocumentEtatService } from '../services/document-etat.service';
import { Salarie } from 'src/app/features/salaries/models/salarie.model';
import { SalarieService } from 'src/app/features/salaries/services/salarie.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';

@Component({
    selector: 'app-document-list',
    templateUrl: './document-list.component.html',
    providers: [MessageService]
})
export class DocumentListComponent implements OnInit {

    types: TypeDocument[] = [];
    etats: DocumentEtat[] = [];

    cibles: CibleDocument[] = ['SALARIE', 'ENTREPRISE'];
    cible: CibleDocument = 'SALARIE';
    salaries: Salarie[] = [];
    entreprises: Entreprise[] = [];
    entiteId: string | null = null;

    documents: DocumentItem[] = [];
    dialogDocumentVisible = false;
    dialogEtatVisible = false;
    etatToEdit: DocumentEtat | null = null;
    dialogRefuserVisible = false;
    documentARefuser: DocumentItem | null = null;
    dialogNotifierVisible = false;
    documentANotifier: DocumentItem | null = null;
    emailsCandidatsNotification: string[] = [];
    sujetNotification = '';
    activeTabIndex = 0;

    // Deep-link depuis un email de notification : ouvre directement le document
    // visé (au lieu d'obliger à re-sélectionner cible + salarié/entreprise).
    documentHighlightId: string | null = null;
    tableFirst = 0;

    // Champs calculés une seule fois par changement de source (pas des getters) :
    // un p-dropdown filtrable lié à un getter qui renvoie un nouveau tableau à
    // chaque cycle de détection de changements entre en boucle infinie avec
    // PrimeNG (markForCheck se redéclenche indéfiniment).
    typesPourCible: TypeDocument[] = [];
    entitesDisponibles: Array<{ id: string; label: string }> = [];
    // Motifs de refus disponibles : on exclut les états qui valident le document,
    // ceux-là n'ont pas leur place dans un refus.
    etatsPourRefus: DocumentEtat[] = [];

    constructor(
        private typeDocumentService: TypeDocumentService,
        private documentService: DocumentService,
        private documentEtatService: DocumentEtatService,
        private salarieService: SalarieService,
        private entrepriseService: EntrepriseService,
        private message: MessageService,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        this.activeTabIndex = params.get('tab') === 'types' ? 1 : params.get('tab') === 'etats' ? 2 : 0;
        this.chargerTypes();
        this.chargerEtats();
        this.salarieService.lister().subscribe((salaries) => {
            this.salaries = salaries;
            this.recalculerEntitesDisponibles();
        });
        this.entrepriseService.lister().subscribe((entreprises) => {
            this.entreprises = entreprises;
            this.recalculerEntitesDisponibles();
        });

        const type = params.get('type');
        const entiteId = params.get('entiteId');
        if ((type === 'SALARIE' || type === 'ENTREPRISE') && entiteId) {
            this.cible = type;
            this.entiteId = entiteId;
            this.documentHighlightId = params.get('documentId');
            this.recalculerTypesPourCible();
            this.onEntiteChange();
        }
    }

    chargerTypes() {
        this.typeDocumentService.lister().subscribe((types) => {
            this.types = types;
            this.recalculerTypesPourCible();
        });
    }

    chargerEtats() {
        this.documentEtatService.lister().subscribe((etats) => {
            this.etats = etats;
            this.etatsPourRefus = etats.filter((e) => !e.valideLeDocument);
        });
    }

    private recalculerTypesPourCible() {
        this.typesPourCible = this.types.filter((t) => t.cible === this.cible);
    }

    private recalculerEntitesDisponibles() {
        this.entitesDisponibles = this.cible === 'SALARIE'
            ? this.salaries.map((s) => ({ id: s.id, label: `${s.prenom} ${s.nom}` }))
            : this.entreprises.map((e) => ({ id: e.id, label: e.raisonSociale }));
    }

    onCibleChange() {
        this.entiteId = null;
        this.documents = [];
        this.recalculerTypesPourCible();
        this.recalculerEntitesDisponibles();
    }

    onEntiteChange() {
        if (!this.entiteId) {
            return;
        }
        const obs = this.cible === 'SALARIE'
            ? this.documentService.listerParSalarie(this.entiteId)
            : this.documentService.listerParEntreprise(this.entiteId);
        obs.subscribe((documents) => {
            this.documents = documents;
            if (this.documentHighlightId) {
                const index = documents.findIndex((d) => d.id === this.documentHighlightId);
                this.tableFirst = index >= 0 ? Math.floor(index / 10) * 10 : 0;
            }
        });
    }

    creerDocument(data: { typeDocumentId: string; dateExpiration?: string; fichierUrl?: string }) {
        if (!this.entiteId) {
            return;
        }
        this.documentService.creer({
            typeDocumentId: data.typeDocumentId,
            dateExpiration: data.dateExpiration,
            fichierUrl: data.fichierUrl,
            salarieId: this.cible === 'SALARIE' ? this.entiteId : undefined,
            entrepriseId: this.cible === 'ENTREPRISE' ? this.entiteId : undefined
        }).subscribe({
            next: () => {
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Document ajouté' });
                this.onEntiteChange();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Ajout impossible' })
        });
    }

    libelleType(typeDocumentId: string): string {
        return this.types.find((t) => t.id === typeDocumentId)?.libelle ?? typeDocumentId;
    }

    libelleEtat(documentEtatId?: string): string {
        if (!documentEtatId) {
            return '—';
        }
        return this.etats.find((e) => e.id === documentEtatId)?.titre ?? documentEtatId;
    }

    valider(document: DocumentItem) {
        this.documentService.valider(document.id).subscribe({ next: () => this.onEntiteChange() });
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
                this.onEntiteChange();
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Refus impossible' })
        });
    }

    ouvrirNotification(document: DocumentItem) {
        this.documentANotifier = document;
        this.emailsCandidatsNotification = this.emailsPourDocument(document);
        this.sujetNotification = `Document à corriger : ${this.libelleType(document.typeDocumentId)}`;
        this.dialogNotifierVisible = true;
    }

    confirmerNotification(payload: { email: string; sujet: string; description: string }) {
        if (!this.documentANotifier) {
            return;
        }
        this.documentService.notifier(this.documentANotifier.id, payload).subscribe({
            next: () => {
                this.documentANotifier = null;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Notification envoyée' });
            },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Envoi impossible' })
        });
    }

    // Le salarié n'a pas d'adresse email dans le système : on notifie son
    // entreprise employeuse (ou l'entreprise elle-même si le document la cible
    // directement) sur ses 3 emails éventuels, choisissables dans le dialogue.
    private emailsPourDocument(document: DocumentItem): string[] {
        let entreprise: Entreprise | undefined;
        if (document.entrepriseId) {
            entreprise = this.entreprises.find((e) => e.id === document.entrepriseId);
        } else if (document.salarieId) {
            const salarie = this.salaries.find((s) => s.id === document.salarieId);
            entreprise = salarie ? this.entreprises.find((e) => e.id === salarie.entrepriseEmployeurId) : undefined;
        }
        return [entreprise?.email, entreprise?.email2, entreprise?.email3].filter((e): e is string => !!e);
    }

    ouvrirCreationEtat() {
        this.etatToEdit = null;
        this.dialogEtatVisible = true;
    }

    ouvrirEditionEtat(etat: DocumentEtat) {
        this.etatToEdit = etat;
        this.dialogEtatVisible = true;
    }

    creerEtat(request: CreateDocumentEtatRequest) {
        this.documentEtatService.creer(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'État ajouté' }); this.chargerEtats(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    modifierEtat(event: { id: string; request: CreateDocumentEtatRequest }) {
        this.documentEtatService.modifier(event.id, event.request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'État modifié' }); this.chargerEtats(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
        });
    }
}
