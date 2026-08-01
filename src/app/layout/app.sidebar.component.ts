import { Component, ElementRef, ViewChild } from '@angular/core';
import { LayoutService } from './service/app.layout.service';
import { AuthService } from 'src/app/core/auth/auth.service';

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Super administrateur',
    CLIENT: 'Client',
    ENTREPRISE: 'Entreprise',
    CONTROLEUR: 'Contrôleur'
};

@Component({
    selector: 'app-sidebar',
    templateUrl: './app.sidebar.component.html'
})
export class AppSidebarComponent {
    timeout: any = null;

    @ViewChild('menuContainer') menuContainer!: ElementRef;
    constructor(public layoutService: LayoutService, public el: ElementRef, private auth: AuthService) {}

    get username(): string {
        return this.auth.username;
    }

    get initiales(): string {
        const name = this.auth.username;
        if (!name) {
            return '?';
        }
        const parts = name.replace(/[._-]+/g, ' ').trim().split(' ').filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    get roleLabel(): string {
        const role = this.auth.roles[0];
        return role ? (ROLE_LABELS[role] ?? role) : '';
    }

    onMouseEnter() {
        if (!this.layoutService.state.anchored) {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
            this.layoutService.state.sidebarActive = true;
        }
    }

    onMouseLeave() {
        if (!this.layoutService.state.anchored) {
            if (!this.timeout) {
                this.timeout = setTimeout(() => this.layoutService.state.sidebarActive = false, 300);
            }
        }
    }

    anchor() {
        this.layoutService.state.anchored = !this.layoutService.state.anchored;
    }

}
