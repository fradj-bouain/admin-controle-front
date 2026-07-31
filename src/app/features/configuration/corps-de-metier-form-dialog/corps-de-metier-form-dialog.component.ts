import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CorpsDeMetier, CreateCorpsDeMetierRequest } from '../models/configuration.model';

@Component({
    selector: 'app-corps-de-metier-form-dialog',
    templateUrl: './corps-de-metier-form-dialog.component.html'
})
export class CorpsDeMetierFormDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() itemToEdit: CorpsDeMetier | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateCorpsDeMetierRequest>();
    @Output() updated = new EventEmitter<{ id: string; request: CreateCorpsDeMetierRequest }>();

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
        const request: CreateCorpsDeMetierRequest = { libelle: this.form.getRawValue().libelle! };
        if (this.itemToEdit) {
            this.updated.emit({ id: this.itemToEdit.id, request });
        } else {
            this.created.emit(request);
        }
        this.close();
    }
}
