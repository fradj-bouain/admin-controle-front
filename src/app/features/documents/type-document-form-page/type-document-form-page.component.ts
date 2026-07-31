import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CibleDocument, FormatDocument, TypeDocument } from '../models/document.model';
import { TypeDocumentService } from '../services/type-document.service';

@Component({
    selector: 'app-type-document-form-page',
    templateUrl: './type-document-form-page.component.html',
    providers: [MessageService]
})
export class TypeDocumentFormPageComponent implements OnInit {

    saving = false;
    editingId: string | null = null;
    /** Champs du modèle non exposés dans ce formulaire simplifié (cible métier/pays,
        échéances...) — conservés tels quels lors d'une modification pour ne pas les
        écraser silencieusement, la mise à jour renvoie l'objet complet à l'API. */
    private autresChamps: Partial<TypeDocument> = {};
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
        private route: ActivatedRoute,
        private message: MessageService
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.editingId = id;
            this.typeDocumentService.obtenir(id).subscribe((type) => {
                const { libelle, cible, format, obligatoire, ...reste } = type;
                this.autresChamps = reste;
                this.form.patchValue({ libelle, cible, format, obligatoire });
            });
        }
    }

    annuler() {
        this.router.navigate(['/documents'], { queryParams: { tab: 'types' } });
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        const request = {
            libelle: value.libelle!,
            cible: value.cible!,
            format: value.format!,
            obligatoire: value.obligatoire ?? false,
            ...this.autresChamps
        };
        this.saving = true;
        const appel = this.editingId
            ? this.typeDocumentService.modifier(this.editingId, request)
            : this.typeDocumentService.creer(request);
        appel.subscribe({
            next: () => this.router.navigate(['/documents'], { queryParams: { tab: 'types' } }),
            error: () => {
                this.saving = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: this.editingId ? 'Modification impossible' : 'Création impossible' });
            }
        });
    }
}
