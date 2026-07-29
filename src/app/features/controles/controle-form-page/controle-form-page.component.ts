import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ControleService } from '../services/controle.service';
import { ControleTiers } from 'src/app/features/configuration/models/configuration.model';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';

@Component({
    selector: 'app-controle-form-page',
    templateUrl: './controle-form-page.component.html',
    providers: [MessageService]
})
export class ControleFormPageComponent implements OnInit {

    saving = false;
    chantierId!: string;
    controleTiersListe: ControleTiers[] = [];

    form = this.fb.group({
        dateControle: [new Date(), Validators.required],
        remarques: [''],
        controleTiersId: [''],
        dateFin: [null as Date | null],
        termine: [false]
    });

    constructor(
        private fb: FormBuilder,
        private controleService: ControleService,
        private referenceDataService: ReferenceDataService,
        private route: ActivatedRoute,
        private router: Router,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        this.chantierId = this.route.snapshot.queryParamMap.get('chantierId')!;
        this.referenceDataService.listerControleTiers().subscribe((tiers) => (this.controleTiersListe = tiers));
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
        this.controleService.creer({
            chantierId: this.chantierId,
            dateControle: value.dateControle!.toISOString().substring(0, 10),
            remarques: value.remarques ?? undefined,
            controleTiersId: value.controleTiersId || undefined,
            dateFin: value.dateFin ? value.dateFin.toISOString().substring(0, 10) : undefined,
            termine: value.termine ?? false
        }).subscribe({
            next: () => this.router.navigate(['/controles']),
            error: () => {
                this.saving = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
            }
        });
    }
}
