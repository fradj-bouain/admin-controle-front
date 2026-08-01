import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActionCorrective, CibleActionCorrective, CreateActionCorrectiveRequest } from '../models/configuration.model';

@Component({
    selector: 'app-action-corrective-form-dialog',
    templateUrl: './action-corrective-form-dialog.component.html'
})
export class ActionCorrectiveFormDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() itemToEdit: ActionCorrective | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateActionCorrectiveRequest>();
    @Output() updated = new EventEmitter<{ id: string; request: CreateActionCorrectiveRequest }>();

    cibles: Array<{ label: string; value: CibleActionCorrective }> = [
        { label: 'Salariés et entreprises', value: 'SALARIES_ET_ENTREPRISES' },
        { label: 'Salariés', value: 'SALARIES' },
        { label: 'Entreprises', value: 'ENTREPRISES' }
    ];

    form = this.fb.group({
        nom: ['', Validators.required],
        cible: ['SALARIES_ET_ENTREPRISES' as CibleActionCorrective, Validators.required]
    });

    constructor(private fb: FormBuilder) { }

    ngOnChanges(): void {
        if (this.itemToEdit) {
            this.form.patchValue(this.itemToEdit);
        } else {
            this.form.reset({ nom: '', cible: 'SALARIES_ET_ENTREPRISES' });
        }
    }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.form.reset({ nom: '', cible: 'SALARIES_ET_ENTREPRISES' });
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        const request: CreateActionCorrectiveRequest = { nom: value.nom!, cible: value.cible! };
        if (this.itemToEdit) {
            this.updated.emit({ id: this.itemToEdit.id, request });
        } else {
            this.created.emit(request);
        }
        this.close();
    }
}
