import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ControleTiers, CreateControleTiersRequest } from '../models/configuration.model';

@Component({
    selector: 'app-controle-tiers-form-dialog',
    templateUrl: './controle-tiers-form-dialog.component.html'
})
export class ControleTiersFormDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() itemToEdit: ControleTiers | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateControleTiersRequest>();
    @Output() updated = new EventEmitter<{ id: string; request: CreateControleTiersRequest }>();

    form = this.fb.group({
        nom: ['', Validators.required]
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
        const request: CreateControleTiersRequest = { nom: this.form.getRawValue().nom! };
        if (this.itemToEdit) {
            this.updated.emit({ id: this.itemToEdit.id, request });
        } else {
            this.created.emit(request);
        }
        this.close();
    }
}
