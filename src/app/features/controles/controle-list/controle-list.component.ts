import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { Controle, RapportControle } from '../models/controle.model';
import { ControleService } from '../services/controle.service';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-controle-list',
    templateUrl: './controle-list.component.html',
    providers: [MessageService, ConfirmationService]
})
export class ControleListComponent implements OnInit {

    chantiers: Chantier[] = [];
    chantierId: string | null = null;
    controles: Controle[] = [];
    rapports: RapportControle[] = [];
    loadingControles = false;
    loadingRapports = false;
    menuItems: MenuItem[] = [];

    constructor(
        private controleService: ControleService,
        private chantierService: ChantierService,
        private router: Router,
        private message: MessageService,
        private confirmation: ConfirmationService,
        public auth: AuthService
    ) { }

    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    get isControleur(): boolean {
        return this.auth.hasRole('CONTROLEUR');
    }

    ngOnInit(): void {
        this.chantierService.lister().subscribe((chantiers) => (this.chantiers = chantiers));
        this.chargerRapports();
    }

    onChantierChange() {
        if (this.chantierId) {
            this.loadingControles = true;
            this.controleService.lister(this.chantierId).subscribe({
                next: (controles) => { this.controles = controles; this.loadingControles = false; },
                error: () => this.loadingControles = false
            });
        }
    }

    nouveauControle() {
        if (!this.chantierId) {
            return;
        }
        this.router.navigate(['/controles/nouveau'], { queryParams: { chantierId: this.chantierId } });
    }

    ouvrirGenerationRapport(controle: Controle) {
        this.router.navigate(['/controles/rapports/nouveau'], {
            queryParams: { controleId: controle.id, dateControle: controle.dateControle }
        });
    }

    chargerRapports() {
        this.loadingRapports = true;
        this.controleService.listerRapports().subscribe({
            next: (rapports) => { this.rapports = rapports; this.loadingRapports = false; },
            error: () => this.loadingRapports = false
        });
    }

    confirmerSuppression(controle: Controle) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: `Voulez-vous supprimer le contrôle du ${controle.dateControle} ?`,
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.controleService.supprimer(controle.id).subscribe({
                    next: () => { this.message.add({ severity: 'success', summary: 'Succès', detail: 'Contrôle supprimé' }); this.onChantierChange(); },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }

    // Regroupe générer un rapport/modifier/supprimer dans un seul menu "⋯", et rend la
    // ligne cliquable — cohérence avec l'onglet "Rapports" juste à côté (voir audit UX).
    construireMenu(controle: Controle): MenuItem[] {
        const items: MenuItem[] = [];
        if (this.isSuperAdmin) {
            items.push({ label: 'Générer un rapport', icon: 'pi pi-file', command: () => this.ouvrirGenerationRapport(controle) });
        }
        items.push({ label: 'Modifier', icon: 'pi pi-pencil', routerLink: ['/controles', controle.id] });
        if (this.isSuperAdmin) {
            items.push(
                { separator: true },
                { label: 'Supprimer', icon: 'pi pi-trash', styleClass: 'text-red-600', command: () => this.confirmerSuppression(controle) }
            );
        }
        return items;
    }
}
