import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateSalarieFonctionRequest, SalarieFonction } from '../models/configuration.model';

@Component({
    selector: 'app-salarie-fonction-form-dialog',
    templateUrl: './salarie-fonction-form-dialog.component.html'
})
export class SalarieFonctionFormDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() itemToEdit: SalarieFonction | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateSalarieFonctionRequest>();
    @Output() updated = new EventEmitter<{ id: string; request: CreateSalarieFonctionRequest }>();

    form = this.fb.group({
        libelle: ['', Validators.required]
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
        const request: CreateSalarieFonctionRequest = { libelle: this.form.getRawValue().libelle! };
        if (this.itemToEdit) {
            this.updated.emit({ id: this.itemToEdit.id, request });
        } else {
            this.created.emit(request);
        }
        this.close();
    }
}
