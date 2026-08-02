import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { Message } from 'src/app/features/messagerie/models/message.model';
import { MessageService } from 'src/app/features/messagerie/services/message.service';
import { stripHtml } from 'src/app/shared/utils/html.util';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html'
})
export class AppTopbarComponent implements OnInit {

    @ViewChild('menubutton') menuButton!: ElementRef;

    readonly languages = environment.supportedLanguages;
    readonly languageOptions = this.languages.map((lang) => ({ label: lang.toUpperCase(), value: lang }));

    messages: Message[] = [];
    marquageEnCours = false;

    constructor(
        public layoutService: LayoutService,
        private translate: TranslateService,
        public auth: AuthService,
        private messageService: MessageService,
        private router: Router
    ) {
        const saved = localStorage.getItem('lang') || environment.defaultLanguage;
        this.translate.use(saved);
    }

    ngOnInit(): void {
        this.chargerMessages();
    }

    chargerMessages() {
        this.messageService.boiteReception().subscribe((messages) => (this.messages = messages));
    }

    get apercuMessages(): Message[] {
        return this.messages.slice(0, 6);
    }

    get nbNonLus(): number {
        return this.messages.filter((m) => !m.lu).length;
    }

    apercuTexte(contenu: string): string {
        return stripHtml(contenu);
    }

    get badgeValue(): string {
        if (this.nbNonLus === 0) {
            return '';
        }
        return this.nbNonLus > 9 ? '9+' : this.nbNonLus.toString();
    }

    ouvrirMessage(message: Message, panel: { hide: () => void }) {
        panel.hide();
        this.router.navigate(['/messagerie', message.id]);
    }

    voirTousLesMessages(panel: { hide: () => void }) {
        panel.hide();
        this.router.navigate(['/messagerie']);
    }

    marquerToutLu(event: Event) {
        event.stopPropagation();
        const nonLus = this.messages.filter((m) => !m.lu);
        if (nonLus.length === 0) {
            return;
        }
        this.marquageEnCours = true;
        forkJoin(nonLus.map((m) => this.messageService.marquerLu(m.id))).subscribe({
            next: () => {
                this.marquageEnCours = false;
                this.chargerMessages();
            },
            error: () => (this.marquageEnCours = false)
        });
    }

    get currentLang(): string {
        return this.translate.currentLang || environment.defaultLanguage;
    }

    switchLanguage(lang: string) {
        this.translate.use(lang);
        localStorage.setItem('lang', lang);
    }

    onMenuButtonClick() {
        this.layoutService.onMenuToggle();
    }

    logout() {
        this.auth.logout();
        this.router.navigate(['/login']);
    }

}
