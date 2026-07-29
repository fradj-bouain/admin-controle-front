import { Component, OnInit } from '@angular/core';
import { MessageService as ToastService } from 'primeng/api';
import { Message } from '../models/message.model';
import { MessageService } from '../services/message.service';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-message-list',
    templateUrl: './message-list.component.html',
    providers: [ToastService]
})
export class MessageListComponent implements OnInit {

    reception: Message[] = [];
    envoyes: Message[] = [];

    constructor(
        private messageService: MessageService,
        private auth: AuthService,
        private toast: ToastService
    ) { }

    ngOnInit(): void {
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
