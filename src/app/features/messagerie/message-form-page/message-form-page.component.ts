import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { DestinataireType } from '../models/message.model';
import { MessageService } from '../services/message.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Utilisateur } from 'src/app/features/configuration/models/configuration.model';

@Component({
    selector: 'app-message-form-page',
    templateUrl: './message-form-page.component.html',
    providers: [ToastService]
})
export class MessageFormPageComponent implements OnInit {

    saving = false;
    types: DestinataireType[] = ['CLIENT', 'ENTREPRISE', 'UTILISATEUR'];
    clients: Client[] = [];
    entreprises: Entreprise[] = [];
    utilisateurs: Utilisateur[] = [];

    // Champ calculé explicitement (pas un getter) : un p-dropdown filtrable lié à
    // un getter qui renvoie un nouveau tableau à chaque cycle de détection de
    // changements entre en boucle infinie avec PrimeNG.
    destinatairesDisponibles: Array<{ id: string; label: string }> = [];

    form = this.fb.group({
        destinataireType: ['UTILISATEUR' as DestinataireType, Validators.required],
        destinataireId: ['', Validators.required],
        sujet: ['', Validators.required],
        contenu: ['', Validators.required]
    });

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private utilisateurService: UtilisateurService,
        private router: Router,
        private toast: ToastService
    ) { }

    ngOnInit(): void {
        this.clientService.lister().subscribe((clients) => { this.clients = clients; this.recalculerDestinataires(); });
        this.entrepriseService.lister().subscribe((entreprises) => { this.entreprises = entreprises; this.recalculerDestinataires(); });
        this.utilisateurService.lister().subscribe((utilisateurs) => { this.utilisateurs = utilisateurs; this.recalculerDestinataires(); });
        this.form.controls.destinataireType.valueChanges.subscribe(() => this.recalculerDestinataires());
    }

    private recalculerDestinataires() {
        switch (this.form.value.destinataireType) {
            case 'CLIENT':
                this.destinatairesDisponibles = this.clients.map((c) => ({ id: c.id, label: c.raisonSociale }));
                break;
            case 'ENTREPRISE':
                this.destinatairesDisponibles = this.entreprises.map((e) => ({ id: e.id, label: e.raisonSociale }));
                break;
            default:
                this.destinatairesDisponibles = this.utilisateurs.map((u) => ({ id: u.id, label: u.username }));
        }
    }

    annuler() {
        this.router.navigate(['/messagerie']);
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        this.saving = true;
        this.messageService.envoyer({
            destinataireType: value.destinataireType!,
            destinataireId: value.destinataireId!,
            sujet: value.sujet!,
            contenu: value.contenu!
        }).subscribe({
            next: () => this.router.navigate(['/messagerie']),
            error: () => {
                this.saving = false;
                this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Envoi impossible' });
            }
        });
    }
}
