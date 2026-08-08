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
import { TypeDocument } from 'src/app/features/documents/models/document.model';
import { TypeDocumentService } from 'src/app/features/documents/services/type-document.service';
import { DocumentService } from 'src/app/features/documents/services/document.service';

@Component({
    selector: 'app-message-detail-page',
    templateUrl: './message-detail-page.component.html',
    providers: [ToastService]
})
export class MessageDetailPageComponent implements OnInit {

    message: Message | null = null;
    chantier: Chantier | null = null;
    loading = true;
    utilisateurs: Utilisateur[] = [];
    clients: Client[] = [];
    entreprises: Entreprise[] = [];
    types: TypeDocument[] = [];

    // --- Dépôt direct du document demandé (voir salarie/entreprise-detail demanderDocument) ---
    fichierDemande: File | null = null;
    envoiDocumentEnCours = false;
    documentEnvoye = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService,
        private utilisateurService: UtilisateurService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private chantierService: ChantierService,
        private typeDocumentService: TypeDocumentService,
        private documentService: DocumentService,
        private auth: AuthService,
        private toast: ToastService
    ) { }

    ngOnInit(): void {
        this.utilisateurService.lister().subscribe((u) => (this.utilisateurs = u));
        this.clientService.lister().subscribe((c) => (this.clients = c));
        this.entrepriseService.lister().subscribe((e) => (this.entreprises = e));
        this.typeDocumentService.lister().subscribe((t) => (this.types = t));

        const id = this.route.snapshot.paramMap.get('id')!;
        this.messageService.obtenir(id).subscribe({
            next: (message) => {
                this.message = message;
                this.loading = false;
                if (message.chantierId) {
                    this.chantierService.obtenir(message.chantierId).subscribe((chantier) => (this.chantier = chantier));
                }
                // On ne marque comme lu que si c'est vraiment un destinataire qui
                // consulte (jamais l'expéditeur relisant son propre envoi) — le message
                // peut viser ce compte précisément, ou collectivement toute son
                // Entreprise/son Client (voir MessageService.estDestinataireDe côté API).
                if (!message.lu && this.estDestinataire(message)) {
                    this.messageService.marquerLu(id).subscribe((maj) => (this.message = maj));
                }
            },
            error: () => {
                this.loading = false;
                this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Message introuvable ou accès refusé' });
                this.router.navigate(['/messagerie']);
            }
        });
    }

    private estDestinataire(message: Message): boolean {
        switch (message.destinataireType) {
            case 'UTILISATEUR': return message.destinataireId === this.auth.userId;
            case 'ENTREPRISE': return message.destinataireId === this.auth.entrepriseId;
            case 'CLIENT': return message.destinataireId === this.auth.clientId;
            default: return false;
        }
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

    get typeDocumentDemande(): TypeDocument | undefined {
        return this.message?.typeDocumentId ? this.types.find((t) => t.id === this.message!.typeDocumentId) : undefined;
    }

    /** Seul le vrai destinataire (l'entreprise à qui le document a été demandé) voit
        ce dépôt direct — pas l'expéditeur, pas une éventuelle copie à un autre compte. */
    get peutDeposerDocument(): boolean {
        return !!this.message && !!this.message.typeDocumentId
            && this.message.destinataireType === 'ENTREPRISE' && this.estDestinataire(this.message);
    }

    envoyerDocumentDemande() {
        if (!this.message || !this.fichierDemande || !this.message.typeDocumentId) {
            return;
        }
        this.envoiDocumentEnCours = true;
        this.documentService.creer({
            typeDocumentId: this.message.typeDocumentId,
            salarieId: this.message.salarieId,
            entrepriseId: this.message.salarieId ? undefined : this.message.destinataireId
        }, this.fichierDemande).subscribe({
            next: () => {
                this.envoiDocumentEnCours = false;
                this.documentEnvoye = true;
                this.toast.add({ severity: 'success', summary: 'Succès', detail: 'Document envoyé' });
            },
            error: () => {
                this.envoiDocumentEnCours = false;
                this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Envoi impossible' });
            }
        });
    }

    imprimer() {
        window.print();
    }

    retour() {
        this.router.navigate(['/messagerie']);
    }
}
