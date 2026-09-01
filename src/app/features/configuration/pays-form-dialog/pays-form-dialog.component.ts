import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreatePaysRequest, Pays } from '../models/configuration.model';

@Component({
    selector: 'app-pays-form-dialog',
    templateUrl: './pays-form-dialog.component.html'
})
export class PaysFormDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() itemToEdit: Pays | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreatePaysRequest>();
    @Output() updated = new EventEmitter<{ id: string; request: CreatePaysRequest }>();

    // Valeurs alignées sur celles utilisées partout ailleurs (filtres, correspondance
    // zoneRequise des types de document — voir DemoDataSeeder/recalculerTypesPourEntreprise) :
    // un champ libre ici (ex: "Europe" au lieu de "UE") créait des pays dont la zone ne
    // correspondait plus jamais à rien, silencieusement.
    zones = [
        { label: 'France', value: 'FRANCE' },
        { label: 'UE', value: 'UE' },
        { label: 'Hors UE', value: 'HORS_UE' }
    ];

    form = this.fb.group({
        codeIso: ['', Validators.required],
        nom: ['', Validators.required],
        zone: ['', Validators.required]
    });

    constructor(private fb: FormBuilder) { }

    ngOnChanges(): void {
        if (this.itemToEdit) {
            this.form.patchValue(this.itemToEdit);
        } else {
            this.form.reset();
        }
    }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.form.reset();
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        const request: CreatePaysRequest = { codeIso: value.codeIso!, nom: value.nom!, zone: value.zone ?? undefined };
        if (this.itemToEdit) {
            this.updated.emit({ id: this.itemToEdit.id, request });
        } else {
            this.created.emit(request);
        }
        this.close();
    }
}
