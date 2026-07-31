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
    activeTabIndex = 0;

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
        this.activeTabIndex = this.route.snapshot.queryParamMap.get('tab') === 'types' ? 1
            : this.route.snapshot.queryParamMap.get('tab') === 'etats' ? 2 : 0;
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
        obs.subscribe((documents) => (this.documents = documents));
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
