import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateTypeSalarieRequest, TypeSalarie } from '../models/configuration.model';

@Component({
    selector: 'app-type-salarie-form-dialog',
    templateUrl: './type-salarie-form-dialog.component.html'
})
export class TypeSalarieFormDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() itemToEdit: TypeSalarie | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateTypeSalarieRequest>();
    @Output() updated = new EventEmitter<{ id: string; request: CreateTypeSalarieRequest }>();

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
        const request: CreateTypeSalarieRequest = { code: value.code!, libelle: value.libelle! };
        if (this.itemToEdit) {
            this.updated.emit({ id: this.itemToEdit.id, request });
        } else {
            this.created.emit(request);
        }
        this.close();
    }
}
