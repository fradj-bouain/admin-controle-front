import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateTypeSalarieRequest } from '../models/configuration.model';

@Component({
    selector: 'app-type-salarie-form-dialog',
    templateUrl: './type-salarie-form-dialog.component.html'
})
export class TypeSalarieFormDialogComponent {

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateTypeSalarieRequest>();

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
