import { Component, OnInit } from '@angular/core';
import { ChantierService } from '../chantiers/services/chantier.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

    nombreChantiers: number | null = null;

    constructor(private chantierService: ChantierService) { }

    ngOnInit(): void {
        this.chantierService.lister().subscribe({
            next: (chantiers) => (this.nombreChantiers = chantiers.length),
            error: () => (this.nombreChantiers = null)
        });
    }
}
