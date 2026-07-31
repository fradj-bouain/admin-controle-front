import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

// Interface volontairement minimale (pas d'import du module Documents depuis
// shared) : ce dialogue n'a besoin que de l'id et du titre pour peupler la liste.
export interface MotifRefusDocument {
    id: string;
    titre: string;
}

@Component({
    selector: 'app-refuser-document-dialog',
    templateUrl: './refuser-document-dialog.component.html'
})
export class RefuserDocumentDialogComponent {

    @Input() visible = false;
    @Input() etatsDisponibles: MotifRefusDocument[] = [];
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirme = new EventEmitter<string>();

    form = this.fb.group({
        documentEtatId: ['', Validators.required]
    });

    constructor(private fb: FormBuilder) { }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.form.reset({ documentEtatId: '' });
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.confirme.emit(this.form.getRawValue().documentEtatId!);
        this.close();
    }
}
