import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { Message } from '../models/message.model';
import { MessageService } from '../services/message.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';

@Component({
    selector: 'app-message-detail-page',
    templateUrl: './message-detail-page.component.html',
    providers: [ToastService]
})
export class MessageDetailPageComponent implements OnInit {

    message: Message | null = null;
    chantier: Chantier | null = null;
    utilisateurs: Utilisateur[] = [];
    clients: Client[] = [];
    entreprises: Entreprise[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService,
        private utilisateurService: UtilisateurService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private chantierService: ChantierService,
        private auth: AuthService,
        private toast: ToastService
    ) { }

    ngOnInit(): void {
        this.utilisateurService.lister().subscribe((u) => (this.utilisateurs = u));
        this.clientService.lister().subscribe((c) => (this.clients = c));
        this.entrepriseService.lister().subscribe((e) => (this.entreprises = e));

        const id = this.route.snapshot.paramMap.get('id')!;
        this.messageService.obtenir(id).subscribe({
            next: (message) => {
                this.message = message;
                if (message.chantierId) {
                    this.chantierService.obtenir(message.chantierId).subscribe((chantier) => (this.chantier = chantier));
                }
                // On ne marque comme lu que si c'est vraiment le destinataire qui
                // consulte (jamais l'expéditeur relisant son propre envoi).
                if (!message.lu && message.destinataireType === 'UTILISATEUR' && message.destinataireId === this.auth.userId) {
                    this.messageService.marquerLu(id).subscribe((maj) => (this.message = maj));
                }
            },
            error: () => {
                this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Message introuvable ou accès refusé' });
                this.router.navigate(['/messagerie']);
            }
        });
    }

    nomUtilisateur(id?: string): string {
        return this.utilisateurs.find((u) => u.id === id)?.username ?? '—';
    }

    nomDestinataire(): string {
        if (!this.message) {
            return '—';
        }
        switch (this.message.destinataireType) {
            case 'CLIENT':
                return this.clients.find((c) => c.id === this.message!.destinataireId)?.raisonSociale ?? '—';
            case 'ENTREPRISE':
                return this.entreprises.find((e) => e.id === this.message!.destinataireId)?.raisonSociale ?? '—';
            default:
                return this.nomUtilisateur(this.message.destinataireId);
        }
    }

    imprimer() {
        window.print();
    }

    retour() {
        this.router.navigate(['/messagerie']);
    }
}
