import { Component } from '@angular/core';

@Component({
    selector: 'app-notfound',
    template: `
        <div class="flex flex-column align-items-center justify-content-center" style="height: 100vh;">
            <h1>404</h1>
            <p>{{ 'common.comingSoon' | translate }}</p>
            <a routerLink="/">Retour à l'accueil</a>
        </div>
    `
})
export class NotfoundComponent { }
