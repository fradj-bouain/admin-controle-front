import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateCorpsDeMetierRequest } from '../models/configuration.model';

@Component({
    selector: 'app-corps-de-metier-form-dialog',
    templateUrl: './corps-de-metier-form-dialog.component.html'
})
export class CorpsDeMetierFormDialogComponent {

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateCorpsDeMetierRequest>();

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
