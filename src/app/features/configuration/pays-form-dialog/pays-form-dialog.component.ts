import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreatePaysRequest } from '../models/configuration.model';

@Component({
    selector: 'app-pays-form-dialog',
    templateUrl: './pays-form-dialog.component.html'
})
export class PaysFormDialogComponent {

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreatePaysRequest>();

    form = this.fb.group({
        codeIso: ['', Validators.required],
        nom: ['', Validators.required],
        zone: ['']
    });

    constructor(private fb: FormBuilder) { }

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
        this.created.emit({ codeIso: value.codeIso!, nom: value.nom!, zone: value.zone ?? undefined });
        this.close();
    }
}
