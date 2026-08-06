import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

export interface ValidationDocument {
    dateDebutValidite: Date | null;
    dateExpiration: Date | null;
}

/**
 * Les dates de validité sont saisies ici par l'administrateur, au moment de la validation —
 * jamais par l'entreprise au dépôt (voir shared/components/modele-fichier-upload) — pour
 * attester que le contrôle manuel du document a bien été réalisé par l'administration.
 */
@Component({
    selector: 'app-valider-document-dialog',
    templateUrl: './valider-document-dialog.component.html'
})
export class ValiderDocumentDialogComponent {

    @Input() visible = false;
    @Input() dateDebutRequise = true;
    @Input() dateFinRequise = true;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirme = new EventEmitter<ValidationDocument>();

    form = this.fb.group({
        dateDebutValidite: [null as Date | null],
        dateExpiration: [null as Date | null]
    });

    constructor(private fb: FormBuilder) { }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.form.reset({ dateDebutValidite: null, dateExpiration: null });
    }

    submit() {
        if (this.dateDebutRequise) {
            this.form.controls.dateDebutValidite.setValidators(Validators.required);
        } else {
            this.form.controls.dateDebutValidite.clearValidators();
        }
        if (this.dateFinRequise) {
            this.form.controls.dateExpiration.setValidators(Validators.required);
        } else {
            this.form.controls.dateExpiration.clearValidators();
        }
        this.form.controls.dateDebutValidite.updateValueAndValidity();
        this.form.controls.dateExpiration.updateValueAndValidity();
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.confirme.emit(this.form.getRawValue());
        this.close();
    }
}
