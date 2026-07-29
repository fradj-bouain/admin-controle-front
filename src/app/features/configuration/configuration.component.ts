import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
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
    providers: [MessageService]
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

    constructor(
        private referenceDataService: ReferenceDataService,
        private utilisateurService: UtilisateurService,
        private message: MessageService
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

    creerPays(request: CreatePaysRequest) {
        this.referenceDataService.creerPays(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Pays ajouté' }); this.chargerPays(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    creerCorpsDeMetier(request: CreateCorpsDeMetierRequest) {
        this.referenceDataService.creerCorpsDeMetier(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Corps de métier ajouté' }); this.chargerCorpsDeMetier(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    creerTypeSalarie(request: CreateTypeSalarieRequest) {
        this.referenceDataService.creerTypeSalarie(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Type de salarié ajouté' }); this.chargerTypesSalarie(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    creerTypeContratSalarie(request: CreateTypeContratSalarieRequest) {
        this.referenceDataService.creerTypeContratSalarie(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Type de contrat ajouté' }); this.chargerTypesContratSalarie(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    creerSalarieFonction(request: CreateSalarieFonctionRequest) {
        this.referenceDataService.creerSalarieFonction(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Fonction ajoutée' }); this.chargerSalarieFonctions(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }

    creerControleTiers(request: CreateControleTiersRequest) {
        this.referenceDataService.creerControleTiers(request).subscribe({
            next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Contrôleur tiers ajouté' }); this.chargerControleTiers(); },
            error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' })
        });
    }
}
