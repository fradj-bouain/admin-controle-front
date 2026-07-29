import { OnInit } from '@angular/core';
import { Component } from '@angular/core';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html'
})
export class AppMenuComponent implements OnInit {

    model: any[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'menu.dashboard',
                icon: 'pi pi-fw pi-home',
                routerLink: ['/']
            },
            {
                label: 'menu.clients',
                icon: 'pi pi-fw pi-building',
                routerLink: ['/clients']
            },
            {
                label: 'menu.chantiers',
                icon: 'pi pi-fw pi-map',
                routerLink: ['/chantiers']
            },
            {
                label: 'menu.entreprises',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/entreprises']
            },
            {
                label: 'menu.salaries',
                icon: 'pi pi-fw pi-users',
                routerLink: ['/salaries']
            },
            {
                label: 'menu.controles',
                icon: 'pi pi-fw pi-verified',
                routerLink: ['/controles']
            },
            {
                label: 'menu.documents',
                icon: 'pi pi-fw pi-file',
                routerLink: ['/documents']
            },
            {
                label: 'menu.messagerie',
                icon: 'pi pi-fw pi-envelope',
                routerLink: ['/messagerie']
            },
            {
                label: 'menu.configuration',
                icon: 'pi pi-fw pi-cog',
                routerLink: ['/configuration']
            }
        ];
    }
}
