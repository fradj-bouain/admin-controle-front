import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { Message } from '../models/message.model';
import { MessageService } from '../services/message.service';
import { stripHtml } from 'src/app/shared/utils/html.util';

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

    constructor(
        private messageService: MessageService,
        private toast: ToastService,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        const tab = this.route.snapshot.queryParamMap.get('tab');
        const index = tab ? ONGLETS.indexOf(tab) : 0;
        this.activeTabIndex = index >= 0 ? index : 0;
        this.chargerReception();
        this.chargerEnvoyes();
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
