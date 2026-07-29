import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateSalarieFonctionRequest } from '../models/configuration.model';

@Component({
    selector: 'app-salarie-fonction-form-dialog',
    templateUrl: './salarie-fonction-form-dialog.component.html'
})
export class SalarieFonctionFormDialogComponent {

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateSalarieFonctionRequest>();

    form = this.fb.group({
        libelle: ['', Validators.required]
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
        this.created.emit({ libelle: this.form.getRawValue().libelle! });
        this.close();
    }
}
