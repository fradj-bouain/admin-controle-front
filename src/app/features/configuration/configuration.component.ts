import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
    ControleTiers, CorpsDeMetier, CreateControleTiersRequest, CreateCorpsDeMetierRequest,
    CreatePaysRequest, CreateSalarieFonctionRequest, CreateTypeContratSalarieRequest,
    CreateTypeSalarieRequest, Pays, SalarieFonction, TypeContratSalarie, TypeSalarie, Utilisateur
} from './models/configuration.model';
import { ReferenceDataService } from './services/reference-data.service';
import { UtilisateurService } from './services/utilisateur.service';

@Component({
    selector: 'app-configuration',
    templateUrl: './configuration.component.html',
    providers: [MessageService, ConfirmationService]
})
export class ConfigurationComponent implements OnInit {

    pays: Pays[] = [];
    corpsDeMetier: CorpsDeMetier[] = [];
    typesSalarie: TypeSalarie[] = [];
    typesContratSalarie: TypeContratSalarie[] = [];
    salarieFonctions: SalarieFonction[] = [];
    controleTiers: ControleTiers[] = [];
    utilisateurs: Utilisateur[] = [];

    dialogPaysVisible = false;
    dialogCorpsVisible = false;
    dialogTypeSalarieVisible = false;
    dialogTypeContratSalarieVisible = false;
    dialogSalarieFonctionVisible = false;
    dialogControleTiersVisible = false;

    paysToEdit: Pays | null = null;
    corpsToEdit: CorpsDeMetier | null = null;
    typeSalarieToEdit: TypeSalarie | null = null;
    typeContratSalarieToEdit: TypeContratSalarie | null = null;
    salarieFonctionToEdit: SalarieFonction | null = null;
    controleTiersToEdit: ControleTiers | null = null;

    constructor(
        private referenceDataService: ReferenceDataService,
        private utilisateurService: UtilisateurService,
        private message: MessageService,
        private confirmation: ConfirmationService
    ) { }

    ngOnInit(): void {
        this.chargerPays();
        this.chargerCorpsDeMetier();
        this.chargerTypesSalarie();
        this.chargerTypesContratSalarie();
        this.chargerSalarieFonctions();
        this.chargerControleTiers();
        this.chargerUtilisateurs();
    }

    chargerPays() {
        this.referenceDataService.listerPays().subscribe((pays) => (this.pays = pays));
    }

    chargerCorpsDeMetier() {
        this.referenceDataService.listerCorpsDeMetier().subscribe((corps) => (this.corpsDeMetier = corps));
    }

    chargerTypesSalarie() {
        this.referenceDataService.listerTypeSalarie().subscribe((types) => (this.typesSalarie = types));
    }

    chargerTypesContratSalarie() {
        this.referenceDataService.listerTypeContratSalarie().subscribe((types) => (this.typesContratSalarie = types));
    }

    chargerSalarieFonctions() {
        this.referenceDataService.listerSalarieFonction().subscribe((fonctions) => (this.salarieFonctions = fonctions));
    }

    chargerControleTiers() {
        this.referenceDataService.listerControleTiers().subscribe((tiers) => (this.controleTiers = tiers));
    }

    chargerUtilisateurs() {
        this.utilisateurService.lister().subscribe((utilisateurs) => (this.utilisateurs = utilisateurs));
    }

    confirmerBasculeStatutUtilisateur(utilisateur: Utilisateur) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (utilisateur.actif ? 'désactiver' : 'activer') + ' cet utilisateur ?',
            accept: () => {
                const obs = utilisateur.actif
                    ? this.utilisateurService.desactiver(utilisateur.id)
                    : this.utilisateurService.activer(utilisateur.id);
                obs.subscribe({
                    next: () => this.chargerUtilisateurs(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    ouvrirCreationPays() { this.paysToEdit = null; this.dialogPaysVisible = true; }
    ouvrirEditionPays(item: Pays) { this.paysToEdit = item; this.dialogPaysVisible = true; }

    ouvrirCreationCorps() { this.corpsToEdit = null; this.dialogCorpsVisible = true; }
    ouvrirEditionCorps(item: CorpsDeMetier) { this.corpsToEdit = item; this.dialogCorpsVisible = true; }

    ouvrirCreationTypeSalarie() { this.typeSalarieToEdit = null; this.dialogTypeSalarieVisible = true; }
    ouvrirEditionTypeSalarie(item: TypeSalarie) { this.typeSalarieToEdit = item; this.dialogTypeSalarieVisible = true; }

    ouvrirCreationTypeContratSalarie() { this.typeContratSalarieToEdit = null; this.dialogTypeContratSalarieVisible = true; }
    ouvrirEditionTypeContratSalarie(item: TypeContratSalarie) { this.typeContratSalarieToEdit = item; this.dialogTypeContratSalarieVisible = true; }

    ouvrirCreationSalarieFonction() { this.salarieFonctionToEdit = null; this.dialogSalarieFonctionVisible = true; }
    ouvrirEditionSalarieFonction(item: SalarieFonction) { this.salarieFonctionToEdit = item; this.dialogSalarieFonctionVisible = true; }

    ouvrirCreationControleTiers() { this.controleTiersToEdit = null; this.dialogControleTiersVisible = true; }
    ouvrirEditionControleTiers(item: ControleTiers) { this.controleTiersToEdit = item; this.dialogControleTiersVisible = true; }

    creerPays(request: CreatePaysRequest) {
        this.referenceDataService.creerPays(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Pays ajouté' }); this.chargerPays(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    modifierPays(event: { id: string; request: CreatePaysRequest }) {
        this.referenceDataService.modifierPays(event.id, event.request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Pays modifié' }); this.chargerPays(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
        });
    }

    creerCorpsDeMetier(request: CreateCorpsDeMetierRequest) {
        this.referenceDataService.creerCorpsDeMetier(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Corps de métier ajouté' }); this.chargerCorpsDeMetier(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    modifierCorpsDeMetier(event: { id: string; request: CreateCorpsDeMetierRequest }) {
        this.referenceDataService.modifierCorpsDeMetier(event.id, event.request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Corps de métier modifié' }); this.chargerCorpsDeMetier(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
        });
    }

    creerTypeSalarie(request: CreateTypeSalarieRequest) {
        this.referenceDataService.creerTypeSalarie(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Type de salarié ajouté' }); this.chargerTypesSalarie(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    modifierTypeSalarie(event: { id: string; request: CreateTypeSalarieRequest }) {
        this.referenceDataService.modifierTypeSalarie(event.id, event.request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Type de salarié modifié' }); this.chargerTypesSalarie(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
        });
    }

    creerTypeContratSalarie(request: CreateTypeContratSalarieRequest) {
        this.referenceDataService.creerTypeContratSalarie(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Type de contrat ajouté' }); this.chargerTypesContratSalarie(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    modifierTypeContratSalarie(event: { id: string; request: CreateTypeContratSalarieRequest }) {
        this.referenceDataService.modifierTypeContratSalarie(event.id, event.request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Type de contrat modifié' }); this.chargerTypesContratSalarie(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
        });
    }

    creerSalarieFonction(request: CreateSalarieFonctionRequest) {
        this.referenceDataService.creerSalarieFonction(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Fonction ajoutée' }); this.chargerSalarieFonctions(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    modifierSalarieFonction(event: { id: string; request: CreateSalarieFonctionRequest }) {
        this.referenceDataService.modifierSalarieFonction(event.id, event.request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Fonction modifiée' }); this.chargerSalarieFonctions(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
        });
    }

    creerControleTiers(request: CreateControleTiersRequest) {
        this.referenceDataService.creerControleTiers(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Contrôleur tiers ajouté' }); this.chargerControleTiers(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    modifierControleTiers(event: { id: string; request: CreateControleTiersRequest }) {
        this.referenceDataService.modifierControleTiers(event.id, event.request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Contrôleur tiers modifié' }); this.chargerControleTiers(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Modification impossible' })
        });
    }
}
