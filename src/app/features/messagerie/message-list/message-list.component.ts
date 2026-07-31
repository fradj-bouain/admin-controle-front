import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { Message } from '../models/message.model';
import { MessageService } from '../services/message.service';
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

    constructor(
        private messageService: MessageService,
        private auth: AuthService,
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
        this.messageService.boiteReception('UTILISATEUR', this.auth.userId).subscribe((messages) => (this.reception = messages));
    }

    chargerEnvoyes() {
        this.messageService.envoyes().subscribe((messages) => (this.envoyes = messages));
    }

    marquerLu(message: Message) {
        this.messageService.marquerLu(message.id).subscribe({ next: () => this.chargerReception() });
    }
}
