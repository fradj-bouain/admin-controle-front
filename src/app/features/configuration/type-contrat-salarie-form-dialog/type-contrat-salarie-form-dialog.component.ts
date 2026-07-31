import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateTypeContratSalarieRequest, TypeContratSalarie } from '../models/configuration.model';

@Component({
    selector: 'app-type-contrat-salarie-form-dialog',
    templateUrl: './type-contrat-salarie-form-dialog.component.html'
})
export class TypeContratSalarieFormDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() itemToEdit: TypeContratSalarie | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateTypeContratSalarieRequest>();
    @Output() updated = new EventEmitter<{ id: string; request: CreateTypeContratSalarieRequest }>();

    form = this.fb.group({
        code: ['', Validators.required],
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
        const value = this.form.getRawValue();
        const request: CreateTypeContratSalarieRequest = { code: value.code!, libelle: value.libelle! };
        if (this.itemToEdit) {
            this.updated.emit({ id: this.itemToEdit.id, request });
        } else {
            this.created.emit(request);
        }
        this.close();
    }
}
