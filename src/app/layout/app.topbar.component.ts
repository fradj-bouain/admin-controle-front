import { Component, ElementRef, ViewChild } from '@angular/core';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html'
})
export class AppTopbarComponent {

    @ViewChild('menubutton') menuButton!: ElementRef;

    readonly languages = environment.supportedLanguages;

    constructor(
        public layoutService: LayoutService,
        private translate: TranslateService,
        public auth: AuthService,
        private router: Router
    ) {
        const saved = localStorage.getItem('lang') || environment.defaultLanguage;
        this.translate.use(saved);
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
