import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { Message, MessagePlanifie, RegleAutomatisation } from '../models/message.model';
import { MessageService } from '../services/message.service';
import { MessagePlanifieService } from '../services/message-planifie.service';
import { RegleAutomatisationService } from '../services/regle-automatisation.service';
import { stripHtml } from 'src/app/shared/utils/html.util';
import { AuthService } from 'src/app/core/auth/auth.service';

const ONGLETS = ['reception', 'envoyes', 'planification', 'automatisation'];

@Component({
    selector: 'app-message-list',
    templateUrl: './message-list.component.html',
    providers: [ToastService]
})
export class MessageListComponent implements OnInit {

    reception: Message[] = [];
    envoyes: Message[] = [];
    activeTabIndex = 0;
    loadingReception = false;
    loadingEnvoyes = false;

    // --- Indicateurs (voir prototype validé) : planifiés/règles réservés à SUPER_ADMIN,
    // mêmes onglets Planification/Automatisation déjà masqués aux autres rôles.
    messagesPlanifies: MessagePlanifie[] = [];
    reglesAutomatisation: RegleAutomatisation[] = [];
    loadingIndicateursAdmin = false;

    get nbNonLus(): number {
        return this.reception.filter((m) => !m.lu).length;
    }

    get nbPlanifiesEnAttente(): number {
        return this.messagesPlanifies.filter((m) => m.statut === 'EN_ATTENTE').length;
    }

    get nbReglesActives(): number {
        return this.reglesAutomatisation.filter((r) => r.actif).length;
    }

    constructor(
        private messageService: MessageService,
        private planifieService: MessagePlanifieService,
        private regleService: RegleAutomatisationService,
        private toast: ToastService,
        private route: ActivatedRoute,
        public auth: AuthService
    ) { }

    // Rédiger un message et l'automatisation des relances restent réservés au
    // SUPER_ADMIN — CLIENT/ENTREPRISE n'ont ici qu'un accès en lecture (voir
    // messagerie-routing.module.ts pour la restriction équivalente côté routes).
    get isSuperAdmin(): boolean {
        return this.auth.hasRole('SUPER_ADMIN');
    }

    ngOnInit(): void {
        const tab = this.route.snapshot.queryParamMap.get('tab');
        const index = tab ? ONGLETS.indexOf(tab) : 0;
        this.activeTabIndex = index >= 0 ? index : 0;
        this.chargerReception();
        this.chargerEnvoyes();
        if (this.isSuperAdmin) {
            this.chargerIndicateursAdmin();
        }
    }

    private chargerIndicateursAdmin() {
        this.loadingIndicateursAdmin = true;
        forkJoin({
            messagesPlanifies: this.planifieService.lister(),
            reglesAutomatisation: this.regleService.lister()
        }).subscribe({
            next: ({ messagesPlanifies, reglesAutomatisation }) => {
                this.messagesPlanifies = messagesPlanifies;
                this.reglesAutomatisation = reglesAutomatisation;
                this.loadingIndicateursAdmin = false;
            },
            error: () => this.loadingIndicateursAdmin = false
        });
    }

    chargerReception() {
        this.loadingReception = true;
        this.messageService.boiteReception().subscribe({
            next: (messages) => { this.reception = messages; this.loadingReception = false; },
            error: () => this.loadingReception = false
        });
    }

    chargerEnvoyes() {
        this.loadingEnvoyes = true;
        this.messageService.envoyes().subscribe({
            next: (messages) => { this.envoyes = messages; this.loadingEnvoyes = false; },
            error: () => this.loadingEnvoyes = false
        });
    }

    apercuTexte(contenu: string): string {
        return stripHtml(contenu);
    }
}
