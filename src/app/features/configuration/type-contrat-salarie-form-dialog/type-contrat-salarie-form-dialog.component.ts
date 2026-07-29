import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateTypeContratSalarieRequest } from '../models/configuration.model';

@Component({
    selector: 'app-type-contrat-salarie-form-dialog',
    templateUrl: './type-contrat-salarie-form-dialog.component.html'
})
export class TypeContratSalarieFormDialogComponent {

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateTypeContratSalarieRequest>();

    form = this.fb.group({
        code: ['', Validators.required],
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
        const value = this.form.getRawValue();
        this.created.emit({ code: value.code!, libelle: value.libelle! });
        this.close();
    }
}
