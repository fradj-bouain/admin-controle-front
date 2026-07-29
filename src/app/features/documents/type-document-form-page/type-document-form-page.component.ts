import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CibleDocument, FormatDocument } from '../models/document.model';
import { TypeDocumentService } from '../services/type-document.service';

@Component({
    selector: 'app-type-document-form-page',
    templateUrl: './type-document-form-page.component.html',
    providers: [MessageService]
})
export class TypeDocumentFormPageComponent {

    saving = false;
    cibles: CibleDocument[] = ['SALARIE', 'ENTREPRISE'];
    formats: FormatDocument[] = ['PDF', 'WORD'];

    form = this.fb.group({
        libelle: ['', Validators.required],
        cible: ['SALARIE' as CibleDocument, Validators.required],
        format: ['PDF' as FormatDocument, Validators.required],
        obligatoire: [false]
    });

    constructor(
        private fb: FormBuilder,
        private typeDocumentService: TypeDocumentService,
        private router: Router,
        private message: MessageService
    ) { }

    annuler() {
        this.router.navigate(['/documents']);
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        this.saving = true;
        this.typeDocumentService.creer({
            libelle: value.libelle!,
            cible: value.cible!,
            format: value.format!,
            obligatoire: value.obligatoire ?? false
        }).subscribe({
            next: () => this.router.navigate(['/documents'], { queryParams: { tab: 'types' } }),
            error: () => {
                this.saving = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
            }
        });
    }
}
