import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateDocumentEtatRequest, DocumentEtat } from '../models/document.model';

@Component({
    selector: 'app-document-etat-form-dialog',
    templateUrl: './document-etat-form-dialog.component.html'
})
export class DocumentEtatFormDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() itemToEdit: DocumentEtat | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateDocumentEtatRequest>();
    @Output() updated = new EventEmitter<{ id: string; request: CreateDocumentEtatRequest }>();

    form = this.fb.group({
        titre: ['', Validators.required],
        parDefaut: [false],
        dateExpiree: [false],
        valideLeDocument: [false]
    });

    constructor(private fb: FormBuilder) { }

    ngOnChanges(): void {
        if (this.itemToEdit) {
            this.form.patchValue(this.itemToEdit);
        } else {
            this.form.reset({ titre: '', parDefaut: false, dateExpiree: false, valideLeDocument: false });
        }
    }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.form.reset({ titre: '', parDefaut: false, dateExpiree: false, valideLeDocument: false });
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        const request: CreateDocumentEtatRequest = {
            titre: value.titre!,
            parDefaut: value.parDefaut!,
            dateExpiree: value.dateExpiree!,
            valideLeDocument: value.valideLeDocument!
        };
        if (this.itemToEdit) {
            this.updated.emit({ id: this.itemToEdit.id, request });
        } else {
            this.created.emit(request);
        }
        this.close();
    }
}
