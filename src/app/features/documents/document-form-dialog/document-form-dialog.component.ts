import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TypeDocument } from '../models/document.model';

@Component({
    selector: 'app-document-form-dialog',
    templateUrl: './document-form-dialog.component.html'
})
export class DocumentFormDialogComponent {

    @Input() visible = false;
    @Input() typesDisponibles: TypeDocument[] = [];
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<{ typeDocumentId: string; dateExpiration?: string; fichier?: File | null }>();

    fichier: File | null = null;

    form = this.fb.group({
        typeDocumentId: ['', Validators.required],
        dateExpiration: [null as Date | null]
    });

    constructor(private fb: FormBuilder) { }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.form.reset();
        this.fichier = null;
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        this.created.emit({
            typeDocumentId: value.typeDocumentId!,
            dateExpiration: value.dateExpiration ? value.dateExpiration.toISOString().substring(0, 10) : undefined,
            fichier: this.fichier
        });
        this.close();
    }
}
