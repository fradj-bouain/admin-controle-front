import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ControleService } from '../services/controle.service';

@Component({
    selector: 'app-rapport-form-page',
    templateUrl: './rapport-form-page.component.html',
    providers: [MessageService]
})
export class RapportFormPageComponent implements OnInit {

    saving = false;
    controleId!: string;
    dateControle: string | null = null;

    form = this.fb.group({
        nbSalariesControles: [0, Validators.min(0)],
        nbAccords: [0, Validators.min(0)],
        nbRefus: [0, Validators.min(0)],
        nbNouvellesEntreprises: [0, Validators.min(0)],
        nbNouveauxSalaries: [0, Validators.min(0)],
        nbSalariesDetaches: [0, Validators.min(0)]
    });

    constructor(
        private fb: FormBuilder,
        private controleService: ControleService,
        private route: ActivatedRoute,
        private router: Router,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.controleId = this.route.snapshot.queryParamMap.get('controleId')!;
        this.dateControle = this.route.snapshot.queryParamMap.get('dateControle');
    }

    annuler() {
        this.router.navigate(['/controles']);
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        this.saving = true;
        this.controleService.genererRapport({
            controleId: this.controleId,
            nbSalariesControles: value.nbSalariesControles ?? 0,
            nbAccords: value.nbAccords ?? 0,
            nbRefus: value.nbRefus ?? 0,
            nbNouvellesEntreprises: value.nbNouvellesEntreprises ?? 0,
            nbNouveauxSalaries: value.nbNouveauxSalaries ?? 0,
            nbSalariesDetaches: value.nbSalariesDetaches ?? 0
        }).subscribe({
            next: () => this.router.navigate(['/controles']),
            error: () => {
                this.saving = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Génération impossible' });
            }
        });
    }
}
